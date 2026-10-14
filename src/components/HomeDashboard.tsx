import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Database,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { DashboardStats, DbStatus } from '../services/api';

interface HomeDashboardProps {
  stats: DashboardStats;
  dbStatus: DbStatus | null;
  onNavigate: (tab: any) => void;
  onOpenDbModal: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  stats,
  dbStatus,
  onNavigate,
  onOpenDbModal,
}) => {
  return (
    <div className="space-y-8">
      {/* Title & Introduction */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Real-Time Spam SMS Detection System
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Full-stack Machine Learning classification platform integrated with <span className="font-semibold text-slate-800">MongoDB Atlas</span>. SMS messages are converted to numerical form using <span className="font-semibold text-slate-800">TF-IDF</span> and evaluated with <span className="font-semibold text-slate-800">Multinomial Naive Bayes</span>.
            </p>
          </div>

          <button
            onClick={() => onNavigate('detect')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap self-start md:self-auto shadow-xs"
          >
            <span>Classify SMS Message</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Database Connection Status Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                dbStatus?.connected ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-amber-500 ring-2 ring-amber-200'
              }`}
            />
            <span className="text-xs font-semibold text-slate-800">
              Database Status:
            </span>
            <span className="text-xs text-slate-600">
              {dbStatus?.connected ? (
                <>Connected to MongoDB Atlas (<code className="text-slate-800 font-mono font-medium">{dbStatus.database_name}</code>)</>
              ) : (
                <>Operating with Local Document Store (MongoDB-compatible collections)</>
              )}
            </span>
          </div>

          <button
            onClick={onOpenDbModal}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {dbStatus?.connected ? 'View Database Collections' : 'Configure MongoDB Atlas URI →'}
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards (Calculated from actual database records) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Analyzed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Messages Analyzed
          </span>
          <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums my-1 block">
            {stats.total_messages.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 block">
            Stored in <code className="font-mono text-slate-700">predictions</code> collection
          </span>
        </div>

        {/* Spam Messages Detected */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
            Spam Messages Detected
          </span>
          <span className="text-3xl font-bold font-mono text-rose-700 tabular-nums my-1 block">
            {stats.spam_count.toLocaleString()}
          </span>
          <span className="text-xs text-rose-600/90 block">
            {stats.spam_percentage}% spam detection rate
          </span>
        </div>

        {/* Legitimate Messages */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Legitimate (Ham)
          </span>
          <span className="text-3xl font-bold font-mono text-emerald-700 tabular-nums my-1 block">
            {stats.legitimate_count.toLocaleString()}
          </span>
          <span className="text-xs text-emerald-600/90 block">
            {stats.total_messages > 0 ? (100 - stats.spam_percentage).toFixed(1) : 0}% verified legitimate
          </span>
        </div>

        {/* Latest Prediction Timestamp */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Latest Prediction
          </span>
          <span className="text-xs font-mono font-medium text-slate-800 block my-2 truncate">
            {stats.latest_timestamp ? new Date(stats.latest_timestamp).toUTCString() : "No messages yet"}
          </span>
          <span className="text-[11px] text-slate-500 block">
            Recorded in standard UTC format
          </span>
        </div>
      </div>

      {/* Visual Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribution Progress & Ratio */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              Class Proportion Breakdown
            </h3>
            <p className="text-xs text-slate-600 mb-6">
              Computed in real time from query aggregation against active database documents.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                  <span className="text-rose-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>Spam Messages</span>
                  </span>
                  <span className="font-mono text-rose-700 font-bold tabular-nums">
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
                <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                  <span className="text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Legitimate (Ham)</span>
                  </span>
                  <span className="font-mono text-emerald-700 font-bold tabular-nums">
                    {stats.legitimate_count} ({stats.total_messages > 0 ? (100 - stats.spam_percentage).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.total_messages > 0 ? 100 - stats.spam_percentage : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Database Name: <code className="font-mono text-slate-700">{dbStatus?.database_name || 'spam_sms_detection'}</code></span>
            <button
              onClick={() => onNavigate('history')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Browse History Records →
            </button>
          </div>
        </div>

        {/* Architecture & Workflow Card */}
        <div className="lg:col-span-6 bg-slate-900 text-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Real-Time Database Pipeline Architecture
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              When an SMS is analyzed, predictions are processed through the scikit-learn TF-IDF pipeline and permanently written into MongoDB Atlas across three collections:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="font-mono text-indigo-300 font-semibold block">1. predictions</span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Stores submitted SMS text, UUID message_id, predicted class, spam probability, model name, and UTC timestamp.
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="font-mono text-indigo-300 font-semibold block">2. model_metrics</span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Stores accuracy, precision, recall, F1-score, and confusion matrix arrays when training completes.
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="font-mono text-indigo-300 font-semibold block">3. feedback</span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Records user audits against existing prediction IDs without corrupting ground-truth training data.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Machine Learning Internship Project</span>
            <button
              onClick={() => onNavigate('code')}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Inspect Python Source Code →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
