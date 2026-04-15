import { Injectable, inject } from '@angular/core';
import { TcgDexService, TcgDexSetBrief } from './tcgdex.service';

@Injectable({ providedIn: 'root' })
export class SetCacheService {
  private readonly tcgDex = inject(TcgDexService);
  private cache = new Map<string, TcgDexSetBrief>();
  private loadPromise: Promise<void> | null = null;

  async ensureLoaded(): Promise<void> {
    if (this.cache.size > 0) return;
    if (!this.loadPromise) {
      this.loadPromise = this.tcgDex.getSets().then(sets => {
        for (const s of sets) {
          this.cache.set(s.id, s);
        }
      });
    }
    await this.loadPromise;
  }

  getSet(setId: string): TcgDexSetBrief | undefined {
    return this.cache.get(setId);
  }

  /** Extract setId from a TCGdex card ID like "sv06-42" → "sv06" */
  setIdFromCardId(cardId: string): string {
    const idx = cardId.lastIndexOf('-');
    return idx > 0 ? cardId.substring(0, idx) : cardId;
  }
}
