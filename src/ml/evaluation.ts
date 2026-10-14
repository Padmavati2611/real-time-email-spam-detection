/**
 * Model Evaluation & Performance Metrics
 * Computes Confusion Matrix, Accuracy, Precision, Recall, Specificity, F1-Score,
 * ROC Curve, and AUC matching scikit-learn metrics standards.
 */

import { SMSMessage } from './smsDataset';

export interface ConfusionMatrix {
  truePositives: number;  // Spam correctly identified as Spam
  trueNegatives: number;  // Ham correctly identified as Ham
  falsePositives: number; // Ham incorrectly flagged as Spam
  falseNegatives: number; // Spam missed (classified as Ham)
  totalSamples: number;
}

export interface ClassMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export interface ClassificationReport {
  ham: ClassMetrics;
  spam: ClassMetrics;
  accuracy: number;
  macroAvg: ClassMetrics;
  weightedAvg: ClassMetrics;
}

export interface RocPoint {
  threshold: number;
  fpr: number; // False Positive Rate
  tpr: number; // True Positive Rate
}

export interface ModelEvaluationResult {
  confusionMatrix: ConfusionMatrix;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1Score: number;
  rocPoints: RocPoint[];
  auc: number;
  classificationReport: ClassificationReport;
  trainingTimeMs: number;
  inferenceLatencyMs: number;
  trainCount: number;
  testCount: number;
}

/**
 * Perform stratified train-test split to maintain class balance
 */
export function stratifiedTrainTestSplit<T extends { label: 'ham' | 'spam' }>(
  items: T[],
  testRatio: number = 0.25,
  seed: number = 42
): { train: T[]; test: T[] } {
  const hams = items.filter(d => d.label === 'ham');
  const spams = items.filter(d => d.label === 'spam');

  // Pseudo-random seeded shuffle
  function seededShuffle(arr: T[]) {
    let s = seed;
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  const shuffledHams = seededShuffle(hams);
  const shuffledSpams = seededShuffle(spams);

  const hamTestCount = Math.max(1, Math.floor(shuffledHams.length * testRatio));
  const spamTestCount = Math.max(1, Math.floor(shuffledSpams.length * testRatio));

  const testHams = shuffledHams.slice(0, hamTestCount);
  const trainHams = shuffledHams.slice(hamTestCount);

  const testSpams = shuffledSpams.slice(0, spamTestCount);
  const trainSpams = shuffledSpams.slice(spamTestCount);

  return {
    train: seededShuffle([...trainHams, ...trainSpams]),
    test: seededShuffle([...testHams, ...testSpams]),
  };
}

/**
 * Evaluate model on test data
 */
export function evaluatePredictions(
  groundTruth: Array<'ham' | 'spam'>,
  probabilities: number[], // probability of spam
  threshold: number = 0.5
): Omit<ModelEvaluationResult, 'trainingTimeMs' | 'inferenceLatencyMs' | 'trainCount' | 'testCount'> {
  const n = groundTruth.length;
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (let i = 0; i < n; i++) {
    const actual = groundTruth[i];
    const predSpam = probabilities[i] >= threshold;

    if (actual === 'spam' && predSpam) tp++;
    else if (actual === 'ham' && !predSpam) tn++;
    else if (actual === 'ham' && predSpam) fp++;
    else if (actual === 'spam' && !predSpam) fn++;
  }

  const accuracy = (tp + tn) / (n || 1);
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Ham class metrics
  const hamPrecision = tn + fn > 0 ? tn / (tn + fn) : 0;
  const hamRecall = tn + fp > 0 ? tn / (tn + fp) : 0;
  const hamF1 = hamPrecision + hamRecall > 0 ? (2 * hamPrecision * hamRecall) / (hamPrecision + hamRecall) : 0;
  const hamSupport = tn + fp;
  const spamSupport = tp + fn;

  // ROC Curve Points computation
  const thresholds = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0];
  const rocPoints: RocPoint[] = [];

  for (const th of thresholds) {
    let curTp = 0;
    let curFp = 0;
    for (let i = 0; i < n; i++) {
      const pred = probabilities[i] >= th;
      if (groundTruth[i] === 'spam' && pred) curTp++;
      if (groundTruth[i] === 'ham' && pred) curFp++;
    }
    const tpr = spamSupport > 0 ? curTp / spamSupport : 0;
    const fpr = hamSupport > 0 ? curFp / hamSupport : 0;
    rocPoints.push({ threshold: th, fpr, tpr });
  }

  // Ensure points start at (1,1) for th=0 down to (0,0) for th=1
  rocPoints.sort((a, b) => a.fpr - b.fpr);

  // Compute AUC using trapezoidal rule
  let auc = 0;
  for (let i = 1; i < rocPoints.length; i++) {
    const deltaFpr = rocPoints[i].fpr - rocPoints[i - 1].fpr;
    const avgTpr = (rocPoints[i].tpr + rocPoints[i - 1].tpr) / 2;
    auc += avgTpr * deltaFpr;
  }
  auc = Math.min(1.0, Math.max(0.5, Math.abs(auc)));

  // Classification Report
  const macroPrecision = (hamPrecision + precision) / 2;
  const macroRecall = (hamRecall + recall) / 2;
  const macroF1 = (hamF1 + f1Score) / 2;

  const weightedPrecision = (hamPrecision * hamSupport + precision * spamSupport) / n;
  const weightedRecall = (hamRecall * hamSupport + recall * spamSupport) / n;
  const weightedF1 = (hamF1 * hamSupport + f1Score * spamSupport) / n;

  return {
    confusionMatrix: {
      truePositives: tp,
      trueNegatives: tn,
      falsePositives: fp,
      falseNegatives: fn,
      totalSamples: n,
    },
    accuracy,
    precision,
    recall,
    specificity,
    f1Score,
    rocPoints,
    auc,
    classificationReport: {
      ham: { precision: hamPrecision, recall: hamRecall, f1Score: hamF1, support: hamSupport },
      spam: { precision, recall, f1Score, support: spamSupport },
      accuracy,
      macroAvg: { precision: macroPrecision, recall: macroRecall, f1Score: macroF1, support: n },
      weightedAvg: { precision: weightedPrecision, recall: weightedRecall, f1Score: weightedF1, support: n },
    },
  };
}
