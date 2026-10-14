import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Download,
  Terminal,
  BookOpen,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { MLEngine } from '../ml/engine';

interface ScikitLearnPipelineProps {
  engine: MLEngine;
}

export const ScikitLearnPipeline: React.FC<ScikitLearnPipelineProps> = ({ engine }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const pythonScript = engine.generatePythonScript();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([pythonScript], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'train_sms_spam_model.py');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadDataset = () => {
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
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Scikit-Learn Training Pipeline & Production Code
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Production Python pipeline to train, evaluate, and serialize TF-IDF + Multinomial Naive Bayes and Logistic Regression models using <span className="font-semibold text-slate-800">scikit-learn</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadScript}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .py Script</span>
            </button>
            <button
              onClick={handleDownloadDataset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Dataset CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Architecture Pipeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Machine Learning Pipeline Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mb-2">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Text Preprocessing</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Regex normalization for URLs, phone numbers, currency symbols, lowercasing, and removal of 318 English stop words.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-2">
              2
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">TF-IDF Vectorization</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Computes smooth IDF weights <span className="font-mono text-[10px]">ln((1+N)/(1+df)) + 1</span> and scales term frequencies with L2 vector normalization.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mb-2">
              3
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Model Estimation</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Fits <span className="font-semibold text-slate-800">MultinomialNB(alpha=1.0)</span> with Laplace smoothing and <span className="font-semibold text-slate-800">LogisticRegression(C=1.0)</span> with L2 regularization.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center mb-2">
              4
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Evaluation & Export</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Evaluates test accuracy, precision/recall, ROC-AUC score, and serializes trained models with Joblib for microservice serving.
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Quick-Start Instructions */}
      <div className="bg-slate-950 text-slate-200 rounded-xl p-5 border border-slate-800 shadow-sm font-mono text-xs">
        <div className="flex items-center gap-2 mb-3 text-slate-400">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-sans font-semibold text-white">How to Run Locally or in Google Colab:</span>
        </div>
        <div className="space-y-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 text-emerald-300">
          <p><span className="text-slate-500"># 1. Install required machine learning libraries</span></p>
          <p className="text-white">pip install scikit-learn pandas numpy joblib</p>
          <p className="pt-2"><span className="text-slate-500"># 2. Place sms_spam_dataset.csv in the same directory</span></p>
          <p><span className="text-slate-500"># 3. Execute the scikit-learn training script</span></p>
          <p className="text-white">python train_sms_spam_model.py</p>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm">
        <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-semibold text-slate-200">
              train_sms_spam_model.py
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/70"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[500px]">
          <code>{pythonScript}</code>
        </pre>
      </div>
    </div>
  );
};
