/**
 * Frontend API Client for Backend MongoDB Atlas Integration
 * Database: realtime_spam_detection
 * Collections: emails, model_metrics, sync_state, predictions, feedback
 */

export interface DbStatus {
  connected: boolean;
  database_name: string;
  mode: string;
  has_custom_uri: boolean;
  masked_uri: string;
}

export interface EmailRecord {
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

export interface EmailStats {
  total_emails: number;
  spam_count: number;
  legitimate_count: number;
  spam_percentage: number;
  latest_timestamp: string | null;
  last_sync_timestamp: string;
  monitoring_active: boolean;
}

export interface SyncState {
  mailbox_id: string;
  last_history_id: string | null;
  last_sync_timestamp: string;
  monitoring_active: boolean;
  sync_status: 'idle' | 'syncing' | 'active' | 'error';
  last_error: string | null;
}

export interface PredictionRecord {
  message_id: string;
  message: string;
  predicted_label: 'spam' | 'legitimate';
  spam_probability: number;
  model_name: string;
  created_at: string;
  actual_label: string | null;
}

export interface DashboardStats {
  total_messages: number;
  spam_count: number;
  legitimate_count: number;
  spam_percentage: number;
  latest_timestamp: string | null;
}

export interface FeedbackRecord {
  feedback_id: string;
  prediction_id: string;
  user_feedback: string;
  correct_label: string | null;
  submitted_at: string;
  verified: boolean;
}

export interface ModelMetricsRecord {
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

export interface ProjectFileItem {
  name: string;
  path: string;
  description: string;
}

export const api = {
  async getDbStatus(): Promise<DbStatus> {
    const res = await fetch('/api/db/status');
    return res.json();
  },

  async connectDb(uri: string): Promise<{ success: boolean; message: string; connected: boolean }> {
    const res = await fetch('/api/db/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri })
    });
    return res.json();
  },

  // Email API
  async getEmails(label?: 'spam' | 'legitimate', limit = 50, skip = 0): Promise<{ count: number; data: EmailRecord[] }> {
    const params = new URLSearchParams();
    if (label) params.set('label', label);
    params.set('limit', String(limit));
    params.set('skip', String(skip));
    const res = await fetch(`/api/emails?${params.toString()}`);
    return res.json();
  },

  async saveBatchEmails(payload: {
    emails: Array<{
      gmail_message_id: string;
      gmail_thread_id: string;
      sender_address: string;
      subject: string;
      snippet: string;
      received_timestamp: string;
      predicted_class: 'spam' | 'legitimate';
      spam_probability: number;
      model_name: string;
    }>;
    mailbox_id?: string;
  }): Promise<{ success: boolean; total_received: number; new_inserted: number; data: EmailRecord[] }> {
    const res = await fetch('/api/emails/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getEmailStats(): Promise<EmailStats> {
    const res = await fetch('/api/emails/stats');
    return res.json();
  },

  async clearEmails(authorized: boolean): Promise<{ success: boolean; deleted_count: number }> {
    const res = await fetch('/api/emails/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorized })
    });
    return res.json();
  },

  async getSyncState(): Promise<{ success: boolean; data: SyncState }> {
    const res = await fetch('/api/sync-state');
    return res.json();
  },

  async updateSyncState(state: Partial<SyncState>): Promise<{ success: boolean; data: SyncState }> {
    const res = await fetch('/api/sync-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    return res.json();
  },

  // Legacy/SMS and Manual Prediction endpoints
  async getPredictions(label?: 'spam' | 'legitimate', limit = 50, skip = 0): Promise<{ count: number; data: PredictionRecord[] }> {
    const params = new URLSearchParams();
    if (label) params.set('label', label);
    params.set('limit', String(limit));
    params.set('skip', String(skip));
    const res = await fetch(`/api/predictions?${params.toString()}`);
    return res.json();
  },

  async savePrediction(prediction: {
    message: string;
    predicted_label: 'spam' | 'legitimate';
    spam_probability: number;
    model_name: string;
  }): Promise<{ success: boolean; message: string; data: PredictionRecord }> {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prediction)
    });
    return res.json();
  },

  async clearPredictions(authorized: boolean): Promise<{ success: boolean; deleted_count: number }> {
    const res = await fetch('/api/predictions/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorized })
    });
    return res.json();
  },

  async submitFeedback(feedback: {
    prediction_id: string;
    user_feedback: string;
    correct_label?: string | null;
  }): Promise<{ success: boolean; message: string; data?: FeedbackRecord; error?: string }> {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    });
    return res.json();
  },

  async getFeedback(): Promise<{ success: boolean; data: FeedbackRecord[] }> {
    const res = await fetch('/api/feedback');
    return res.json();
  },

  // Metrics API
  async getMetrics(): Promise<{ success: boolean; data: ModelMetricsRecord }> {
    const res = await fetch('/api/metrics');
    return res.json();
  },

  async saveMetrics(metrics: Partial<ModelMetricsRecord>): Promise<{ success: boolean; data: ModelMetricsRecord }> {
    const res = await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics)
    });
    return res.json();
  },

  // Files API
  async getProjectFiles(): Promise<{ files: ProjectFileItem[] }> {
    const res = await fetch('/api/project-files');
    return res.json();
  },

  async getProjectFileContent(filePath: string): Promise<{ path: string; content: string }> {
    const res = await fetch(`/api/project-file-content?path=${encodeURIComponent(filePath)}`);
    return res.json();
  }
};
