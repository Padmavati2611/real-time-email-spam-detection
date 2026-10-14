import React, { useState } from 'react';
import {
  Activity,
  Play,
  Square,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Server,
  Zap,
  Info
} from 'lucide-react';
import { EmailStats } from '../services/api';

interface GmailMonitoringPageProps {
  userEmail: string | null;
  stats: EmailStats;
  isMonitoringActive: boolean;
  onToggleMonitoring: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
  pollInterval: number;
  onChangeInterval: (val: number) => void;
  syncLogs: Array<{ time: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }>;
}

export const GmailMonitoringPage: React.FC<GmailMonitoringPageProps> = ({
  userEmail,
  stats,
  isMonitoringActive,
  onToggleMonitoring,
  onSyncNow,
  isSyncing,
  pollInterval,
  onChangeInterval,
  syncLogs,
}) => {
  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isMonitoringActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Gmail Inbox Monitoring & Periodic Detection
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Monitors the authorized mailbox for new incoming messages. When detected, emails are parsed, classified by the Machine Learning model, and saved to MongoDB Atlas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSyncNow}
              disabled={isSyncing || !userEmail}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing...' : 'Sync Now'}</span>
            </button>

            <button
              onClick={onToggleMonitoring}
              disabled={!userEmail}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-xs whitespace-nowrap ${
                isMonitoringActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              } disabled:opacity-50`}
            >
              {isMonitoringActive ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Monitoring</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Monitoring</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Monitoring Mode
            </span>
            <span className="font-bold text-slate-900 block mt-1">
              {isMonitoringActive ? `Active Polling (${pollInterval}s interval)` : 'Paused / Standby'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Authorized Mailbox
            </span>
            <span className="font-bold text-slate-900 block mt-1 truncate">
              {userEmail || 'No account authorized'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Last Sync Timestamp
            </span>
            <span className="font-mono text-slate-700 block mt-1">
              {stats.last_sync_timestamp ? new Date(stats.last_sync_timestamp).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Interval Setting and Notification Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interval controls (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Detection Polling Settings
          </h3>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Sync Polling Frequency:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => onChangeInterval(sec)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    pollInterval === sec
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 mt-2 block leading-relaxed">
              Checks for new emails using Gmail API message listing without full mailbox re-download.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <span className="font-semibold text-slate-800 block">Deduplication Guarantee:</span>
            <span className="text-[11px] leading-relaxed block">
              MongoDB Atlas enforces a unique index on <code className="font-mono text-slate-800">gmail_message_id</code>. Periodic polling queries never duplicate existing email records.
            </span>
          </div>
        </div>

        {/* Live Monitoring Logs (8 cols) */}
        <div className="lg:col-span-8 bg-slate-950 text-slate-200 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-white">
                  Live Inbox Detection & Polling Stream
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {isMonitoringActive ? '● STREAM LISTENING' : '○ STREAM IDLE'}
              </span>
            </div>

            <div className="p-4 space-y-2 font-mono text-xs max-h-72 overflow-y-auto">
              {syncLogs.length > 0 ? (
                syncLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-slate-500 text-[11px] shrink-0 font-mono">[{log.time}]</span>
                    <span
                      className={
                        log.type === 'success'
                          ? 'text-emerald-400'
                          : log.type === 'warn'
                          ? 'text-amber-400'
                          : log.type === 'error'
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs italic">
                  Monitoring logs will stream here when periodic detection or manual sync runs.
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-900/50 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Gmail API v1 /users/me/messages</span>
            <span>Total Ingested: {stats.total_emails}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
