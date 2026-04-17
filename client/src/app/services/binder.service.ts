import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Binder {
  id: string;
  userId: string;
  name: string;
  artCardTcgdexId: string | null;
  artCardImageUrl: string | null;
  cardCount: number;
  createdAt: string;
}

export interface BinderCard {
  id: string;
  binderId: string;
  tcgdexCardId: string;
  cardName: string;
  cardImageUrl: string | null;
  addedAt: string;
}

export interface CreateBinderRequest {
  name: string;
  artCardTcgdexId?: string;
  artCardImageUrl?: string;
}

export interface AddBinderCardsRequest {
  cards: { tcgdexCardId: string; cardName: string; cardImageUrl?: string }[];
}

@Injectable({ providedIn: 'root' })
export class BinderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly _binders = signal<Binder[]>([]);
  private readonly _loading = signal(false);

  readonly binders = this._binders.asReadonly();
  readonly loading = this._loading.asReadonly();

  async loadBinders(): Promise<void> {
    this._loading.set(true);
    try {
      const binders = await firstValueFrom(
        this.http.get<Binder[]>(`${this.baseUrl}/binders`)
      );
      this._binders.set(binders);
    } finally {
      this._loading.set(false);
    }
  }

  async createBinder(req: CreateBinderRequest): Promise<Binder> {
    const binder = await firstValueFrom(
      this.http.post<Binder>(`${this.baseUrl}/binders`, req)
    );
    this._binders.update(b => [binder, ...b]);
    return binder;
  }

  async deleteBinder(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/binders/${id}`));
    this._binders.update(b => b.filter(x => x.id !== id));
  }

  async getBinderCards(binderId: string): Promise<BinderCard[]> {
    return firstValueFrom(
      this.http.get<BinderCard[]>(`${this.baseUrl}/binders/${binderId}/cards`)
    );
  }

  async addBinderCards(binderId: string, req: AddBinderCardsRequest): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/binders/${binderId}/cards`, req)
    );
  }

  async removeBinderCard(binderId: string, cardId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/binders/${binderId}/cards/${cardId}`)
    );
  }
}
