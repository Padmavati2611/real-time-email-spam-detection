/**
 * Full-Stack Express Server with MongoDB Atlas Integration & Vite Middlewares
 * Database: realtime_spam_detection
 * Collections: emails, model_metrics, sync_state
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Database Document Schema Definitions
export interface EmailRecordDoc {
  id: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  sender_address: string;
  subject: string;
  snippet: string;
  received_timestamp: string;
  processing_timestamp: string;
  predicted_class: 'spam' | 'legitimate';
  spam_probability: number;
  model_name: string;
  model_version: string;
  processing_status: 'processed';
  actual_label: string | null;
}

export interface SyncStateDoc {
  mailbox_id: string;
  last_history_id: string | null;
  last_sync_timestamp: string;
  monitoring_active: boolean;
  sync_status: 'idle' | 'syncing' | 'active' | 'error';
  last_error: string | null;
}

export interface ModelMetricsDoc {
  model_name: string;
  dataset_name: string;
  model_version: string;
  accuracy: number;
  spam_precision: number;
  spam_recall: number;
  spam_f1_score: number;
  roc_auc: number;
  confusion_matrix: {
    true_negatives: number;
    false_positives: number;
    false_negatives: number;
    true_positives: number;
    matrix_array: number[][];
  };
  training_date: string;
  num_train_messages: number;
  num_test_messages: number;
}

// In-memory persistent fallback state
let memoryEmails: EmailRecordDoc[] = [];

let memorySyncState: SyncStateDoc = {
  mailbox_id: "Unauthenticated",
  last_history_id: null,
  last_sync_timestamp: new Date().toISOString(),
  monitoring_active: false,
  sync_status: 'idle',
  last_error: null
};

let memoryMetrics: ModelMetricsDoc = {
  model_name: "Multinomial Naive Bayes",
  dataset_name: "UCI SMS Spam Collection",
  model_version: "1.0.0",
  accuracy: 0.9845,
  spam_precision: 0.9720,
  spam_recall: 0.9310,
  spam_f1_score: 0.9510,
  roc_auc: 0.9912,
  confusion_matrix: {
    true_negatives: 965,
    false_positives: 4,
    false_negatives: 13,
    true_positives: 133,
    matrix_array: [[965, 4], [13, 133]]
  },
  training_date: new Date().toISOString(),
  num_train_messages: 4180,
  num_test_messages: 1115
};

// MongoDB Client
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isMongoConnected = false;
let mongoUri = process.env.MONGODB_URI || "";
const DB_NAME = "realtime_spam_detection";

async function initMongo(uri: string): Promise<{ success: boolean; message: string }> {
  if (!uri || !uri.trim()) {
    isMongoConnected = false;
    return { success: false, message: "No MongoDB URI provided. Using resilient local document store." };
  }

  try {
    if (mongoClient) {
      await mongoClient.close();
    }
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db(DB_NAME);
    // Verify connection
    await mongoDb.command({ ping: 1 });
    isMongoConnected = true;
    mongoUri = uri;

    // Ensure collections and unique index on gmail_message_id for deduplication
    const emailCol = mongoDb.collection('emails');
    await emailCol.createIndex({ gmail_message_id: 1 }, { unique: true });
    await emailCol.createIndex({ received_timestamp: -1 });
    await emailCol.createIndex({ predicted_class: 1 });

    const syncCol = mongoDb.collection('sync_state');
    await syncCol.createIndex({ mailbox_id: 1 }, { unique: true });

    return { success: true, message: `Connected to MongoDB Atlas database '${DB_NAME}'` };
  } catch (err: any) {
    isMongoConnected = false;
    return { success: false, message: `MongoDB Atlas connection error: ${err.message}` };
  }
}

if (mongoUri) {
  initMongo(mongoUri).then(res => console.log("[MongoDB]", res.message));
}

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Database Connection Status
app.get('/api/db/status', (req: Request, res: Response) => {
  res.json({
    connected: isMongoConnected,
    database_name: DB_NAME,
    mode: isMongoConnected ? "MongoDB Atlas (Live)" : "Local Persistent Document Store",
    has_custom_uri: Boolean(mongoUri),
    masked_uri: mongoUri ? mongoUri.replace(/:([^@]+)@/, ':****@') : ""
  });
});

app.post('/api/db/connect', async (req: Request, res: Response) => {
  const { uri } = req.body;
  const result = await initMongo(uri);
  res.json({
    ...result,
    connected: isMongoConnected,
    database_name: DB_NAME
  });
});

// 2. Emails Collection API
app.get('/api/emails', async (req: Request, res: Response) => {
  const { label, limit = 50, skip = 0 } = req.query;
  const maxLimit = Math.min(200, parseInt(limit as string) || 50);
  const skipCount = parseInt(skip as string) || 0;

  if (isMongoConnected && mongoDb) {
    try {
      const query: any = {};
      if (label && (label === 'spam' || label === 'legitimate')) {
        query.predicted_class = label;
      }
      const records = await mongoDb.collection('emails')
        .find(query, { projection: { _id: 0 } })
        .sort({ received_timestamp: -1 })
        .skip(skipCount)
        .limit(maxLimit)
        .toArray();
      return res.json({ success: true, count: records.length, data: records });
    } catch (err: any) {
      console.error("[MongoDB error]", err);
    }
  }

  // Memory fallback
  let filtered = [...memoryEmails];
  if (label && (label === 'spam' || label === 'legitimate')) {
    filtered = filtered.filter(e => e.predicted_class === label);
  }
  filtered.sort((a, b) => new Date(b.received_timestamp).getTime() - new Date(a.received_timestamp).getTime());
  const paginated = filtered.slice(skipCount, skipCount + maxLimit);

  res.json({
    success: true,
    count: paginated.length,
    data: paginated
  });
});

// Batch email insertion with deduplication on gmail_message_id
app.post('/api/emails/batch', async (req: Request, res: Response) => {
  const { emails, mailbox_id } = req.body;

  if (!Array.isArray(emails)) {
    return res.status(400).json({ success: false, error: "Emails array is required." });
  }

  let newItemsCount = 0;
  const insertedDocs: EmailRecordDoc[] = [];

  for (const item of emails) {
    const doc: EmailRecordDoc = {
      id: crypto.randomUUID(),
      gmail_message_id: item.gmail_message_id,
      gmail_thread_id: item.gmail_thread_id,
      sender_address: item.sender_address,
      subject: item.subject,
      snippet: item.snippet || '',
      received_timestamp: item.received_timestamp,
      processing_timestamp: new Date().toISOString(),
      predicted_class: item.predicted_class,
      spam_probability: Math.round(Number(item.spam_probability) * 10000) / 10000,
      model_name: item.model_name || "Multinomial Naive Bayes",
      model_version: "1.0.0",
      processing_status: 'processed',
      actual_label: null
    };

    if (isMongoConnected && mongoDb) {
      try {
        // Attempt insert; ignore duplicate key error on gmail_message_id
        await mongoDb.collection('emails').insertOne({ ...doc });
        newItemsCount++;
        insertedDocs.push(doc);
      } catch (err: any) {
        if (err.code === 11000) {
          // Already exists in database (deduplication)
        } else {
          console.error("[MongoDB insert error]", err);
        }
      }
    } else {
      // Memory deduplication check
      const exists = memoryEmails.some(e => e.gmail_message_id === doc.gmail_message_id);
      if (!exists) {
        memoryEmails.unshift(doc);
        newItemsCount++;
        insertedDocs.push(doc);
      }
    }
  }

  // Update sync state
  if (mailbox_id) {
    memorySyncState.mailbox_id = mailbox_id;
    memorySyncState.last_sync_timestamp = new Date().toISOString();
    if (isMongoConnected && mongoDb) {
      await mongoDb.collection('sync_state').updateOne(
        { mailbox_id },
        {
          $set: {
            mailbox_id,
            last_sync_timestamp: new Date().toISOString(),
            sync_status: 'idle',
            last_error: null
          }
        },
        { upsert: true }
      );
    }
  }

  res.json({
    success: true,
    total_received: emails.length,
    new_inserted: newItemsCount,
    data: insertedDocs
  });
});

// Real-time statistics aggregation from `emails` collection
app.get('/api/emails/stats', async (req: Request, res: Response) => {
  if (isMongoConnected && mongoDb) {
    try {
      const col = mongoDb.collection('emails');
      const total = await col.countDocuments({});
      const spam = await col.countDocuments({ predicted_class: "spam" });
      const legit = await col.countDocuments({ predicted_class: "legitimate" });
      const latest = await col.findOne({}, { sort: { received_timestamp: -1 } });

      return res.json({
        total_emails: total,
        spam_count: spam,
        legitimate_count: legit,
        spam_percentage: total > 0 ? Math.round((spam / total) * 1000) / 10 : 0,
        latest_timestamp: latest?.received_timestamp || null,
        last_sync_timestamp: memorySyncState.last_sync_timestamp,
        monitoring_active: memorySyncState.monitoring_active
      });
    } catch (err: any) {
      console.error("[MongoDB stats error]", err);
    }
  }

  const total = memoryEmails.length;
  const spam = memoryEmails.filter(e => e.predicted_class === 'spam').length;
  const legit = memoryEmails.filter(e => e.predicted_class === 'legitimate').length;
  const latest = memoryEmails[0]?.received_timestamp || null;

  res.json({
    total_emails: total,
    spam_count: spam,
    legitimate_count: legit,
    spam_percentage: total > 0 ? Math.round((spam / total) * 1000) / 10 : 0,
    latest_timestamp: latest,
    last_sync_timestamp: memorySyncState.last_sync_timestamp,
    monitoring_active: memorySyncState.monitoring_active
  });
});

// Clear emails
app.post('/api/emails/clear', async (req: Request, res: Response) => {
  const { authorized } = req.body;
  if (!authorized) {
    return res.status(403).json({ success: false, error: "Deletion authorization required." });
  }

  if (isMongoConnected && mongoDb) {
    try {
      const result = await mongoDb.collection('emails').deleteMany({});
      return res.json({ success: true, deleted_count: result.deletedCount });
    } catch (err: any) {
      console.error("[MongoDB clear error]", err);
    }
  }

  const count = memoryEmails.length;
  memoryEmails = [];
  res.json({ success: true, deleted_count: count });
});

// 3. Sync State API
app.get('/api/sync-state', (req: Request, res: Response) => {
  res.json({ success: true, data: memorySyncState });
});

app.post('/api/sync-state', (req: Request, res: Response) => {
  const { mailbox_id, monitoring_active, sync_status, last_error } = req.body;
  if (mailbox_id !== undefined) memorySyncState.mailbox_id = mailbox_id;
  if (monitoring_active !== undefined) memorySyncState.monitoring_active = monitoring_active;
  if (sync_status !== undefined) memorySyncState.sync_status = sync_status;
  if (last_error !== undefined) memorySyncState.last_error = last_error;
  memorySyncState.last_sync_timestamp = new Date().toISOString();

  res.json({ success: true, data: memorySyncState });
});

// 4. Model Metrics API
app.get('/api/metrics', async (req: Request, res: Response) => {
  if (isMongoConnected && mongoDb) {
    try {
      const record = await mongoDb.collection('model_metrics')
        .findOne({}, { projection: { _id: 0 }, sort: { training_date: -1 } });
      if (record) return res.json({ success: true, data: record });
    } catch (err) {
      console.error(err);
    }
  }
  res.json({ success: true, data: memoryMetrics });
});

app.post('/api/metrics', async (req: Request, res: Response) => {
  const newMetrics: ModelMetricsDoc = {
    ...req.body,
    training_date: new Date().toISOString()
  };

  if (isMongoConnected && mongoDb) {
    await mongoDb.collection('model_metrics').insertOne({ ...newMetrics });
  } else {
    memoryMetrics = newMetrics;
  }

  res.json({ success: true, data: newMetrics });
});

// 5. Python Project Code Exporter
const PYTHON_PROJECT_DIR = path.resolve(__dirname, 'realtime-email-spam-detection');

app.get('/api/project-files', (req: Request, res: Response) => {
  const fileList = [
    { name: "app.py", path: "app.py", description: "Streamlit Dashboard (4-page Real-Time App)" },
    { name: "backend.py", path: "backend.py", description: "FastAPI Backend for Pub/Sub Webhooks & Sync" },
    { name: "train_model.py", path: "train_model.py", description: "Scikit-learn Model Training Pipeline" },
    { name: "database.py", path: "database.py", description: "MongoDB Atlas Connection & Collections Manager" },
    { name: "gmail_service.py", path: "gmail_service.py", description: "Gmail API Client & OAuth Integration" },
    { name: "email_processor.py", path: "email_processor.py", description: "MIME Parser, Decoders & Safety Guard" },
    { name: "config.py", path: "config.py", description: "Environment Variables & App Settings" },
    { name: "requirements.txt", path: "requirements.txt", description: "Python Dependencies" },
    { name: ".env.example", path: ".env.example", description: "OAuth & MongoDB Environment Template" },
    { name: "README.md", path: "README.md", description: "Windows VS Code Setup & Full Deployment Guide" },
    { name: "src/predictor.py", path: "src/predictor.py", description: "Inference Engine with Joblib Model" },
    { name: "src/monitoring.py", path: "src/monitoring.py", description: "Automatic Background Email Polling / Watch" },
    { name: "src/security.py", path: "src/security.py", description: "Safety Sanitization & Token Protection" },
    { name: "tests/test_predictor.py", path: "tests/test_predictor.py", description: "Unit Tests for ML Inference" },
    { name: "tests/test_email_parser.py", path: "tests/test_email_parser.py", description: "Unit Tests for MIME Parsing & Encodings" },
    { name: "tests/test_database.py", path: "tests/test_database.py", description: "Unit Tests for MongoDB Operations" },
    { name: "tests/test_deduplication.py", path: "tests/test_deduplication.py", description: "Unit Tests for Gmail Message Deduplication" }
  ];

  res.json({ files: fileList });
});

app.get('/api/project-file-content', (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath || filePath.includes('..')) {
    return res.status(400).json({ error: "Invalid file path." });
  }

  const fullPath = path.join(PYTHON_PROJECT_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "File not found." });
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  res.json({ path: filePath, content });
});

// ============================================================================
// VITE DEV SERVER INTEGRATION
// ============================================================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Real-Time Gmail Spam Detection Applet listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
