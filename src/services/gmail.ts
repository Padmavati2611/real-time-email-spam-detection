/**
 * Gmail API Client Service
 * Interacts with Gmail REST API v1 using OAuth 2.0 Bearer access tokens.
 * Handles MIME multipart emails, base64url decoding, header parsing, and attachment safety.
 */

export interface ParsedEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  sender: string;
  subject: string;
  receivedAt: string;
  bodySnippet: string;
  fullCleanText: string;
  hasAttachments: boolean;
  historyId?: string;
}

export class GmailService {
  /**
   * Base64URL decoder supporting UTF-8 multi-byte characters
   */
  private static decodeBase64Url(data: string): string {
    try {
      // Replace URL-safe chars with standard base64 chars
      let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const raw = atob(base64);
      // Decode UTF-8 string properly
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
      }
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch (e) {
      return '';
    }
  }

  /**
   * Recursively extract plain text or HTML body from MIME parts
   */
  private static extractBody(payload: any): string {
    if (!payload) return '';

    // Direct body on payload
    if (payload.body && payload.body.data && (!payload.parts || payload.parts.length === 0)) {
      return this.decodeBase64Url(payload.body.data);
    }

    let textContent = '';
    let htmlContent = '';

    const traverseParts = (parts: any[]) => {
      if (!parts || !Array.isArray(parts)) return;

      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          textContent += this.decodeBase64Url(part.body.data) + '\n';
        } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
          htmlContent += this.decodeBase64Url(part.body.data) + '\n';
        } else if (part.parts && Array.isArray(part.parts)) {
          traverseParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      traverseParts(payload.parts);
    }

    if (textContent.trim()) {
      return textContent.trim();
    }

    // Fall back to stripping HTML if only HTML was present
    if (htmlContent.trim()) {
      return htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return '';
  }

  /**
   * Fetches latest incoming inbox messages from authorized Gmail account
   */
  public static async fetchRecentEmails(
    accessToken: string,
    maxResults: number = 15
  ): Promise<ParsedEmail[]> {
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`;

    const listRes = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!listRes.ok) {
      if (listRes.status === 401) {
        throw new Error('Gmail authorization has expired or is invalid. Please sign in again.');
      }
      const errJson = await listRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Gmail API Error: ${listRes.statusText}`);
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return [];
    }

    // Fetch full message details in parallel
    const emailPromises = messages.map(async (msgItem: { id: string; threadId: string }) => {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgItem.id}?format=full`;
      const msgRes = await fetch(msgUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!msgRes.ok) return null;
      const data = await msgRes.json();

      const headers = data.payload?.headers || [];
      const getHeader = (name: string) => {
        const found = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
        return found ? found.value : '';
      };

      const fromHeader = getHeader('From') || 'Unknown Sender';
      const subjectHeader = getHeader('Subject') || '(No Subject)';
      const dateHeader = getHeader('Date') || new Date().toISOString();

      const rawBody = this.extractBody(data.payload);
      const snippet = data.snippet || rawBody.slice(0, 160) || '';

      // Check for attachments safely
      let hasAttachments = false;
      if (data.payload?.parts) {
        hasAttachments = data.payload.parts.some((p: any) => p.filename && p.filename.length > 0);
      }

      // Format combined text for TF-IDF feature analysis (Subject + Body)
      const combinedCleanText = `${subjectHeader} ${rawBody || snippet}`.trim();

      const parsed: ParsedEmail = {
        gmailMessageId: data.id,
        gmailThreadId: data.threadId,
        sender: fromHeader,
        subject: subjectHeader,
        receivedAt: new Date(dateHeader).toISOString(),
        bodySnippet: snippet,
        fullCleanText: combinedCleanText,
        hasAttachments,
        historyId: data.historyId,
      };

      return parsed;
    });

    const results = await Promise.all(emailPromises);
    return results.filter((r): r is ParsedEmail => r !== null);
  }
}
