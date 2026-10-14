/**
 * Machine Learning Pipeline Engine
 * Manages dataset, vectorizer, Naive Bayes & Logistic Regression models,
 * live training, inference, and scikit-learn export.
 */

import { INITIAL_SMS_DATASET, SMSMessage } from './smsDataset';
import { TfidfVectorizer, TfidfOptions } from './tfidf';
import { MultinomialNB, LogisticRegression, PredictionResult } from './models';
import { stratifiedTrainTestSplit, evaluatePredictions, ModelEvaluationResult } from './evaluation';

export interface PipelineConfig {
  testRatio: number;
  maxFeatures: number;
  ngramRange: [number, number];
  sublinearTf: boolean;
  minDf: number;
  naiveBayesAlpha: number;
  logisticRegressionC: number;
  decisionThreshold: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  testRatio: 0.25,
  maxFeatures: 800,
  ngramRange: [1, 2],
  sublinearTf: true,
  minDf: 1,
  naiveBayesAlpha: 1.0,
  logisticRegressionC: 1.0,
  decisionThreshold: 0.5,
};

export class MLEngine {
  public dataset: SMSMessage[] = [...INITIAL_SMS_DATASET];
  public config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG };

  public vectorizer: TfidfVectorizer = new TfidfVectorizer();
  public nbModel: MultinomialNB = new MultinomialNB();
  public lrModel: LogisticRegression = new LogisticRegression();

  public nbEvaluation: ModelEvaluationResult | null = null;
  public lrEvaluation: ModelEvaluationResult | null = null;

  public isTrained: boolean = false;
  public trainSet: SMSMessage[] = [];
  public testSet: SMSMessage[] = [];

  constructor(customConfig?: Partial<PipelineConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    this.train();
  }

  public updateConfig(newConfig: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.train();
  }

  public train(): void {
    const startTime = performance.now();

    // 1. Stratified split
    const split = stratifiedTrainTestSplit(this.dataset, this.config.testRatio, 42);
    this.trainSet = split.train;
    this.testSet = split.test;

    // 2. Configure & Fit TF-IDF Vectorizer
    const tfidfOptions: TfidfOptions = {
      maxFeatures: this.config.maxFeatures,
      ngramRange: this.config.ngramRange,
      sublinearTf: this.config.sublinearTf,
      minDf: this.config.minDf,
      lowercase: true,
      removeStopWords: true,
    };
    this.vectorizer = new TfidfVectorizer(tfidfOptions);
    const trainTexts = this.trainSet.map(d => d.text);
    const trainX = this.vectorizer.fitTransform(trainTexts);
    const trainY = this.trainSet.map(d => (d.label === 'spam' ? 1 : 0));

    // 3. Train Naive Bayes
    const nbTrainStart = performance.now();
    this.nbModel = new MultinomialNB({ alpha: this.config.naiveBayesAlpha });
    this.nbModel.fit(trainX, trainY, this.vectorizer.featureNames);
    const nbTrainTime = performance.now() - nbTrainStart;

    // 4. Train Logistic Regression
    const lrTrainStart = performance.now();
    this.lrModel = new LogisticRegression({ C: this.config.logisticRegressionC, maxEpochs: 150 });
    this.lrModel.fit(trainX, trainY, this.vectorizer.featureNames);
    const lrTrainTime = performance.now() - lrTrainStart;

    // 5. Evaluate on Test Set
    const testTexts = this.testSet.map(d => d.text);
    const testGroundTruth = this.testSet.map(d => d.label);

    // Transform test data using fitted vectorizer
    const testX = this.vectorizer.transform(testTexts);

    // NB Evaluation
    const nbInferStart = performance.now();
    const nbProbs = testX.map(x => this.nbModel.predictProbabilities(x, this.config.decisionThreshold).spamProbability);
    const nbInferLatency = (performance.now() - nbInferStart) / (testX.length || 1);
    const nbEvalRaw = evaluatePredictions(testGroundTruth, nbProbs, this.config.decisionThreshold);
    this.nbEvaluation = {
      ...nbEvalRaw,
      trainingTimeMs: Math.round(nbTrainTime * 10) / 10,
      inferenceLatencyMs: Math.round(nbInferLatency * 100) / 100,
      trainCount: this.trainSet.length,
      testCount: this.testSet.length,
    };

    // LR Evaluation
    const lrInferStart = performance.now();
    const lrProbs = testX.map(x => this.lrModel.predictProbabilities(x, this.config.decisionThreshold).spamProbability);
    const lrInferLatency = (performance.now() - lrInferStart) / (testX.length || 1);
    const lrEvalRaw = evaluatePredictions(testGroundTruth, lrProbs, this.config.decisionThreshold);
    this.lrEvaluation = {
      ...lrEvalRaw,
      trainingTimeMs: Math.round(lrTrainTime * 10) / 10,
      inferenceLatencyMs: Math.round(lrInferLatency * 100) / 100,
      trainCount: this.trainSet.length,
      testCount: this.testSet.length,
    };

    this.isTrained = true;
  }

  /**
   * Classify a single SMS message
   */
  public classify(text: string, modelType: 'nb' | 'lr' = 'nb', threshold?: number): PredictionResult {
    const activeThreshold = threshold ?? this.config.decisionThreshold;
    const x = this.vectorizer.transformOne(text);

    if (modelType === 'nb') {
      return this.nbModel.predictProbabilities(x, activeThreshold);
    } else {
      return this.lrModel.predictProbabilities(x, activeThreshold);
    }
  }

  /**
   * Add a custom SMS to dataset and retrain
   */
  public addMessage(message: Omit<SMSMessage, 'id'>): void {
    const newMsg: SMSMessage = {
      ...message,
      id: `custom-${Date.now()}`,
    };
    this.dataset.unshift(newMsg);
    this.train();
  }

  /**
   * Remove a message
   */
  public removeMessage(id: string): void {
    this.dataset = this.dataset.filter(d => d.id !== id);
    this.train();
  }

  /**
   * Reset dataset to initial
   */
  public resetDataset(): void {
    this.dataset = [...INITIAL_SMS_DATASET];
    this.train();
  }

  /**
   * Export dataset as CSV text
   */
  public exportDatasetCsv(): string {
    const rows = ['label,message'];
    for (const item of this.dataset) {
      // Escape quotes
      const escaped = `"${item.text.replace(/"/g, '""')}"`;
      rows.push(`${item.label},${escaped}`);
    }
    return rows.join('\n');
  }

  /**
   * Generate complete, runnable Python scikit-learn script
   */
  public generatePythonScript(): string {
    return `# ==============================================================================
# SPAM SMS DETECTION - SCIKIT-LEARN PIPELINE
# Train and evaluate Multinomial Naive Bayes & Logistic Regression with TF-IDF
# ==============================================================================

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score
import joblib

def main():
    print(">>> 1. Loading SMS Dataset...")
    # Load dataset (expected columns: 'label', 'message')
    df = pd.read_csv('sms_spam_dataset.csv')
    print(f"Total SMS samples: {len(df)}")
    print(df['label'].value_counts())

    # Map labels: ham -> 0, spam -> 1
    df['target'] = df['label'].map({'ham': 0, 'spam': 1})

    # Train / Test Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        df['message'],
        df['target'],
        test_size=${this.config.testRatio},
        random_state=42,
        stratify=df['target']
    )
    print(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")

    # >>> 2. TF-IDF Numerical Vectorization
    print("\\n>>> 2. Building TF-IDF Feature Matrix...")
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words='english',
        ngram_range=(${this.config.ngramRange[0]}, ${this.config.ngramRange[1]}),
        max_features=${this.config.maxFeatures},
        sublinear_tf=${this.config.sublinearTf ? 'True' : 'False'},
        min_df=${this.config.minDf}
    )

    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)
    print(f"Vocabulary size: {len(vectorizer.get_feature_names_out())} features")

    # >>> 3. Model 1: Multinomial Naive Bayes
    print("\\n=======================================================")
    print(">>> 3. Training Multinomial Naive Bayes (alpha=${this.config.naiveBayesAlpha})...")
    nb_model = MultinomialNB(alpha=${this.config.naiveBayesAlpha})
    nb_model.fit(X_train_tfidf, y_train)

    y_pred_nb = nb_model.predict(X_test_tfidf)
    y_prob_nb = nb_model.predict_proba(X_test_tfidf)[:, 1]

    print(f"Naive Bayes Accuracy: {accuracy_score(y_test, y_pred_nb):.4f}")
    print(f"Naive Bayes ROC-AUC:  {roc_auc_score(y_test, y_prob_nb):.4f}")
    print("\\nNaive Bayes Classification Report:")
    print(classification_report(y_test, y_pred_nb, target_names=['Ham', 'Spam']))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred_nb))

    # >>> 4. Model 2: Logistic Regression
    print("\\n=======================================================")
    print(">>> 4. Training Logistic Regression (C=${this.config.logisticRegressionC})...")
    lr_model = LogisticRegression(C=${this.config.logisticRegressionC}, max_iter=200, random_state=42)
    lr_model.fit(X_train_tfidf, y_train)

    y_pred_lr = lr_model.predict(X_test_tfidf)
    y_prob_lr = lr_model.predict_proba(X_test_tfidf)[:, 1]

    print(f"Logistic Regression Accuracy: {accuracy_score(y_test, y_pred_lr):.4f}")
    print(f"Logistic Regression ROC-AUC:  {roc_auc_score(y_test, y_prob_lr):.4f}")
    print("\\nLogistic Regression Classification Report:")
    print(classification_report(y_test, y_pred_lr, target_names=['Ham', 'Spam']))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred_lr))

    # >>> 5. Export Models with Joblib
    print("\\n>>> 5. Saving trained models and vectorizer...")
    joblib.dump(vectorizer, 'sms_tfidf_vectorizer.joblib')
    joblib.dump(nb_model, 'sms_naive_bayes.joblib')
    joblib.dump(lr_model, 'sms_logistic_regression.joblib')
    print("Models saved successfully!")

    # >>> 6. Live Inference Demonstration
    sample_messages = [
        "Congratulations! You won a $1,000 Walmart Gift Card. Click here to claim your prize.",
        "Hey, can you pick up some dinner on your way home tonight? Let me know.",
        "URGENT: Your bank account has been locked. Verify immediately at http://bank-auth.com",
        "Your doctor appointment is confirmed for tomorrow at 2:30 PM."
    ]

    print("\\n>>> 6. Live Inference Test:")
    sample_vecs = vectorizer.transform(sample_messages)
    preds = nb_model.predict(sample_vecs)
    probs = nb_model.predict_proba(sample_vecs)[:, 1]

    for msg, pred, prob in zip(sample_messages, preds, probs):
        label = "SPAM" if pred == 1 else "LEGITIMATE (HAM)"
        print(f"[{label} ({prob*100:.1f}%)] -> {msg[:60]}...")

if __name__ == '__main__':
    main()
`;
  }
}

// Singleton global instance
export const mlEngine = new MLEngine();
