import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WishlistCard {
  id: string;
  tcgdexCardId: string;
  cardName: string;
  setId: string | null;
  setName: string | null;
  localId: string | null;
  rarity: string | null;
  cardImageUrl: string | null;
  setLogo: string | null;
  setSymbol: string | null;
  priority: number;
  notes: string | null;
  addedAt: string;
}

export interface AddWishlistCardRequest {
  tcgdexCardId?: string;
  cardName: string;
  setId?: string;
  setName?: string;
  localId?: string;
  rarity?: string;
  cardImageUrl?: string;
  setLogo?: string;
  setSymbol?: string;
  priority?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly _cards = signal<WishlistCard[]>([]);
  private readonly _loading = signal(false);
  readonly cards = this._cards.asReadonly();
  readonly loading = this._loading.asReadonly();

  async loadWishlist(): Promise<void> {
    this._loading.set(true);
    try {
      const cards = await firstValueFrom(
        this.http.get<WishlistCard[]>(`${this.baseUrl}/wishlist`)
      );
      this._cards.set(cards);
    } finally {
      this._loading.set(false);
    }
  }

  async addCard(req: AddWishlistCardRequest): Promise<WishlistCard> {
    const card = await firstValueFrom(
      this.http.post<WishlistCard>(`${this.baseUrl}/wishlist`, req)
    );
    this._cards.update(cards => [card, ...cards]);
    return card;
  }

  async deleteCard(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/wishlist/${id}`)
    );
    this._cards.update(cards => cards.filter(c => c.id !== id));
  }

  isWishlisted(tcgdexCardId: string): boolean {
    return this._cards().some(c => c.tcgdexCardId === tcgdexCardId);
  }

  async removeByTcgdexId(tcgdexCardId: string): Promise<void> {
    const card = this._cards().find(c => c.tcgdexCardId === tcgdexCardId);
    if (card) await this.deleteCard(card.id);
  }
}
