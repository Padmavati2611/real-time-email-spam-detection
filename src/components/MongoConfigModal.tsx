import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  ExternalLink,
  Layers,
  RefreshCw
} from 'lucide-react';
import { api, DbStatus } from '../services/api';

interface MongoConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbStatus: DbStatus | null;
  onStatusUpdated: () => void;
}

export const MongoConfigModal: React.FC<MongoConfigModalProps> = ({
  isOpen,
  onClose,
  dbStatus,
  onStatusUpdated,
}) => {
  const [mongoUri, setMongoUri] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUri.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.connectDb(mongoUri.trim());
      setTestResult(res);
      onStatusUpdated();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection attempt failed.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                MongoDB Atlas Integration
              </h3>
              <p className="text-xs text-slate-500">
                Database: <code className="font-mono text-slate-700 font-semibold">{dbStatus?.database_name || 'spam_sms_detection'}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Status Banner */}
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
            dbStatus?.connected
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}
        >
          {dbStatus?.connected ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <span className="font-bold block">
              {dbStatus?.connected ? 'Connected to MongoDB Atlas' : 'Operating with Local Document Store'}
            </span>
            <span className="text-[11px] opacity-90 block">
              {dbStatus?.connected
                ? `Connection active with URI: ${dbStatus.masked_uri}`
                : 'Using a persistent, schema-compliant MongoDB document store. You can optionally connect to your own MongoDB Atlas cloud cluster below.'}
            </span>
          </div>
        </div>

        {/* Collections Overview */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Target MongoDB Collections:
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-semibold text-slate-900 block truncate">predictions</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">SMS text & labels</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-semibold text-slate-900 block truncate">model_metrics</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Accuracy & CM</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-semibold text-slate-900 block truncate">feedback</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Auditor reviews</span>
            </div>
          </div>
        </div>

        {/* Connection Form */}
        <form onSubmit={handleConnect} className="space-y-3 pt-2 border-t border-slate-100">
          <div>
            <label htmlFor="mongo-input" className="text-xs font-semibold text-slate-700 block mb-1">
              Connect Custom MongoDB Atlas URI:
            </label>
            <input
              id="mongo-input"
              type="password"
              value={mongoUri}
              onChange={(e) => setMongoUri(e.target.value)}
              placeholder="mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true"
              className="w-full p-2.5 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Credentials are kept in memory and never logged or exposed.
            </span>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isTesting || !mongoUri.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Connection...' : 'Connect to Cluster'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
