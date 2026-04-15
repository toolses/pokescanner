import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExpertSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpertCardResult {
  id: string;
  name: string;
  image: string | null;
  localId: string | null;
}

export interface ExpertMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  modelUsed: string | null;
  cards?: ExpertCardResult[] | null;
  createdAt: string;
}

export interface AskResponse {
  answer: string;
  sessionId: string;
  modelUsed: string | null;
  cards: ExpertCardResult[] | null;
}

@Injectable({ providedIn: 'root' })
export class ExpertService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly _sessions = signal<ExpertSession[]>([]);
  private readonly _messages = signal<ExpertMessage[]>([]);
  private readonly _loading = signal(false);

  readonly sessions = this._sessions.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly loading = this._loading.asReadonly();

  async loadSessions(): Promise<void> {
    const sessions = await firstValueFrom(
      this.http.get<ExpertSession[]>(`${this.baseUrl}/expert/sessions`)
    );
    this._sessions.set(sessions);
  }

  async loadMessages(sessionId: string): Promise<void> {
    const messages = await firstValueFrom(
      this.http.get<ExpertMessage[]>(`${this.baseUrl}/expert/sessions/${sessionId}/messages`)
    );
    this._messages.set(messages);
  }

  async ask(question: string, sessionId?: string): Promise<AskResponse> {
    this._loading.set(true);
    this._messages.update(msgs => [...msgs, {
      id: crypto.randomUUID(), sessionId: sessionId ?? '', role: 'user',
      content: question, modelUsed: null, createdAt: new Date().toISOString()
    }]);
    try {
      const response = await firstValueFrom(
        this.http.post<AskResponse>(`${this.baseUrl}/expert/ask`, {
          question,
          sessionId,
        })
      );
      this._messages.update(msgs => [...msgs, {
        id: crypto.randomUUID(), sessionId: response.sessionId, role: 'assistant',
        content: response.answer, modelUsed: response.modelUsed,
        cards: response.cards, createdAt: new Date().toISOString()
      }]);
      return response;
    } finally {
      this._loading.set(false);
    }
  }

  clearMessages(): void {
    this._messages.set([]);
  }
}
