import React, { useState, useEffect } from 'react';
import {
  Mail,
  Filter,
  RefreshCw,
  Trash2,
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  Search,
  Copy,
  Check
} from 'lucide-react';
import { api, EmailRecord } from '../services/api';

interface EmailHistoryPageProps {
  onRefreshStats: () => void;
}

export const EmailHistoryPage: React.FC<EmailHistoryPageProps> = ({ onRefreshStats }) => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterLabel, setFilterLabel] = useState<'all' | 'spam' | 'legitimate'>('all');
  const [limit, setLimit] = useState<number>(25);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [authorizedCheckbox, setAuthorizedCheckbox] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const labelParam = filterLabel === 'all' ? undefined : filterLabel;
      const res = await api.getEmails(labelParam, limit);
      if (res && res.data) {
        setEmails(res.data);
      }
    } catch (err) {
      console.error("Error fetching emails:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [filterLabel, limit]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearCollection = async () => {
    if (!authorizedCheckbox) return;
    try {
      await api.clearEmails(true);
      setShowDeleteModal(false);
      setAuthorizedCheckbox(false);
      fetchEmails();
      onRefreshStats();
    } catch (err) {
      console.error("Failed to clear emails:", err);
    }
  };

  const filteredList = emails.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.subject.toLowerCase().includes(q) ||
      e.sender_address.toLowerCase().includes(q) ||
      e.snippet.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Email Detection History
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Real incoming emails ingested from your authorized Gmail account and logged in the MongoDB <code className="font-mono text-slate-800">emails</code> collection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmails}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
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

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Classification:</span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilterLabel('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterLabel === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setFilterLabel('spam')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterLabel === 'spam' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Spam Only
            </button>
            <button
              onClick={() => setFilterLabel('legitimate')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterLabel === 'legitimate' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Legitimate Only
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sender or subject..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Limit:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="p-1 border border-slate-200 rounded-md bg-white text-xs font-medium"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Email Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-32">Verdict</th>
                <th className="py-3 px-4 w-28">Probability</th>
                <th className="py-3 px-4 w-60">Sender Address</th>
                <th className="py-3 px-4">Subject & Snippet</th>
                <th className="py-3 px-4 w-40 text-right">Received (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length > 0 ? (
                filteredList.map((e) => {
                  const isSpam = e.predicted_class === 'spam';
                  return (
                    <tr key={e.gmail_message_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 align-top">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                            isSpam
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {e.predicted_class.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-top font-mono font-bold tabular-nums text-slate-900">
                        {(e.spam_probability * 100).toFixed(1)}%
                      </td>

                      <td className="py-3 px-4 align-top text-slate-700 font-medium truncate max-w-[240px]">
                        {e.sender_address}
                      </td>

                      <td className="py-3 px-4 align-top text-slate-800 leading-relaxed font-sans max-w-md">
                        <span className="font-semibold text-slate-900 block truncate">
                          {e.subject || '(No Subject)'}
                        </span>
                        {e.snippet && (
                          <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 block">
                            {e.snippet}
                          </span>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>Gmail ID: {e.gmail_message_id}</span>
                          <button
                            onClick={() => handleCopyId(e.gmail_message_id)}
                            className="hover:text-slate-600"
                            title="Copy Gmail ID"
                          >
                            {copiedId === e.gmail_message_id ? (
                              <Check className="w-3 h-3 text-emerald-500 inline" />
                            ) : (
                              <Copy className="w-3 h-3 inline" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-right font-mono text-slate-500 tabular-nums">
                        {e.received_timestamp ? new Date(e.received_timestamp).toLocaleDateString() : 'N/A'}
                        <span className="block text-[10px] text-slate-400">
                          {e.received_timestamp ? new Date(e.received_timestamp).toLocaleTimeString() : ''}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    {isLoading ? "Fetching records from MongoDB..." : "No email records found matching the filter."}
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
              This will permanently delete all classified email records from the MongoDB Atlas <code className="font-mono text-slate-800">emails</code> collection. It will NOT delete or modify any emails in your actual Gmail inbox.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorizedCheckbox}
                  onChange={(e) => setAuthorizedCheckbox(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>I authorize clearing the stored email records.</span>
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
                onClick={handleClearCollection}
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
