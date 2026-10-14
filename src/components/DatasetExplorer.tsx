import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';
import { MLEngine } from '../ml/engine';
import { SMSMessage } from '../ml/smsDataset';

interface DatasetExplorerProps {
  engine: MLEngine;
  onSelectMessageForTesting: (text: string) => void;
  onDatasetChanged: () => void;
}

export const DatasetExplorer: React.FC<DatasetExplorerProps> = ({
  engine,
  onSelectMessageForTesting,
  onDatasetChanged,
}) => {
  const [filterLabel, setFilterLabel] = useState<'all' | 'spam' | 'ham'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Add Message Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newText, setNewText] = useState<string>('');
  const [newLabel, setNewLabel] = useState<'ham' | 'spam'>('spam');
  const [newCategory, setNewCategory] = useState<SMSMessage['category']>('phishing');

  const dataset = engine.dataset;

  // Dataset statistics
  const totalCount = dataset.length;
  const spamCount = dataset.filter(d => d.label === 'spam').length;
  const hamCount = dataset.filter(d => d.label === 'ham').length;
  const spamPercent = totalCount > 0 ? ((spamCount / totalCount) * 100).toFixed(1) : '0';

  const avgLength = useMemo(() => {
    if (totalCount === 0) return 0;
    const totalChars = dataset.reduce((acc, d) => acc + d.text.length, 0);
    return Math.round(totalChars / totalCount);
  }, [dataset, totalCount]);

  // Filtered dataset
  const filteredMessages = useMemo(() => {
    return dataset.filter(item => {
      if (filterLabel !== 'all' && item.label !== filterLabel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.text.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dataset, filterLabel, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / pageSize));
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAddNewMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    engine.addMessage({
      label: newLabel,
      text: newText.trim(),
      category: newCategory,
    });
    setNewText('');
    setShowAddModal(false);
    onDatasetChanged();
  };

  const handleDeleteMessage = (id: string) => {
    engine.removeMessage(id);
    onDatasetChanged();
  };

  const handleResetDataset = () => {
    if (confirm('Reset dataset back to the initial SMS Spam Collection benchmark?')) {
      engine.resetDataset();
      onDatasetChanged();
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = engine.exportDatasetCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sms_spam_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Summary Statistics */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              SMS Benchmark Dataset Explorer
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Curated corpus of real-world SMS messages labeled for machine learning classification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add SMS Sample</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleResetDataset}
              title="Reset to default benchmark dataset"
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dataset Key Metrics Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Messages
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {totalCount}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Available in corpus
            </span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Legitimate (Ham)
            </span>
            <span className="text-xl font-bold font-mono text-emerald-950 tabular-nums">
              {hamCount}
            </span>
            <span className="text-[11px] text-emerald-700 block mt-0.5">
              {totalCount > 0 ? ((hamCount / totalCount) * 100).toFixed(1) : 0}% of dataset
            </span>
          </div>

          <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-100">
            <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
              Spam Messages
            </span>
            <span className="text-xl font-bold font-mono text-rose-950 tabular-nums">
              {spamCount}
            </span>
            <span className="text-[11px] text-rose-700 block mt-0.5">
              {spamPercent}% spam distribution
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Avg Text Length
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {avgLength} chars
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Approx. 15-25 words
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Label Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto border border-slate-200/60">
          <button
            onClick={() => { setFilterLabel('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filterLabel === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => { setFilterLabel('ham'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filterLabel === 'ham' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ham Only ({hamCount})
          </button>
          <button
            onClick={() => { setFilterLabel('spam'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filterLabel === 'spam' ? 'bg-white text-rose-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Spam Only ({spamCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search keywords or category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
          />
        </div>
      </div>

      {/* Dataset Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-24">Label</th>
                <th className="py-3 px-4 w-28">Category</th>
                <th className="py-3 px-4">Message Content</th>
                <th className="py-3 px-4 w-24 text-right">Length</th>
                <th className="py-3 px-4 w-32 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMessages.length > 0 ? (
                paginatedMessages.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Label Badge */}
                    <td className="py-3 px-4 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.label === 'spam'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {item.label.toUpperCase()}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 align-top text-slate-500 font-medium capitalize">
                      {item.category || 'General'}
                    </td>

                    {/* Text Snippet */}
                    <td className="py-3 px-4 align-top text-slate-800 font-sans leading-relaxed">
                      {item.text}
                    </td>

                    {/* Length */}
                    <td className="py-3 px-4 align-top text-right font-mono text-slate-500 tabular-nums">
                      {item.text.length} ch
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectMessageForTesting(item.text)}
                          className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors whitespace-nowrap"
                          title="Load this message in the Live Classifier"
                        >
                          Test Live
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete from active dataset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No SMS messages match your current search query or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredMessages.length)} of {filteredMessages.length} messages
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="font-mono font-medium px-2 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add New SMS Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add New SMS Sample</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewMessage} className="py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Message Content:
                </label>
                <textarea
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter the full SMS text..."
                  className="w-full p-2.5 text-xs font-sans text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Label:
                  </label>
                  <select
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value as 'ham' | 'spam')}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-medium"
                  >
                    <option value="spam">Spam (Unwanted/Fraud)</option>
                    <option value="ham">Ham (Legitimate)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Category:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-medium"
                  >
                    <option value="lottery">Lottery / Prize</option>
                    <option value="banking">Banking Phishing</option>
                    <option value="delivery">Delivery Scam</option>
                    <option value="phishing">Account Phishing</option>
                    <option value="service">Subscription / Tones</option>
                    <option value="chat">Personal Chat</option>
                    <option value="work">Work Communication</option>
                    <option value="reminder">Appointment / 2FA</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Add & Auto-Retrain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
