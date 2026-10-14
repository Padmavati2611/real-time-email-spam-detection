import React from 'react';
import {
  Mail,
  ShieldAlert,
  ShieldCheck,
  Database,
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { DbStatus, EmailRecord, EmailStats } from '../services/api';

interface GmailOverviewPageProps {
  stats: EmailStats;
  dbStatus: DbStatus | null;
  userEmail: string | null;
  recentEmails: EmailRecord[];
  onNavigate: (tab: any) => void;
  onSync: () => void;
  isSyncing: boolean;
  onOpenDbModal: () => void;
  onSignIn: () => void;
}

export const GmailOverviewPage: React.FC<GmailOverviewPageProps> = ({
  stats,
  dbStatus,
  userEmail,
  recentEmails,
  onNavigate,
  onSync,
  isSyncing,
  onOpenDbModal,
  onSignIn,
}) => {
  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Real-Time Gmail Spam Detection & Security Console
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Monitors your authorized Gmail inbox, ingests actual incoming messages using the <span className="font-semibold text-slate-800">Gmail API v1</span>, classifies content via <span className="font-semibold text-slate-800">TF-IDF Vectorization & Multinomial Naive Bayes</span>, and stores records in <span className="font-semibold text-slate-800">MongoDB Atlas</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {userEmail ? (
              <button
                onClick={onSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronizing...' : 'Sync Mailbox Now'}</span>
              </button>
            ) : (
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-xs"
              >
                <span>Authorize Gmail Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Strip: Gmail & MongoDB */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Gmail Auth Status */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  userEmail ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-400'
                }`}
              />
              <span className="font-semibold text-slate-800">Gmail API:</span>
              <span className="text-slate-600 truncate max-w-[200px]">
                {userEmail ? userEmail : 'Not authorized'}
              </span>
            </div>
            {userEmail ? (
              <span className="text-[11px] text-emerald-700 font-semibold">Active · Read-Only</span>
            ) : (
              <button onClick={onSignIn} className="text-indigo-600 hover:text-indigo-800 font-semibold">
                Sign in with Google
              </button>
            )}
          </div>

          {/* MongoDB Status */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  dbStatus?.connected ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-amber-500 ring-2 ring-amber-200'
                }`}
              />
              <span className="font-semibold text-slate-800">MongoDB Atlas:</span>
              <span className="text-slate-600 truncate">
                <code className="font-mono text-slate-800 font-medium">realtime_spam_detection</code>
              </span>
            </div>
            <button
              onClick={onOpenDbModal}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Configure DB →
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards (Calculated from actual database records) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Emails Processed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Emails Processed
          </span>
          <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums my-1 block">
            {stats.total_emails.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 block">
            Deduplicated in <code className="font-mono text-slate-700">emails</code> collection
          </span>
        </div>

        {/* Spam Emails Detected */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
            Spam Emails Detected
          </span>
          <span className="text-3xl font-bold font-mono text-rose-700 tabular-nums my-1 block">
            {stats.spam_count.toLocaleString()}
          </span>
          <span className="text-xs text-rose-600 block">
            {stats.spam_percentage}% spam incidence
          </span>
        </div>

        {/* Legitimate Emails */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Legitimate Emails
          </span>
          <span className="text-3xl font-bold font-mono text-emerald-700 tabular-nums my-1 block">
            {stats.legitimate_count.toLocaleString()}
          </span>
          <span className="text-xs text-emerald-600 block">
            {stats.total_emails > 0 ? (100 - stats.spam_percentage).toFixed(1) : 0}% verified inbox
          </span>
        </div>

        {/* Last Sync Timestamp */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Last Synchronization
          </span>
          <span className="text-xs font-mono font-medium text-slate-800 block my-2 truncate">
            {stats.last_sync_timestamp ? new Date(stats.last_sync_timestamp).toLocaleTimeString() : 'Never'}
          </span>
          <span className="text-[11px] text-slate-500 block">
            Auto-polling: {stats.monitoring_active ? 'Active' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Distribution & Recent Ingested Emails */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Classification Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              Inbox Threat Proportion
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Live percentage ratio derived from MongoDB document queries.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-semibold">
                  <span className="text-rose-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Spam Emails</span>
                  </span>
                  <span className="font-mono text-rose-700 tabular-nums">
                    {stats.spam_count} ({stats.spam_percentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.spam_percentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-semibold">
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Legitimate Emails</span>
                  </span>
                  <span className="font-mono text-emerald-700 tabular-nums">
                    {stats.legitimate_count} ({stats.total_emails > 0 ? (100 - stats.spam_percentage).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.total_emails > 0 ? 100 - stats.spam_percentage : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Deduplication: Enabled</span>
            <button
              onClick={() => onNavigate('monitoring')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Configure Monitoring →
            </button>
          </div>
        </div>

        {/* Recent Ingested Messages Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Email Activity
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {recentEmails.length} messages loaded
              </span>
            </div>

            {recentEmails.length > 0 ? (
              <div className="space-y-2.5 overflow-hidden">
                {recentEmails.slice(0, 5).map((e) => {
                  const isSpam = e.predicted_class === 'spam';
                  return (
                    <div
                      key={e.gmail_message_id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isSpam ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {e.predicted_class.toUpperCase()}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {e.subject || '(No Subject)'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block">
                          From: {e.sender_address}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-800 tabular-nums block">
                          {(e.spam_probability * 100).toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {new Date(e.received_timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No emails stored in database yet. Connect your Gmail account and run a synchronization.
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Minimum read-only Gmail scope</span>
            <button
              onClick={() => onNavigate('history')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              View Full History →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
