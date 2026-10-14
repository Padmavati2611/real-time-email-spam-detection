import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Send,
  AlertTriangle,
  Database,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { MLEngine } from '../ml/engine';
import { api, DbStatus, PredictionRecord } from '../services/api';

interface SmsDetectionPageProps {
  engine: MLEngine;
  dbStatus: DbStatus | null;
  onPredictionSaved: () => void;
}

const SAMPLE_PRESETS = [
  {
    category: "Urgent Lottery Fraud",
    text: "URGENT! You have won a £1,000 Walmart gift card! Call 0871234567 to claim your prize now. Offer expires in 2 hours."
  },
  {
    category: "Banking Phishing Alert",
    text: "Santander Alert: A new payee 'MR J SMITH' was successfully added. If unauthorized, visit https://santander-sec-auth.com immediately."
  },
  {
    category: "Delivery Fee Scam",
    text: "Royal Mail: Your parcel #GB-984210 cannot be delivered due to an unpaid postage fee of £1.99. Pay now at https://royalmail-redelivery-fee.info"
  },
  {
    category: "Legitimate 2FA Code",
    text: "Your Google verification code is 849201. Do not share this code with anyone."
  },
  {
    category: "Normal Personal Chat",
    text: "Hey, are we still meeting for lunch at 12:30 at the Italian place downtown? Let me know so I can reserve a table."
  }
];

export const SmsDetectionPage: React.FC<SmsDetectionPageProps> = ({
  engine,
  dbStatus,
  onPredictionSaved,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'nb' | 'lr'>('nb');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastSavedRecord, setLastSavedRecord] = useState<PredictionRecord | null>(null);
  const [dbSaveMessage, setDbSaveMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckMessage = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Please enter an SMS text message to analyze.");
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);

    try {
      // 1. Run Machine Learning Model Inference
      const modelName = selectedModel === 'nb' ? 'Multinomial Naive Bayes' : 'Logistic Regression';
      const prediction = engine.classify(inputText, selectedModel, 0.5);

      // 2. Persist to MongoDB Atlas Database (Collection: predictions)
      const label = prediction.label === 'spam' ? 'spam' : 'legitimate';
      const saveRes = await api.savePrediction({
        message: inputText,
        predicted_label: label,
        spam_probability: prediction.spamProbability,
        model_name: modelName,
      });

      if (saveRes.success) {
        setLastSavedRecord(saveRes.data);
        setDbSaveMessage(saveRes.message);
        onPredictionSaved();
      } else {
        setDbSaveMessage("Note: Model predicted successfully, but database write failed.");
      }
    } catch (err: any) {
      setErrorMsg(`Prediction error: ${err.message || 'Unknown issue'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Classify SMS Message & Save to Database
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
          Input an SMS text message to evaluate with the machine learning pipeline. Each prediction is automatically recorded in the MongoDB <code className="font-mono text-slate-800">predictions</code> collection.
        </p>

        {/* Presets */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            Try Sample Messages:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PRESETS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(sample.text);
                  setErrorMsg(null);
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md border text-left transition-colors whitespace-nowrap ${
                  inputText === sample.text
                    ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {sample.category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Input & Prediction Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="sms-textarea" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                SMS Text Message
              </label>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {inputText.length} characters
              </span>
            </div>

            <textarea
              id="sms-textarea"
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type SMS content here (e.g. You have won £1,000! Click here...)"
              className="w-full p-3.5 text-sm font-sans text-slate-900 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all leading-relaxed placeholder:text-slate-400"
            />

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
              {/* Algorithm Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Model:</span>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setSelectedModel('nb')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      selectedModel === 'nb' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Naive Bayes
                  </button>
                  <button
                    onClick={() => setSelectedModel('lr')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      selectedModel === 'lr' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Logistic Reg
                  </button>
                </div>
              </div>

              {/* Check Message Button */}
              <button
                onClick={handleCheckMessage}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAnalyzing ? 'Classifying...' : 'Check Message'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Real-time Result & Security Warning (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block pb-2 border-b border-slate-100">
              Classification Verdict
            </span>

            {lastSavedRecord ? (
              <div className="mt-4 space-y-4">
                {lastSavedRecord.predicted_label === 'spam' ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-base font-bold text-rose-900 block">
                        SPAM DETECTED
                      </span>
                      <span className="text-xs text-rose-700 block mt-1">
                        Estimated Spam Probability: <strong>{(lastSavedRecord.spam_probability * 100).toFixed(1)}%</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-base font-bold text-emerald-900 block">
                        LEGITIMATE (HAM)
                      </span>
                      <span className="text-xs text-emerald-700 block mt-1">
                        Estimated Spam Probability: <strong>{(lastSavedRecord.spam_probability * 100).toFixed(1)}%</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Probability Bar */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Spam Likelihood:</span>
                    <span className="font-mono text-slate-900 tabular-nums">
                      {(lastSavedRecord.spam_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${lastSavedRecord.spam_probability * 100}%` }}
                    />
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(1 - lastSavedRecord.spam_probability) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Security Warning banner required in prompt */}
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Security Advisory:</span>
                    <span className="text-amber-800 text-[11px] leading-relaxed block mt-0.5">
                      Never trust unexpected URLs, urgent banking cancellation links, or requests for one-time passwords (OTP). Always verify with official organizations directly.
                    </span>
                  </div>
                </div>

                {/* Database Saved Receipt */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Database Record Created</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    ID: <span className="text-slate-800">{lastSavedRecord.message_id}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Time: <span className="text-slate-800">{lastSavedRecord.created_at}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Enter an SMS message on the left and click "Check Message" to view prediction and database output.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
