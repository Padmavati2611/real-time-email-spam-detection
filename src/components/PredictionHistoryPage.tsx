import React, { useState, useEffect } from 'react';
import {
  History,
  Filter,
  RefreshCw,
  Trash2,
  MessageSquare,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Copy,
  Check
} from 'lucide-react';
import { api, PredictionRecord } from '../services/api';

interface PredictionHistoryPageProps {
  onFeedbackSelect: (predictionId: string) => void;
}

export const PredictionHistoryPage: React.FC<PredictionHistoryPageProps> = ({
  onFeedbackSelect,
}) => {
  const [records, setRecords] = useState<PredictionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterLabel, setFilterLabel] = useState<'all' | 'spam' | 'legitimate'>('all');
  const [limit, setLimit] = useState<number>(25);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [authorizedCheckbox, setAuthorizedCheckbox] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const labelParam = filterLabel === 'all' ? undefined : filterLabel;
      const res = await api.getPredictions(labelParam, limit);
      if (res && res.data) {
        setRecords(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filterLabel, limit]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = async () => {
    if (!authorizedCheckbox) return;
    try {
      await api.clearPredictions(true);
      setShowDeleteModal(false);
      setAuthorizedCheckbox(false);
      fetchRecords();
    } catch (err) {
      console.error("Failed to clear predictions:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Prediction History
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Real prediction records retrieved from the MongoDB <code className="font-mono text-slate-800">predictions</code> collection, sorted with newest events first.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filter and Limit Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Filter Label:</span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilterLabel('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterLabel === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setFilterLabel('spam')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterLabel === 'spam' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Spam Only
            </button>
            <button
              onClick={() => setFilterLabel('legitimate')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterLabel === 'legitimate' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Legitimate Only
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Max Records:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="p-1 border border-slate-200 rounded-md bg-white text-xs font-medium"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-32">Classification</th>
                <th className="py-3 px-4 w-28">Probability</th>
                <th className="py-3 px-4">Message Content</th>
                <th className="py-3 px-4 w-44">UTC Timestamp</th>
                <th className="py-3 px-4 w-32 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length > 0 ? (
                records.map((r) => {
                  const isSpam = r.predicted_label === 'spam';
                  return (
                    <tr key={r.message_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Classification Badge */}
                      <td className="py-3 px-4 align-top">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                            isSpam
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {r.predicted_label.toUpperCase()}
                        </span>
                      </td>

                      {/* Probability */}
                      <td className="py-3 px-4 align-top font-mono font-semibold tabular-nums text-slate-900">
                        {(r.spam_probability * 100).toFixed(1)}%
                      </td>

                      {/* Message Content & ID */}
                      <td className="py-3 px-4 align-top text-slate-800 leading-relaxed font-sans max-w-md">
                        <p>{r.message}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>ID: {r.message_id.slice(0, 18)}...</span>
                          <button
                            onClick={() => handleCopyId(r.message_id)}
                            className="hover:text-slate-700 transition-colors"
                            title="Copy full Prediction ID"
                          >
                            {copiedId === r.message_id ? (
                              <Check className="w-3 h-3 text-emerald-500 inline" />
                            ) : (
                              <Copy className="w-3 h-3 inline" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 align-top font-mono text-slate-500 tabular-nums">
                        {r.created_at ? new Date(r.created_at).toUTCString() : "N/A"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top text-right">
                        <button
                          onClick={() => onFeedbackSelect(r.message_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors whitespace-nowrap"
                          title="Submit feedback or report incorrect label"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Feedback</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    {isLoading ? "Loading records from database..." : "No prediction records found in collection."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-3">
              <AlertOctagon className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Authorize History Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              This action will permanently delete all stored predictions from the MongoDB Atlas <code className="font-mono text-slate-800">predictions</code> collection. This cannot be undone.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorizedCheckbox}
                  onChange={(e) => setAuthorizedCheckbox(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>I confirm and authorize deleting all history records.</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAuthorizedCheckbox(false);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={!authorizedCheckbox}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-lg transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
