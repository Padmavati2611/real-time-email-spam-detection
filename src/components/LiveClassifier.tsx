import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Send,
  Zap,
  Info,
  Sliders,
  Sparkles,
  FileText,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { MLEngine } from '../ml/engine';
import { PredictionResult } from '../ml/models';

interface LiveClassifierProps {
  engine: MLEngine;
}

const SAMPLE_PRESETS = [
  {
    category: 'Spam: Lottery',
    text: "URGENT! You have won a £1,000 Walmart gift card! Call 0871234567 to claim your prize now. Offer expires in 2 hours.",
    expected: 'spam',
  },
  {
    category: 'Spam: Banking Phish',
    text: "Santander Alert: A new payee 'MR J SMITH' was successfully added. If this was NOT you, visit https://santander-sec-auth.com immediately.",
    expected: 'spam',
  },
  {
    category: 'Spam: Delivery Fee',
    text: "Royal Mail: Your parcel #GB-984210 cannot be delivered due to an unpaid postage fee of £1.99. Pay now at https://royalmail-redelivery-fee.info",
    expected: 'spam',
  },
  {
    category: 'Ham: 2FA Passcode',
    text: "Your Google verification code is 849201. Do not share this code with anyone.",
    expected: 'ham',
  },
  {
    category: 'Ham: Casual Chat',
    text: "Hey, are we still meeting for lunch at 12:30 at the Italian place downtown? Let me know so I can reserve a table.",
    expected: 'ham',
  },
  {
    category: 'Ham: Work Sync',
    text: "Could you push the latest pull request to the staging branch before end of day? The QA team is waiting.",
    expected: 'ham',
  },
];

export const LiveClassifier: React.FC<LiveClassifierProps> = ({ engine }) => {
  const [inputText, setInputText] = useState(
    "URGENT! You have won a £1,000 Walmart gift card! Call 0871234567 to claim your prize now. Offer expires in 2 hours."
  );
  const [selectedModel, setSelectedModel] = useState<'nb' | 'lr'>('nb');
  const [customThreshold, setCustomThreshold] = useState<number>(0.5);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchInput, setBatchInput] = useState<string>(
    "Congratulations! You won a $500 Amazon Gift card. Text WIN to 88022.\nHey dad, can I borrow the lawnmower this weekend?\nUrgent banking notice: Debit card suspended. Visit http://bofa-verify.net\nYour dental cleaning is scheduled for tomorrow at 2:00 PM."
  );
  const [batchResults, setBatchResults] = useState<Array<{ text: string; result: PredictionResult }> | null>(null);

  // Compute live prediction whenever text, model, or threshold changes
  const prediction: PredictionResult = useMemo(() => {
    if (!inputText.trim()) {
      return {
        label: 'ham',
        spamProbability: 0,
        hamProbability: 1,
        rawScore: 0,
        tokenContributions: [],
      };
    }
    return engine.classify(inputText, selectedModel, customThreshold);
  }, [engine, inputText, selectedModel, customThreshold]);

  // Token breakdown mapping for visual in-text highlighting
  const tokenWeightMap = useMemo(() => {
    const map = new Map<string, { score: number; weight: number }>();
    for (const c of prediction.tokenContributions) {
      map.set(c.token.toLowerCase(), { score: c.score, weight: c.weight });
    }
    return map;
  }, [prediction]);

  const charCount = inputText.length;
  const smsSegments = Math.max(1, Math.ceil(charCount / 160));

  const handleRunBatch = () => {
    const lines = batchInput.split('\n').map(l => l.trim()).filter(Boolean);
    const results = lines.map(text => ({
      text,
      result: engine.classify(text, selectedModel, customThreshold),
    }));
    setBatchResults(results);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Explanation */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Real-Time SMS Spam Classification
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Type or paste any SMS message. The text is numerically vectorized using <span className="font-semibold text-slate-800">TF-IDF</span> (Term Frequency - Inverse Document Frequency) and evaluated against <span className="font-semibold text-slate-800">{selectedModel === 'nb' ? 'Multinomial Naive Bayes' : 'L2-Regularized Logistic Regression'}</span>.
            </p>
          </div>

          {/* Model Switcher Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start md:self-auto border border-slate-200/80">
            <button
              onClick={() => setSelectedModel('nb')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                selectedModel === 'nb'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Multinomial Naive Bayes
            </button>
            <button
              onClick={() => setSelectedModel('lr')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                selectedModel === 'lr'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Logistic Regression
            </button>
          </div>
        </div>

        {/* Quick presets strip */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
            <span>Quick Test Presets:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PRESETS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(sample.text)}
                className={`text-xs px-2.5 py-1.5 rounded-md border text-left transition-colors whitespace-nowrap ${
                  inputText === sample.text
                    ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="font-medium">{sample.category}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Input & Real-Time Verdict */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SMS Input Editor */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="sms-input" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SMS Message Text
              </label>
              <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums font-mono">
                <span>{charCount} chars</span>
                <span aria-hidden="true">·</span>
                <span>{smsSegments} SMS {smsSegments === 1 ? 'part' : 'parts'}</span>
              </div>
            </div>

            <textarea
              id="sms-input"
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type SMS content here..."
              className="w-full p-3.5 text-sm font-sans text-slate-900 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all leading-relaxed placeholder:text-slate-400"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setInputText('')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Clear Text
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => setShowBatchModal(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Batch Test Multiple</span>
                </button>
              </div>

              {/* Threshold Slider */}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Threshold:</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(parseFloat(e.target.value))}
                  className="w-20 accent-slate-900 cursor-pointer"
                />
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Math.round(customThreshold * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Explainability: In-text Token Heatmap */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  TF-IDF Token Attribution & Feature Weights
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-200 border border-rose-400"></span>
                  <span>Spam Signal</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-400"></span>
                  <span>Ham Signal</span>
                </span>
              </div>
            </div>

            {/* Tokenized rendered stream */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/70 min-h-[72px] text-sm leading-relaxed">
              {inputText.trim() ? (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {inputText.split(/\s+/).map((word, wIdx) => {
                    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const contrib = tokenWeightMap.get(cleanWord);

                    let bgClass = "bg-white text-slate-700 border-slate-200";
                    let title = `Word: "${word}" (Neutral or Stop Word)`;

                    if (contrib) {
                      if (contrib.score > 0.3) {
                        bgClass = "bg-rose-100 text-rose-900 border-rose-300 font-semibold";
                        title = `Spam Indicator: "${word}"\nScore: +${contrib.score.toFixed(3)}\nTF-IDF: ${contrib.weight.toFixed(3)}`;
                      } else if (contrib.score > 0.05) {
                        bgClass = "bg-amber-100 text-amber-900 border-amber-300 font-medium";
                        title = `Mild Spam Indicator: "${word}"\nScore: +${contrib.score.toFixed(3)}\nTF-IDF: ${contrib.weight.toFixed(3)}`;
                      } else if (contrib.score < -0.3) {
                        bgClass = "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold";
                        title = `Ham Indicator: "${word}"\nScore: ${contrib.score.toFixed(3)}\nTF-IDF: ${contrib.weight.toFixed(3)}`;
                      } else if (contrib.score < -0.05) {
                        bgClass = "bg-teal-100 text-teal-900 border-teal-300 font-medium";
                        title = `Mild Ham Indicator: "${word}"\nScore: ${contrib.score.toFixed(3)}\nTF-IDF: ${contrib.weight.toFixed(3)}`;
                      }
                    }

                    return (
                      <span
                        key={wIdx}
                        title={title}
                        className={`inline-block px-1.5 py-0.5 rounded border text-xs cursor-help transition-all hover:scale-105 shadow-2xs ${bgClass}`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-slate-400 text-xs italic">Enter text above to inspect token weights...</span>
              )}
            </div>

            {/* Top Contributory Features Table */}
            {prediction.tokenContributions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Top Influential Tokens in this Message:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {prediction.tokenContributions.slice(0, 6).map((c, idx) => {
                    const isSpam = c.score > 0;
                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-xs flex items-center justify-between ${
                          isSpam
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                            : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <span className="font-mono font-medium truncate max-w-[90px]">{c.token}</span>
                        <span className="font-mono text-[11px] font-semibold tabular-nums">
                          {isSpam ? `+${c.score.toFixed(2)}` : c.score.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Classification Verdict Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Classification Verdict
              </span>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {selectedModel === 'nb' ? 'MultinomialNB' : 'LogisticRegression'}
              </span>
            </div>

            {/* Big Verdict Banner */}
            <div className="my-6">
              {prediction.label === 'spam' ? (
                <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-rose-100 border border-rose-200 text-rose-600 shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold tracking-tight text-rose-900">
                        SPAM DETECTED
                      </span>
                    </div>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      This message exhibits high similarity to promotional, phishing, or financial fraud patterns.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-600 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold tracking-tight text-emerald-900">
                        LEGITIMATE (HAM)
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                      This message resembles normal interpersonal communication, legitimate notifications, or transactional alerts.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Probability Breakdown Gauge */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Spam Probability</span>
                  <span className="font-mono font-bold text-rose-600 tabular-nums">
                    {(prediction.spamProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-rose-500 h-full transition-all duration-300"
                    style={{ width: `${prediction.spamProbability * 100}%` }}
                  />
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${prediction.hamProbability * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs mt-1.5">
                  <span className="font-medium text-slate-700">Ham (Legitimate) Probability</span>
                  <span className="font-mono font-bold text-emerald-600 tabular-nums">
                    {(prediction.hamProbability * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Statistical details */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Active Decision Cutoff:</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {(customThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Raw Margin / Log-Odds:</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {prediction.rawScore > 0 ? `+${prediction.rawScore.toFixed(3)}` : prediction.rawScore.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Recognized Feature Tokens:</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {prediction.tokenContributions.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                How Decision Rules Work
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedModel === 'nb' ? (
                <>
                  <strong className="text-white">Multinomial Naive Bayes</strong> computes conditional joint log-likelihoods over term counts using Laplace smoothing. It assumes conditional word independence given the class, yielding ultra-fast, robust probabilistic classification.
                </>
              ) : (
                <>
                  <strong className="text-white">Logistic Regression</strong> learns an optimal linear hyperplane separating TF-IDF vectors using the sigmoid activation function <span className="font-mono text-indigo-300">σ(w·x + b)</span> and L2 weight shrinkage to prevent overfitting.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Batch Test Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Batch SMS Classifier</h3>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Enter Messages (one message per line):
                </label>
                <textarea
                  rows={4}
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  className="w-full p-3 text-xs font-sans text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleRunBatch}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Run Batch Classification
                </button>
              </div>

              {batchResults && (
                <div className="border border-slate-200 rounded-lg overflow-hidden mt-4">
                  <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>Batch Results ({batchResults.length} messages)</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {batchResults.map((item, i) => (
                      <div key={i} className="p-3 text-xs flex items-start justify-between gap-3 hover:bg-slate-50/50">
                        <p className="text-slate-700 flex-1">{item.text}</p>
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                              item.result.label === 'spam'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.result.label.toUpperCase()}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            {(item.result.spamProbability * 100).toFixed(1)}% spam
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
