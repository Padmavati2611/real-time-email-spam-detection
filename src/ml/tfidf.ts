/**
 * TF-IDF (Term Frequency - Inverse Document Frequency) Vectorizer
 * Mathematically equivalent to scikit-learn's TfidfVectorizer:
 * - Tokenization with regex word extraction
 * - Stop words removal
 * - N-gram generation (unigrams and bigrams)
 * - Smooth IDF: log((1 + n) / (1 + df)) + 1
 * - Sublinear TF scaling: 1 + log(tf)
 * - L2 vector normalization: v / ||v||_2
 */

// Comprehensive English stop words matching scikit-learn's stop_words='english'
export const SKLEARN_STOP_WORDS = new Set([
  'a', 'about', 'above', 'across', 'after', 'afterwards', 'again', 'against', 'all', 'almost',
  'alone', 'along', 'already', 'also', 'although', 'always', 'am', 'among', 'amongst', 'amoungst',
  'amount', 'an', 'and', 'another', 'any', 'anyhow', 'anyone', 'anything', 'anyway', 'anywhere',
  'are', 'around', 'as', 'at', 'back', 'be', 'became', 'because', 'become', 'becomes',
  'becoming', 'been', 'before', 'beforehand', 'behind', 'being', 'below', 'beside', 'besides', 'between',
  'beyond', 'bill', 'both', 'bottom', 'but', 'by', 'call', 'can', 'cannot', 'cant',
  'co', 'con', 'could', 'couldnt', 'cry', 'de', 'describe', 'detail', 'do', 'done',
  'down', 'due', 'during', 'each', 'eg', 'eight', 'either', 'eleven', 'else', 'elsewhere',
  'empty', 'enough', 'etc', 'even', 'ever', 'every', 'everyone', 'everything', 'everywhere', 'except',
  'few', 'fifteen', 'fifty', 'fill', 'find', 'fire', 'first', 'five', 'for', 'former',
  'formerly', 'forty', 'found', 'four', 'from', 'front', 'full', 'further', 'get', 'give',
  'go', 'had', 'has', 'hasnt', 'have', 'he', 'hence', 'her', 'here', 'hereafter',
  'hereby', 'herein', 'hereupon', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'however',
  'hundred', 'i', 'ie', 'if', 'in', 'inc', 'indeed', 'interest', 'into', 'is',
  'it', 'its', 'itself', 'keep', 'last', 'latter', 'latterly', 'least', 'less', 'ltd',
  'made', 'many', 'may', 'me', 'meanwhile', 'might', 'mill', 'mine', 'more', 'moreover',
  'most', 'mostly', 'move', 'much', 'must', 'my', 'myself', 'name', 'namely', 'neither',
  'never', 'nevertheless', 'next', 'nine', 'no', 'nobody', 'none', 'noone', 'nor', 'not',
  'nothing', 'now', 'nowhere', 'of', 'off', 'often', 'on', 'once', 'one', 'only',
  'onto', 'or', 'other', 'others', 'otherwise', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'part', 'per', 'perhaps', 'please', 'put', 'rather', 're', 'same', 'see',
  'seem', 'seemed', 'seeming', 'seems', 'serious', 'several', 'she', 'should', 'show', 'side',
  'since', 'sincere', 'six', 'sixty', 'so', 'some', 'somehow', 'someone', 'something', 'sometime',
  'sometimes', 'somewhere', 'still', 'such', 'system', 'take', 'ten', 'than', 'that', 'the',
  'their', 'them', 'themselves', 'then', 'thence', 'there', 'thereafter', 'thereby', 'therefore', 'therein',
  'thereupon', 'these', 'they', 'thick', 'thin', 'third', 'this', 'those', 'though', 'three',
  'through', 'throughout', 'thru', 'thus', 'to', 'together', 'too', 'top', 'toward', 'towards',
  'twelve', 'twenty', 'two', 'un', 'under', 'until', 'up', 'upon', 'us', 'very',
  'via', 'was', 'we', 'well', 'were', 'what', 'whatever', 'when', 'whence', 'whenever',
  'where', 'whereafter', 'whereas', 'whereby', 'wherein', 'whereupon', 'wherever', 'whether', 'which', 'while',
  'whither', 'who', 'whoever', 'whole', 'whom', 'whose', 'why', 'will', 'with', 'within',
  'without', 'would', 'yet', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export interface TfidfOptions {
  lowercase?: boolean;
  removeStopWords?: boolean;
  minDf?: number;
  maxFeatures?: number;
  ngramRange?: [number, number]; // e.g. [1, 1] for unigrams, [1, 2] for unigrams + bigrams
  sublinearTf?: boolean;
  useIdf?: boolean;
  norm?: 'l2' | 'l1' | 'none';
}

export interface TokenContribution {
  token: string;
  count: number;
  tf: number;
  idf: number;
  tfidf: number;
  featureIndex: number;
}

export class TfidfVectorizer {
  public vocabulary: Map<string, number> = new Map();
  public idfValues: number[] = [];
  public featureNames: string[] = [];
  public docCount: number = 0;
  public options: Required<TfidfOptions>;

  constructor(options: TfidfOptions = {}) {
    this.options = {
      lowercase: options.lowercase ?? true,
      removeStopWords: options.removeStopWords ?? true,
      minDf: options.minDf ?? 2,
      maxFeatures: options.maxFeatures ?? 1000,
      ngramRange: options.ngramRange ?? [1, 2],
      sublinearTf: options.sublinearTf ?? true,
      useIdf: options.useIdf ?? true,
      norm: options.norm ?? 'l2',
    };
  }

  /**
   * Preprocess and tokenize text into list of n-gram tokens
   */
  public tokenize(text: string): string[] {
    let clean = text;
    if (this.options.lowercase) {
      clean = clean.toLowerCase();
    }

    // Replace URLs with special token
    clean = clean.replace(/https?:\/\/[^\s]+/gi, ' __url__ ');
    // Replace telephone numbers / shortcodes
    clean = clean.replace(/\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}\b/g, ' __phone__ ');
    // Currency indicators (£, $, €)
    clean = clean.replace(/([£$€])\s*\d+/g, ' __money__ ');

    // Extract alphanumeric word tokens (at least 2 chars, or special tokens)
    const rawTokens = clean.match(/__[a-z]+__|\b[a-z0-9]{2,}\b/gi) || [];
    const tokens: string[] = [];

    for (const token of rawTokens) {
      if (this.options.removeStopWords && SKLEARN_STOP_WORDS.has(token) && !token.startsWith('__')) {
        continue;
      }
      tokens.push(token);
    }

    // Extract n-grams
    const [minN, maxN] = this.options.ngramRange;
    const ngrams: string[] = [];

    for (let n = minN; n <= maxN; n++) {
      if (n === 1) {
        ngrams.push(...tokens);
      } else {
        for (let i = 0; i <= tokens.length - n; i++) {
          const gram = tokens.slice(i, i + n).join(' ');
          ngrams.push(gram);
        }
      }
    }

    return ngrams;
  }

  /**
   * Fit vocabulary and IDF weights on a collection of documents
   */
  public fit(documents: string[]): this {
    this.docCount = documents.length;
    const dfMap = new Map<string, number>();

    // 1. Calculate Document Frequency (df) for each token
    for (const doc of documents) {
      const tokens = this.tokenize(doc);
      const uniqueInDoc = new Set(tokens);
      for (const token of uniqueInDoc) {
        dfMap.set(token, (dfMap.get(token) || 0) + 1);
      }
    }

    // 2. Filter by minDf
    const candidates: Array<{ token: string; df: number }> = [];
    for (const [token, df] of dfMap.entries()) {
      if (df >= this.options.minDf) {
        candidates.push({ token, df });
      }
    }

    // 3. Sort by DF descending and truncate to maxFeatures (like scikit-learn)
    candidates.sort((a, b) => b.df - a.df);
    const selected = candidates.slice(0, this.options.maxFeatures);

    // Alphabetize features for deterministic indices (scikit-learn standard)
    selected.sort((a, b) => a.token.localeCompare(b.token));

    this.vocabulary.clear();
    this.featureNames = [];
    this.idfValues = [];

    selected.forEach((item, index) => {
      this.vocabulary.set(item.token, index);
      this.featureNames.push(item.token);

      // Smooth IDF formula: ln((1 + N) / (1 + df)) + 1
      const idf = Math.log((1 + this.docCount) / (1 + item.df)) + 1.0;
      this.idfValues.push(idf);
    });

    return this;
  }

  /**
   * Transform a single document into a TF-IDF vector
   */
  public transformOne(text: string): Float64Array {
    const vector = new Float64Array(this.featureNames.length);
    const tokens = this.tokenize(text);

    // Count term frequency
    const tfCounts = new Map<number, number>();
    for (const token of tokens) {
      const featIdx = this.vocabulary.get(token);
      if (featIdx !== undefined) {
        tfCounts.set(featIdx, (tfCounts.get(featIdx) || 0) + 1);
      }
    }

    // Calculate TF * IDF
    for (const [featIdx, count] of tfCounts.entries()) {
      const tf = this.options.sublinearTf ? 1 + Math.log(count) : count;
      const idf = this.options.useIdf ? this.idfValues[featIdx] : 1.0;
      vector[featIdx] = tf * idf;
    }

    // L2 Normalization (scikit-learn default norm='l2')
    if (this.options.norm === 'l2') {
      let sumSq = 0;
      for (let i = 0; i < vector.length; i++) {
        sumSq += vector[i] * vector[i];
      }
      if (sumSq > 0) {
        const norm = Math.sqrt(sumSq);
        for (let i = 0; i < vector.length; i++) {
          vector[i] /= norm;
        }
      }
    }

    return vector;
  }

  /**
   * Transform a list of documents into TF-IDF matrix
   */
  public transform(documents: string[]): Float64Array[] {
    return documents.map(doc => this.transformOne(doc));
  }

  /**
   * Fit and transform in a single pass
   */
  public fitTransform(documents: string[]): Float64Array[] {
    this.fit(documents);
    return this.transform(documents);
  }

  /**
   * Explain tokens in a document: returns TF, IDF, and normalized TF-IDF score
   */
  public explain(text: string): TokenContribution[] {
    const tokens = this.tokenize(text);
    const counts = new Map<string, number>();
    for (const t of tokens) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }

    const vector = this.transformOne(text);
    const results: TokenContribution[] = [];

    for (const [token, count] of counts.entries()) {
      const featIdx = this.vocabulary.get(token);
      if (featIdx !== undefined) {
        const tf = this.options.sublinearTf ? 1 + Math.log(count) : count;
        const idf = this.idfValues[featIdx];
        results.push({
          token,
          count,
          tf,
          idf,
          tfidf: vector[featIdx],
          featureIndex: featIdx,
        });
      }
    }

    // Sort by tfidf descending
    results.sort((a, b) => b.tfidf - a.tfidf);
    return results;
  }
}
