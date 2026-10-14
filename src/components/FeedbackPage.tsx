import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { api, FeedbackRecord } from '../services/api';

interface FeedbackPageProps {
  initialPredictionId?: string;
  onClearInitialId?: () => void;
}

export const FeedbackPage: React.FC<FeedbackPageProps> = ({
  initialPredictionId = '',
  onClearInitialId,
}) => {
  const [predictionId, setPredictionId] = useState<string>(initialPredictionId);
  const [correctLabel, setCorrectLabel] = useState<'spam' | 'legitimate'>('spam');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recentFeedbacks, setRecentFeedbacks] = useState<FeedbackRecord[]>([]);

  useEffect(() => {
    if (initialPredictionId) {
      setPredictionId(initialPredictionId);
    }
  }, [initialPredictionId]);

  const loadRecentFeedbacks = async () => {
    try {
      const res = await api.getFeedback();
      if (res && res.data) {
        setRecentFeedbacks(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRecentFeedbacks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predictionId.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Prediction Message ID.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await api.submitFeedback({
        prediction_id: predictionId.trim(),
        user_feedback: feedbackText.trim(),
        correct_label: correctLabel,
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        setFeedbackText('');
        if (onClearInitialId) onClearInitialId();
        loadRecentFeedbacks();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to record feedback.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error communicating with database.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Prediction Verification & Feedback Loop
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
          Provide human-in-the-loop audit feedback on any classified message. Feedback is recorded into the MongoDB <code className="font-mono text-slate-800">feedback</code> collection with a strict verification barrier so false flags never corrupt the primary training set.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Feedback Form (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Submit New Feedback Record
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pred-id" className="text-xs font-semibold text-slate-700 block mb-1">
                Prediction Message ID (UUID):
              </label>
              <input
                id="pred-id"
                type="text"
                value={predictionId}
                onChange={(e) => setPredictionId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440001"
                className="w-full p-2.5 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:bg-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Found under any entry on the Prediction History page.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                What is the verified true label?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCorrectLabel('spam')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    correctLabel === 'spam'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Spam (Fraud / Unwanted)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCorrectLabel('legitimate')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    correctLabel === 'legitimate'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Legitimate (Ham)</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="fb-notes" className="text-xs font-semibold text-slate-700 block mb-1">
                Auditor Comments & Rationale:
              </label>
              <textarea
                id="fb-notes"
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Explain why the prediction was correct or incorrect (e.g., False positive triggered by OTP keywords)..."
                className="w-full p-3 text-xs font-sans text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Recording...' : 'Submit Feedback to MongoDB'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Security & Policy Info (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Data Integrity Policy
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              To adhere to Machine Learning best practices, feedback submissions are stored as <code className="font-mono text-indigo-300">verified: false</code> in MongoDB Atlas.
            </p>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>Protects production model against adversarial data poisoning.</li>
              <li>Enables retrospective data analyst auditing.</li>
              <li>Maintains traceable linkage to the original prediction ID.</li>
            </ul>
          </div>

          {/* Recent Audit List */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Recent Feedback Logs ({recentFeedbacks.length})
            </h4>
            {recentFeedbacks.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {recentFeedbacks.slice(0, 5).map((fb) => (
                  <div key={fb.feedback_id} className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] text-slate-500">
                        {fb.prediction_id.slice(0, 16)}...
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          fb.correct_label === 'spam' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {fb.correct_label ? fb.correct_label.toUpperCase() : 'AUDITED'}
                      </span>
                    </div>
                    {fb.user_feedback && (
                      <p className="text-slate-700 text-xs italic">{fb.user_feedback}</p>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {new Date(fb.submitted_at).toUTCString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic block py-4 text-center">
                No user feedback recorded yet.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
