/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { GmailOverviewPage } from './components/GmailOverviewPage';
import { GmailMonitoringPage } from './components/GmailMonitoringPage';
import { EmailHistoryPage } from './components/EmailHistoryPage';
import { ModelEvaluation } from './components/ModelEvaluation';
import { PythonProjectPage } from './components/PythonProjectPage';
import { MongoConfigModal } from './components/MongoConfigModal';
import { mlEngine } from './ml/engine';
import { api, DbStatus, EmailRecord, EmailStats } from './services/api';
import { initAuth, signInWithGoogleGmail, logoutGoogle, getAccessToken } from './services/auth';
import { GmailService } from './services/gmail';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const [stats, setStats] = useState<EmailStats>({
    total_emails: 0,
    spam_count: 0,
    legitimate_count: 0,
    spam_percentage: 0,
    latest_timestamp: null,
    last_sync_timestamp: new Date().toISOString(),
    monitoring_active: false,
  });

  const [recentEmails, setRecentEmails] = useState<EmailRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Monitoring loop state
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(false);
  const [pollInterval, setPollInterval] = useState<number>(30);
  const [syncLogs, setSyncLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);
  const monitorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const timeStr = new Date().toLocaleTimeString();
    setSyncLogs((prev) => [{ time: timeStr, message, type }, ...prev.slice(0, 49)]);
  };

  // 1. Initialize Auth on mount
  useEffect(() => {
    initAuth(
      (authUser) => {
        setUser(authUser);
        setUserEmail(authUser.email);
        addLog(`Gmail account authenticated: ${authUser.email}`, 'success');
      },
      () => {
        setUser(null);
        setUserEmail(null);
      }
    );
  }, []);

  // 2. Fetch DB status and stats on mount
  const refreshStats = async () => {
    try {
      const [statusRes, statsRes, emailsRes] = await Promise.all([
        api.getDbStatus(),
        api.getEmailStats(),
        api.getEmails(undefined, 10),
      ]);
      setDbStatus(statusRes);
      setStats(statsRes);
      if (emailsRes && emailsRes.data) {
        setRecentEmails(emailsRes.data);
      }
    } catch (err) {
      console.error('Error refreshing metrics:', err);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  // 3. User Google Sign-In
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const res = await signInWithGoogleGmail();
      if (res) {
        setUser(res.user);
        setUserEmail(res.user.email);
        showToast(`Authorized as ${res.user.email}`);
        addLog(`Authorized Gmail: ${res.user.email}`, 'success');
        // Initial sync
        setTimeout(() => handleSyncMailbox(), 500);
      }
    } catch (err: any) {
      showToast(`Authorization failed: ${err.message || 'Error'}`);
      addLog(`Sign-in error: ${err.message}`, 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    if (isMonitoringActive) {
      setIsMonitoringActive(false);
    }
    await logoutGoogle();
    setUser(null);
    setUserEmail(null);
    showToast('Gmail account disconnected.');
    addLog('Gmail account disconnected by user.', 'warn');
  };

  // 4. Mailbox Synchronization & Classification
  const handleSyncMailbox = async () => {
    const token = getAccessToken();
    if (!token) {
      showToast('Please authorize your Gmail account first.');
      return;
    }

    setIsSyncing(true);
    addLog('Querying Gmail API for incoming inbox messages...', 'info');

    try {
      const emails = await GmailService.fetchRecentEmails(token, 15);
      addLog(`Fetched ${emails.length} messages from Gmail inbox.`, 'info');

      if (emails.length === 0) {
        addLog('No messages found in inbox.', 'info');
        setIsSyncing(false);
        return;
      }

      // Classify each email using ML Engine
      const batchPayload = emails.map((e) => {
        const pred = mlEngine.classify(e.fullCleanText, 'nb');
        return {
          gmail_message_id: e.gmailMessageId,
          gmail_thread_id: e.gmailThreadId,
          sender_address: e.sender,
          subject: e.subject,
          snippet: e.bodySnippet,
          received_timestamp: e.receivedAt,
          predicted_class: pred.label === 'spam' ? ('spam' as const) : ('legitimate' as const),
          spam_probability: pred.spamProbability,
          model_name: 'Multinomial Naive Bayes',
        };
      });

      // Persist to MongoDB with deduplication
      const saveRes = await api.saveBatchEmails({
        emails: batchPayload,
        mailbox_id: userEmail || 'unknown',
      });

      if (saveRes.success) {
        addLog(
          `Sync complete: ${saveRes.new_inserted} new emails added to MongoDB (${saveRes.total_received - saveRes.new_inserted} duplicates ignored).`,
          'success'
        );
        showToast(`Sync complete! ${saveRes.new_inserted} new emails classified & saved.`);
        refreshStats();
      }
    } catch (err: any) {
      addLog(`Sync failure: ${err.message}`, 'error');
      showToast(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 5. Automatic Periodic Monitoring Loop
  useEffect(() => {
    if (isMonitoringActive && userEmail) {
      addLog(`Automatic monitoring started. Polling every ${pollInterval}s...`, 'info');
      // Run immediate sync
      handleSyncMailbox();

      monitorTimerRef.current = setInterval(() => {
        handleSyncMailbox();
      }, pollInterval * 1000);
    } else {
      if (monitorTimerRef.current) {
        clearInterval(monitorTimerRef.current);
        monitorTimerRef.current = null;
      }
    }

    return () => {
      if (monitorTimerRef.current) {
        clearInterval(monitorTimerRef.current);
      }
    };
  }, [isMonitoringActive, pollInterval, userEmail]);

  const handleToggleMonitoring = () => {
    if (!userEmail) {
      showToast('Please authorize Gmail before starting monitoring.');
      return;
    }
    const nextState = !isMonitoringActive;
    setIsMonitoringActive(nextState);
    api.updateSyncState({ monitoring_active: nextState });
    if (!nextState) {
      addLog('Automatic monitoring paused.', 'warn');
    }
  };

  const handleRetrain = () => {
    setIsRetraining(true);
    setTimeout(() => {
      mlEngine.train();
      if (mlEngine.nbEvaluation) {
        api.saveMetrics({
          model_name: 'Multinomial Naive Bayes',
          dataset_name: 'UCI SMS Spam Collection (Email Adapted)',
          model_version: '1.0.0',
          accuracy: mlEngine.nbEvaluation.accuracy,
          spam_precision: mlEngine.nbEvaluation.precision,
          spam_recall: mlEngine.nbEvaluation.recall,
          spam_f1_score: mlEngine.nbEvaluation.f1Score,
          roc_auc: mlEngine.nbEvaluation.auc,
          confusion_matrix: {
            true_negatives: mlEngine.nbEvaluation.confusionMatrix.trueNegatives,
            false_positives: mlEngine.nbEvaluation.confusionMatrix.falsePositives,
            false_negatives: mlEngine.nbEvaluation.confusionMatrix.falseNegatives,
            true_positives: mlEngine.nbEvaluation.confusionMatrix.truePositives,
            matrix_array: [
              [mlEngine.nbEvaluation.confusionMatrix.trueNegatives, mlEngine.nbEvaluation.confusionMatrix.falsePositives],
              [mlEngine.nbEvaluation.confusionMatrix.falseNegatives, mlEngine.nbEvaluation.confusionMatrix.truePositives],
            ],
          },
          training_date: new Date().toISOString(),
          num_train_messages: mlEngine.trainSet.length,
          num_test_messages: mlEngine.testSet.length,
        });
      }
      setIsRetraining(false);
      showToast('Machine Learning models retrained successfully.');
      refreshStats();
    }, 60);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* 3-Zone Top Navigation Contract */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        dbStatus={dbStatus}
        userEmail={userEmail}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isAuthenticating={isAuthenticating}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        isSyncing={isSyncing}
        onSyncMailbox={handleSyncMailbox}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <GmailOverviewPage
            stats={stats}
            dbStatus={dbStatus}
            userEmail={userEmail}
            recentEmails={recentEmails}
            onNavigate={setActiveTab}
            onSync={handleSyncMailbox}
            isSyncing={isSyncing}
            onOpenDbModal={() => setIsDbModalOpen(true)}
            onSignIn={handleSignIn}
          />
        )}

        {activeTab === 'monitoring' && (
          <GmailMonitoringPage
            userEmail={userEmail}
            stats={stats}
            isMonitoringActive={isMonitoringActive}
            onToggleMonitoring={handleToggleMonitoring}
            onSyncNow={handleSyncMailbox}
            isSyncing={isSyncing}
            pollInterval={pollInterval}
            onChangeInterval={setPollInterval}
            syncLogs={syncLogs}
          />
        )}

        {activeTab === 'history' && (
          <EmailHistoryPage onRefreshStats={refreshStats} />
        )}

        {activeTab === 'evaluation' && (
          <ModelEvaluation
            engine={mlEngine}
            onRetrain={handleRetrain}
            isRetraining={isRetraining}
          />
        )}

        {activeTab === 'project' && <PythonProjectPage />}
      </main>

      {/* MongoDB Configuration Modal */}
      <MongoConfigModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        dbStatus={dbStatus}
        onStatusUpdated={refreshStats}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Minimalist Compliant Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">SpamGuard Email</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time Gmail API & MongoDB Atlas Machine Learning Pipeline</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Database: {dbStatus?.database_name || 'realtime_spam_detection'}</span>
            <span aria-hidden="true">·</span>
            <span>Scope: gmail.readonly</span>
            <span aria-hidden="true">·</span>
            <span>Scikit-Learn TF-IDF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
