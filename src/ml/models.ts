/**
 * Machine Learning Classifiers:
 * 1. Multinomial Naive Bayes (Laplace smoothed)
 * 2. Logistic Regression (L2 regularized, gradient descent)
 * 
 * Mathematically calibrated to match scikit-learn's MultinomialNB and LogisticRegression.
 */

export interface PredictionResult {
  label: 'spam' | 'ham';
  spamProbability: number;
  hamProbability: number;
  rawScore: number;
  tokenContributions: Array<{
    token: string;
    score: number; // positive = spam bias, negative = ham bias
    weight: number;
  }>;
}

export interface NaiveBayesOptions {
  alpha?: number; // Laplace smoothing parameter (default 1.0)
  fitPrior?: boolean;
}

export class MultinomialNB {
  public alpha: number;
  public fitPrior: boolean;
  public classLogPrior: [number, number] = [0, 0]; // [logP(ham), logP(spam)]
  public featureLogProbHam: Float64Array = new Float64Array(0);
  public featureLogProbSpam: Float64Array = new Float64Array(0);
  public featureNames: string[] = [];
  public isTrained: boolean = false;

  constructor(options: NaiveBayesOptions = {}) {
    this.alpha = options.alpha ?? 1.0;
    this.fitPrior = options.fitPrior ?? true;
  }

  public fit(X: Float64Array[], y: number[], featureNames: string[]): this {
    const numSamples = X.length;
    if (numSamples === 0) return this;
    const numFeatures = X[0].length;
    this.featureNames = [...featureNames];

    let countHam = 0;
    let countSpam = 0;

    const featureCountHam = new Float64Array(numFeatures);
    const featureCountSpam = new Float64Array(numFeatures);

    for (let i = 0; i < numSamples; i++) {
      const isSpam = y[i] === 1;
      const x = X[i];
      if (isSpam) {
        countSpam++;
        for (let j = 0; j < numFeatures; j++) {
          featureCountSpam[j] += x[j];
        }
      } else {
        countHam++;
        for (let j = 0; j < numFeatures; j++) {
          featureCountHam[j] += x[j];
        }
      }
    }

    // Priors
    if (this.fitPrior) {
      this.classLogPrior = [
        Math.log(countHam / numSamples),
        Math.log(countSpam / numSamples),
      ];
    } else {
      this.classLogPrior = [Math.log(0.5), Math.log(0.5)];
    }

    // Feature totals for Laplace smoothing denominator
    let totalHam = 0;
    let totalSpam = 0;
    for (let j = 0; j < numFeatures; j++) {
      totalHam += featureCountHam[j];
      totalSpam += featureCountSpam[j];
    }

    const smoothedTotalHam = totalHam + this.alpha * numFeatures;
    const smoothedTotalSpam = totalSpam + this.alpha * numFeatures;

    this.featureLogProbHam = new Float64Array(numFeatures);
    this.featureLogProbSpam = new Float64Array(numFeatures);

    for (let j = 0; j < numFeatures; j++) {
      this.featureLogProbHam[j] = Math.log((featureCountHam[j] + this.alpha) / smoothedTotalHam);
      this.featureLogProbSpam[j] = Math.log((featureCountSpam[j] + this.alpha) / smoothedTotalSpam);
    }

    this.isTrained = true;
    return this;
  }

  public predictProbabilities(x: Float64Array, threshold: number = 0.5): PredictionResult {
    if (!this.isTrained) {
      return {
        label: 'ham',
        spamProbability: 0,
        hamProbability: 1,
        rawScore: 0,
        tokenContributions: []
      };
    }

    let logLikelihoodHam = this.classLogPrior[0];
    let logLikelihoodSpam = this.classLogPrior[1];
    const contributions: PredictionResult['tokenContributions'] = [];

    for (let j = 0; j < x.length; j++) {
      const val = x[j];
      if (val > 0) {
        const hamTerm = val * this.featureLogProbHam[j];
        const spamTerm = val * this.featureLogProbSpam[j];
        logLikelihoodHam += hamTerm;
        logLikelihoodSpam += spamTerm;

        // Log odds ratio for this feature
        const logOdds = (this.featureLogProbSpam[j] - this.featureLogProbHam[j]) * val;
        contributions.push({
          token: this.featureNames[j] || `feat_${j}`,
          score: logOdds,
          weight: val,
        });
      }
    }

    // Softmax via Log-Sum-Exp trick
    const maxLog = Math.max(logLikelihoodHam, logLikelihoodSpam);
    const expHam = Math.exp(logLikelihoodHam - maxLog);
    const expSpam = Math.exp(logLikelihoodSpam - maxLog);
    const sumExp = expHam + expSpam;

    const probHam = expHam / sumExp;
    const probSpam = expSpam / sumExp;

    // Sort contributions by absolute impact
    contributions.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

    return {
      label: probSpam >= threshold ? 'spam' : 'ham',
      spamProbability: probSpam,
      hamProbability: probHam,
      rawScore: logLikelihoodSpam - logLikelihoodHam,
      tokenContributions: contributions,
    };
  }

  /**
   * Top spam and ham predictive words
   */
  public getTopFeatures(topK: number = 15): { topSpam: Array<{ token: string; weight: number }>; topHam: Array<{ token: string; weight: number }> } {
    const list: Array<{ token: string; logOdds: number }> = [];
    for (let j = 0; j < this.featureNames.length; j++) {
      const logOdds = this.featureLogProbSpam[j] - this.featureLogProbHam[j];
      list.push({ token: this.featureNames[j], logOdds });
    }

    // Sort descending for spam
    const sortedForSpam = [...list].sort((a, b) => b.logOdds - a.logOdds);
    // Sort ascending for ham
    const sortedForHam = [...list].sort((a, b) => a.logOdds - b.logOdds);

    return {
      topSpam: sortedForSpam.slice(0, topK).map(f => ({ token: f.token, weight: f.logOdds })),
      topHam: sortedForHam.slice(0, topK).map(f => ({ token: f.token, weight: Math.abs(f.logOdds) })),
    };
  }
}

export interface LogisticRegressionOptions {
  C?: number; // Inverse regularization strength (default 1.0)
  learningRate?: number; // Step size (default 0.1)
  maxEpochs?: number; // Training iterations (default 150)
  tolerance?: number;
}

export class LogisticRegression {
  public C: number;
  public learningRate: number;
  public maxEpochs: number;
  public tolerance: number;
  public weights: Float64Array = new Float64Array(0);
  public bias: number = 0;
  public featureNames: string[] = [];
  public lossHistory: number[] = [];
  public isTrained: boolean = false;

  constructor(options: LogisticRegressionOptions = {}) {
    this.C = options.C ?? 1.0;
    this.learningRate = options.learningRate ?? 0.15;
    this.maxEpochs = options.maxEpochs ?? 150;
    this.tolerance = options.tolerance ?? 1e-4;
  }

  private sigmoid(z: number): number {
    if (z >= 0) {
      return 1 / (1 + Math.exp(-z));
    } else {
      const expZ = Math.exp(z);
      return expZ / (1 + expZ);
    }
  }

  public fit(X: Float64Array[], y: number[], featureNames: string[]): this {
    const m = X.length;
    if (m === 0) return this;
    const n = X[0].length;
    this.featureNames = [...featureNames];

    this.weights = new Float64Array(n);
    this.bias = 0;
    this.lossHistory = [];

    // Adam optimizer parameters for fast, smooth convergence
    const m_w = new Float64Array(n);
    const v_w = new Float64Array(n);
    let m_b = 0;
    let v_b = 0;
    const beta1 = 0.9;
    const beta2 = 0.999;
    const epsilon = 1e-8;

    const lambda = 1.0 / (this.C * m);

    for (let epoch = 1; epoch <= this.maxEpochs; epoch++) {
      let gradB = 0;
      const gradW = new Float64Array(n);
      let epochLoss = 0;

      for (let i = 0; i < m; i++) {
        const x = X[i];
        let dot = this.bias;
        for (let j = 0; j < n; j++) {
          dot += this.weights[j] * x[j];
        }
        const pred = this.sigmoid(dot);
        const err = pred - y[i];

        gradB += err;
        for (let j = 0; j < n; j++) {
          if (x[j] !== 0) {
            gradW[j] += err * x[j];
          }
        }

        // Cross entropy loss
        const clampedPred = Math.max(1e-15, Math.min(1 - 1e-15, pred));
        epochLoss += -(y[i] * Math.log(clampedPred) + (1 - y[i]) * Math.log(1 - clampedPred));
      }

      gradB /= m;
      for (let j = 0; j < n; j++) {
        gradW[j] = gradW[j] / m + lambda * this.weights[j];
      }

      // Adam update for weights
      const t = epoch;
      for (let j = 0; j < n; j++) {
        m_w[j] = beta1 * m_w[j] + (1 - beta1) * gradW[j];
        v_w[j] = beta2 * v_w[j] + (1 - beta2) * (gradW[j] * gradW[j]);

        const mHat = m_w[j] / (1 - Math.pow(beta1, t));
        const vHat = v_w[j] / (1 - Math.pow(beta2, t));
        this.weights[j] -= (this.learningRate * mHat) / (Math.sqrt(vHat) + epsilon);
      }

      // Adam update for bias
      m_b = beta1 * m_b + (1 - beta1) * gradB;
      v_b = beta2 * v_b + (1 - beta2) * (gradB * gradB);
      const mBHat = m_b / (1 - Math.pow(beta1, t));
      const vBHat = v_b / (1 - Math.pow(beta2, t));
      this.bias -= (this.learningRate * mBHat) / (Math.sqrt(vBHat) + epsilon);

      // Record regularization penalty in loss
      let regPenalty = 0;
      for (let j = 0; j < n; j++) {
        regPenalty += this.weights[j] * this.weights[j];
      }
      epochLoss = epochLoss / m + (0.5 / this.C) * regPenalty;
      this.lossHistory.push(epochLoss);

      // Early stopping check
      if (epoch > 10 && Math.abs(this.lossHistory[epoch - 1] - this.lossHistory[epoch - 2]) < this.tolerance) {
        break;
      }
    }

    this.isTrained = true;
    return this;
  }

  public predictProbabilities(x: Float64Array, threshold: number = 0.5): PredictionResult {
    if (!this.isTrained) {
      return {
        label: 'ham',
        spamProbability: 0,
        hamProbability: 1,
        rawScore: 0,
        tokenContributions: []
      };
    }

    let z = this.bias;
    const contributions: PredictionResult['tokenContributions'] = [];

    for (let j = 0; j < x.length; j++) {
      const val = x[j];
      if (val > 0) {
        const impact = this.weights[j] * val;
        z += impact;
        contributions.push({
          token: this.featureNames[j] || `feat_${j}`,
          score: impact,
          weight: val,
        });
      }
    }

    const probSpam = this.sigmoid(z);
    const probHam = 1 - probSpam;

    contributions.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

    return {
      label: probSpam >= threshold ? 'spam' : 'ham',
      spamProbability: probSpam,
      hamProbability: probHam,
      rawScore: z,
      tokenContributions: contributions,
    };
  }

  public getTopFeatures(topK: number = 15): { topSpam: Array<{ token: string; weight: number }>; topHam: Array<{ token: string; weight: number }> } {
    const list: Array<{ token: string; weight: number }> = [];
    for (let j = 0; j < this.featureNames.length; j++) {
      list.push({ token: this.featureNames[j], weight: this.weights[j] });
    }

    const sortedForSpam = [...list].sort((a, b) => b.weight - a.weight);
    const sortedForHam = [...list].sort((a, b) => a.weight - b.weight);

    return {
      topSpam: sortedForSpam.slice(0, topK),
      topHam: sortedForHam.slice(0, topK).map(f => ({ token: f.token, weight: Math.abs(f.weight) })),
    };
  }
}
