import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CollectionCard {
  id: string;
  tcgdexCardId: string;
  cardName: string;
  setId: string | null;
  setName: string | null;
  localId: string | null;
  rarity: string | null;
  cardImageUrl: string | null;
  category: string | null;
  variant: string;
  condition: string;
  quantity: number;
  notes: string | null;
  scanImageUrl: string | null;
  hp: number | null;
  types: string[] | null;
  illustrator: string | null;
  stage: string | null;
  evolveFrom: string | null;
  description: string | null;
  addedAt: string;
}

export interface AddCollectionCardRequest {
  tcgdexCardId: string;
  cardName: string;
  setId?: string;
  setName?: string;
  localId?: string;
  rarity?: string;
  cardImageUrl?: string;
  category?: string;
  variant?: string;
  condition?: string;
  quantity?: number;
  notes?: string;
  scanImageUrl?: string;
  hp?: number;
  types?: string[];
  illustrator?: string;
  stage?: string;
  evolveFrom?: string;
  description?: string;
}

export interface CollectionStats {
  totalCards: number;
  uniqueCards: number;
  totalSets: number;
  estimatedValue: number;
  recentAdditions: CollectionCard[];
}

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly _cards = signal<CollectionCard[]>([]);
  private readonly _stats = signal<CollectionStats | null>(null);
  private readonly _loading = signal(false);

  readonly cards = this._cards.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly totalCards = computed(() => this._stats()?.totalCards ?? 0);

  async loadCollection(): Promise<void> {
    this._loading.set(true);
    try {
      const cards = await firstValueFrom(
        this.http.get<CollectionCard[]>(`${this.baseUrl}/collection`)
      );
      this._cards.set(cards);
    } finally {
      this._loading.set(false);
    }
  }

  async loadStats(): Promise<void> {
    const stats = await firstValueFrom(
      this.http.get<CollectionStats>(`${this.baseUrl}/stats`)
    );
    this._stats.set(stats);
  }

  async addCard(req: AddCollectionCardRequest): Promise<CollectionCard> {
    const card = await firstValueFrom(
      this.http.post<CollectionCard>(`${this.baseUrl}/collection`, req)
    );
    this._cards.update(cards => [card, ...cards]);
    return card;
  }

  async deleteCard(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/collection/${id}`)
    );
    this._cards.update(cards => cards.filter(c => c.id !== id));
  }
}
