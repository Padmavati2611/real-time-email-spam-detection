import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Award
} from 'lucide-react';
import { MLEngine, PipelineConfig } from '../ml/engine';
import { ModelEvaluationResult, RocPoint } from '../ml/evaluation';

interface ModelEvaluationProps {
  engine: MLEngine;
  onRetrain: () => void;
  isRetraining: boolean;
}

export const ModelEvaluation: React.FC<ModelEvaluationProps> = ({
  engine,
  onRetrain,
  isRetraining,
}) => {
  const [activeModelTab, setActiveModelTab] = useState<'nb' | 'lr'>('nb');

  // Local state for hyperparameter tuning
  const [testRatio, setTestRatio] = useState<number>(engine.config.testRatio);
  const [maxFeatures, setMaxFeatures] = useState<number>(engine.config.maxFeatures);
  const [nbAlpha, setNbAlpha] = useState<number>(engine.config.naiveBayesAlpha);
  const [lrC, setLrC] = useState<number>(engine.config.logisticRegressionC);
  const [ngramMode, setNgramMode] = useState<'1' | '1-2'>(
    engine.config.ngramRange[1] === 2 ? '1-2' : '1'
  );

  const nbEval = engine.nbEvaluation;
  const lrEval = engine.lrEvaluation;

  const currentEval: ModelEvaluationResult | null = activeModelTab === 'nb' ? nbEval : lrEval;
  const topFeatures =
    activeModelTab === 'nb'
      ? engine.nbModel.getTopFeatures(12)
      : engine.lrModel.getTopFeatures(12);

  const handleApplyHyperparameters = () => {
    engine.updateConfig({
      testRatio,
      maxFeatures,
      naiveBayesAlpha: nbAlpha,
      logisticRegressionC: lrC,
      ngramRange: ngramMode === '1-2' ? [1, 2] : [1, 1],
    });
    onRetrain();
  };

  const handleResetHyperparameters = () => {
    setTestRatio(0.25);
    setMaxFeatures(800);
    setNbAlpha(1.0);
    setLrC(1.0);
    setNgramMode('1-2');
    engine.updateConfig({
      testRatio: 0.25,
      maxFeatures: 800,
      naiveBayesAlpha: 1.0,
      logisticRegressionC: 1.0,
      ngramRange: [1, 2],
    });
    onRetrain();
  };

  // Helper to build SVG ROC path
  const buildRocSvgPath = (points: RocPoint[]): string => {
    if (!points || points.length === 0) return '';
    // SVG coordinate space: 0,0 is top-left, 300,300 is bottom-right
    // FPR -> X (0 to 300), TPR -> Y (300 to 0)
    const svgCoords = points.map(p => {
      const x = p.fpr * 260 + 20;
      const y = (1 - p.tpr) * 260 + 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M 20,280 L ${svgCoords.join(' L ')} L 280,20`;
  };

  if (!currentEval) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Evaluating Models...</h3>
        <p className="text-sm text-slate-500 mt-1">Calculating confusion matrix, ROC curves, and test metrics.</p>
      </div>
    );
  }

  const cm = currentEval.confusionMatrix;

  return (
    <div className="space-y-8">
      {/* Top Header & Model Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Model Performance & Benchmark Evaluation
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Evaluated on an unseen stratified test partition ({currentEval.testCount} test samples out of {currentEval.trainCount + currentEval.testCount} total).
            </p>
          </div>

          {/* Model Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 border border-slate-200">
            <button
              onClick={() => setActiveModelTab('nb')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                activeModelTab === 'nb'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Multinomial Naive Bayes
            </button>
            <button
              onClick={() => setActiveModelTab('lr')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                activeModelTab === 'lr'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Logistic Regression
            </button>
          </div>
        </div>

        {/* Model Comparison Summary Bar */}
        {nbEval && lrEval && (
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Naive Bayes Accuracy
              </span>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {(nbEval.accuracy * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                AUC: {nbEval.auc.toFixed(3)} · {nbEval.trainingTimeMs}ms
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Logistic Regression Accuracy
              </span>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {(lrEval.accuracy * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                AUC: {lrEval.auc.toFixed(3)} · {lrEval.trainingTimeMs}ms
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                False Positives (Ham Flagged)
              </span>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                NB: {nbEval.confusionMatrix.falsePositives} · LR: {lrEval.confusionMatrix.falsePositives}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Lower is safer for legitimate users
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Active Benchmark Winner
              </span>
              <span className="text-lg font-bold text-indigo-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>
                  {nbEval.f1Score >= lrEval.f1Score ? 'Naive Bayes' : 'Logistic Reg'}
                </span>
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Based on overall test F1-Score
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Accuracy
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1 block">
            {(currentEval.accuracy * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Total correct predictions
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Precision (Spam)
          </span>
          <span className="text-2xl font-bold font-mono text-indigo-600 tabular-nums mt-1 block">
            {(currentEval.precision * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            TP / (TP + FP)
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Recall (Sensitivity)
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-600 tabular-nums mt-1 block">
            {(currentEval.recall * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            TP / (TP + FN)
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            F1-Score
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1 block">
            {(currentEval.f1Score * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Harmonic balance
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            ROC - AUC
          </span>
          <span className="text-2xl font-bold font-mono text-amber-600 tabular-nums mt-1 block">
            {currentEval.auc.toFixed(3)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Area under ROC curve
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Inference Time
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1 block">
            {currentEval.inferenceLatencyMs}ms
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Per SMS vectorization
          </span>
        </div>
      </div>

      {/* Confusion Matrix & ROC Curve Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Confusion Matrix (7 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Confusion Matrix (Unseen Test Set: N={cm.totalSamples})
              </h3>
              <span className="text-xs text-slate-500">
                Threshold: {(engine.config.decisionThreshold * 100).toFixed(0)}%
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Compares actual labels vs model predictions. In SMS spam filtering, preventing <span className="font-semibold text-rose-700">False Positives</span> (innocent texts falsely labeled as spam) is just as vital as catching real spam.
            </p>

            {/* Matrix 2x2 Grid with Headers */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {/* True Negative */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  True Negative (TN)
                </span>
                <span className="text-3xl font-bold font-mono text-emerald-950 tabular-nums my-1 block">
                  {cm.trueNegatives}
                </span>
                <span className="text-xs text-emerald-700 block">
                  Legitimate Ham correctly allowed
                </span>
                <span className="text-[10px] font-mono text-emerald-600 mt-1 block">
                  {((cm.trueNegatives / (cm.totalSamples || 1)) * 100).toFixed(1)}% of test set
                </span>
              </div>

              {/* False Positive */}
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
                  False Positive (FP)
                </span>
                <span className="text-3xl font-bold font-mono text-rose-950 tabular-nums my-1 block">
                  {cm.falsePositives}
                </span>
                <span className="text-xs text-rose-700 block">
                  Ham falsely flagged as Spam (Type I)
                </span>
                <span className="text-[10px] font-mono text-rose-600 mt-1 block">
                  {((cm.falsePositives / (cm.totalSamples || 1)) * 100).toFixed(1)}% error rate
                </span>
              </div>

              {/* False Negative */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                  False Negative (FN)
                </span>
                <span className="text-3xl font-bold font-mono text-amber-950 tabular-nums my-1 block">
                  {cm.falseNegatives}
                </span>
                <span className="text-xs text-amber-700 block">
                  Spam missed / leaked into inbox (Type II)
                </span>
                <span className="text-[10px] font-mono text-amber-600 mt-1 block">
                  {((cm.falseNegatives / (cm.totalSamples || 1)) * 100).toFixed(1)}% missed
                </span>
              </div>

              {/* True Positive */}
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block">
                  True Positive (TP)
                </span>
                <span className="text-3xl font-bold font-mono text-indigo-950 tabular-nums my-1 block">
                  {cm.truePositives}
                </span>
                <span className="text-xs text-indigo-700 block">
                  Spam successfully caught
                </span>
                <span className="text-[10px] font-mono text-indigo-600 mt-1 block">
                  {((cm.truePositives / (cm.totalSamples || 1)) * 100).toFixed(1)}% of test set
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Ham Support: {cm.trueNegatives + cm.falsePositives} samples</span>
            <span>Spam Support: {cm.truePositives + cm.falseNegatives} samples</span>
          </div>
        </div>

        {/* ROC Curve SVG Graph (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Receiver Operating Characteristic (ROC)
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-600 tabular-nums">
                AUC = {currentEval.auc.toFixed(3)}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Plots True Positive Rate (Sensitivity) vs False Positive Rate (1 - Specificity) across decision thresholds. Curves bowing toward top-left signify near-ideal discriminative power.
            </p>

            {/* SVG Plot */}
            <div className="relative w-full max-w-[320px] mx-auto aspect-square bg-slate-50 border border-slate-200 rounded-lg p-2">
              <svg viewBox="0 0 300 300" className="w-full h-full">
                {/* Grid lines */}
                <line x1="20" y1="20" x2="280" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="20" y1="85" x2="280" y2="85" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="20" y1="150" x2="280" y2="150" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="20" y1="215" x2="280" y2="215" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="20" y1="280" x2="280" y2="280" stroke="#cbd5e1" />

                <line x1="20" y1="20" x2="20" y2="280" stroke="#cbd5e1" />
                <line x1="85" y1="20" x2="85" y2="280" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="150" y1="20" x2="150" y2="280" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="215" y1="20" x2="215" y2="280" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="280" y1="20" x2="280" y2="280" stroke="#e2e8f0" strokeDasharray="3,3" />

                {/* Random Guess 45-degree diagonal line */}
                <line x1="20" y1="280" x2="280" y2="20" stroke="#94a3b8" strokeDasharray="4,4" strokeWidth="1.5" />

                {/* Model ROC Path */}
                <path
                  d={buildRocSvgPath(currentEval.rocPoints)}
                  fill="rgba(79, 70, 229, 0.08)"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Threshold Markers */}
                {currentEval.rocPoints.map((pt, i) => {
                  const x = pt.fpr * 260 + 20;
                  const y = (1 - pt.tpr) * 260 + 20;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="#4f46e5"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Axis labels inside SVG */}
                <text x="150" y="296" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="sans-serif">
                  False Positive Rate (FPR) →
                </text>
                <text x="12" y="150" textAnchor="middle" fontSize="10" fill="#64748b" transform="rotate(-90 12,150)" fontFamily="sans-serif">
                  True Positive Rate (TPR) →
                </text>
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-indigo-600 inline-block"></span>
              <span>{activeModelTab === 'nb' ? 'Multinomial Naive Bayes' : 'Logistic Regression'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block"></span>
              <span>Random Baseline (0.50)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Classification Report Table (Exact Scikit-Learn Format) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
          Scikit-Learn Classification Report
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Precision, recall, and F1-score breakdown per class calculated on the {currentEval.testCount} test records.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 font-semibold">Class / Target</th>
                <th className="py-2.5 px-3 font-semibold text-right">Precision</th>
                <th className="py-2.5 px-3 font-semibold text-right">Recall</th>
                <th className="py-2.5 px-3 font-semibold text-right">F1-Score</th>
                <th className="py-2.5 px-3 font-semibold text-right">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 font-sans font-medium text-slate-800">Ham (Legitimate)</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.ham.precision * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.ham.recall * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right font-semibold">{(currentEval.classificationReport.ham.f1Score * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right text-slate-500">{currentEval.classificationReport.ham.support}</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 font-sans font-medium text-rose-800">Spam</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.spam.precision * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.spam.recall * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right font-semibold text-rose-700">{(currentEval.classificationReport.spam.f1Score * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right text-slate-500">{currentEval.classificationReport.spam.support}</td>
              </tr>
              <tr className="border-t-2 border-slate-200 bg-slate-50/60 font-semibold">
                <td className="py-2.5 px-3 font-sans text-slate-900">Accuracy</td>
                <td colSpan={2} className="py-2.5 px-3 text-center text-slate-400 font-sans text-[11px]">overall</td>
                <td className="py-2.5 px-3 text-right text-slate-900">{(currentEval.classificationReport.accuracy * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right text-slate-700">{currentEval.testCount}</td>
              </tr>
              <tr className="hover:bg-slate-50/50 text-slate-600">
                <td className="py-2.5 px-3 font-sans">Macro Avg</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.macroAvg.precision * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.macroAvg.recall * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.macroAvg.f1Score * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right text-slate-500">{currentEval.classificationReport.macroAvg.support}</td>
              </tr>
              <tr className="hover:bg-slate-50/50 text-slate-600">
                <td className="py-2.5 px-3 font-sans">Weighted Avg</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.weightedAvg.precision * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.weightedAvg.recall * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right">{(currentEval.classificationReport.weightedAvg.f1Score * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right text-slate-500">{currentEval.classificationReport.weightedAvg.support}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Feature Importance / Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spam Keywords */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Top Spam Predictive Terms
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Features with highest positive log-odds / regression coefficients toward Spam.
          </p>

          <div className="space-y-2">
            {topFeatures.topSpam.map((f, i) => {
              const maxW = topFeatures.topSpam[0]?.weight || 1;
              const barPercent = Math.min(100, Math.max(10, (f.weight / maxW) * 100));
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-slate-700 w-28 truncate">
                    {f.token}
                  </span>
                  <div className="flex-1 mx-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-rose-700 tabular-nums w-12 text-right">
                    +{f.weight.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ham Keywords */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Top Ham (Legitimate) Terms
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Features with highest negative log-odds / coefficients associated with legitimate messages.
          </p>

          <div className="space-y-2">
            {topFeatures.topHam.map((f, i) => {
              const maxW = topFeatures.topHam[0]?.weight || 1;
              const barPercent = Math.min(100, Math.max(10, (f.weight / maxW) * 100));
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-slate-700 w-28 truncate">
                    {f.token}
                  </span>
                  <div className="flex-1 mx-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-emerald-700 tabular-nums w-12 text-right">
                    -{f.weight.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hyperparameter Playground */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Machine Learning Hyperparameter Tuning
          </h3>
        </div>
        <p className="text-xs text-slate-600 mb-6">
          Adjust pipeline parameters to observe their direct impact on test accuracy, confusion matrix error rates, and classification reports.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Test Split Ratio */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Test Split Ratio:</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {Math.round(testRatio * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.40"
              step="0.05"
              value={testRatio}
              onChange={(e) => setTestRatio(parseFloat(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 block">
              Proportion reserved for validation
            </span>
          </div>

          {/* Max TF-IDF Features */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Max Features (Vocab):</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {maxFeatures}
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="1500"
              step="100"
              value={maxFeatures}
              onChange={(e) => setMaxFeatures(parseInt(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 block">
              Top n-gram vocabulary limit
            </span>
          </div>

          {/* Naive Bayes Alpha */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Naive Bayes Alpha (α):</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {nbAlpha.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={nbAlpha}
              onChange={(e) => setNbAlpha(parseFloat(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 block">
              Laplace additive smoothing
            </span>
          </div>

          {/* Logistic Regression C */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Logistic Reg (C):</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {lrC.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={lrC}
              onChange={(e) => setLrC(parseFloat(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 block">
              Inverse L2 regularization strength
            </span>
          </div>
        </div>

        {/* N-gram Range selector & Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">N-gram Range:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200">
              <button
                onClick={() => setNgramMode('1')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  ngramMode === '1' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Unigrams (1,1)
              </button>
              <button
                onClick={() => setNgramMode('1-2')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  ngramMode === '1-2' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Unigrams + Bigrams (1,2)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetHyperparameters}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Reset Defaults
            </button>
            <button
              onClick={handleApplyHyperparameters}
              disabled={isRetraining}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
              <span>Apply & Retrain Models</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
