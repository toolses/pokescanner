import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TcgDexCardBrief } from './card-scan.service';

export interface TcgDexCard {
  id: string;
  localId: string | null;
  name: string;
  image: string | null;
  category: string | null;
  illustrator: string | null;
  rarity: string | null;
  hp: number | null;
  types: string[] | null;
  evolveFrom: string | null;
  description: string | null;
  stage: string | null;
  set: TcgDexSetBrief | null;
  variants: TcgDexVariants | null;
  attacks: TcgDexAttack[] | null;
  weaknesses: TcgDexWeakness[] | null;
  retreat: number | null;
  regulationMark: string | null;
  pricing: TcgDexPricing | null;
}

export interface TcgDexSetBrief {
  id: string;
  name: string;
  logo: string | null;
  symbol: string | null;
  cardCount: { total: number; official: number } | null;
}

export interface TcgDexSet {
  id: string;
  name: string;
  logo: string | null;
  symbol: string | null;
  cardCount: { total: number; official: number } | null;
  cards: TcgDexCardBrief[] | null;
  serie: { id: string; name: string; logo: string | null } | null;
}

export interface TcgDexSerie {
  id: string;
  name: string;
  logo: string | null;
  sets: TcgDexSetBrief[] | null;
}

export interface TcgDexVariants {
  normal: boolean | null;
  reverse: boolean | null;
  holo: boolean | null;
  firstEdition: boolean | null;
}

export interface TcgDexAttack {
  cost: string[] | null;
  name: string | null;
  effect: string | null;
  damage: any;
}

export interface TcgDexWeakness {
  type: string | null;
  value: string | null;
}

export interface TcgDexPricing {
  tcgplayer: {
    updated: string | null;
    unit: string | null;
    normal: TcgDexPriceVariant | null;
    holofoil: TcgDexPriceVariant | null;
    reverse: TcgDexPriceVariant | null;
  } | null;
  cardmarket: {
    updated: string | null;
    unit: string | null;
    avg: number | null;
    low: number | null;
    trend: number | null;
  } | null;
}

export interface TcgDexPriceVariant {
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
}

@Injectable({ providedIn: 'root' })
export class TcgDexService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  async searchCards(name: string): Promise<TcgDexCardBrief[]> {
    return firstValueFrom(
      this.http.get<TcgDexCardBrief[]>(`${this.baseUrl}/cards/search`, {
        params: { name },
      })
    );
  }

  async getCard(id: string): Promise<TcgDexCard> {
    return firstValueFrom(
      this.http.get<TcgDexCard>(`${this.baseUrl}/cards/${encodeURIComponent(id)}`)
    );
  }

  async getSets(): Promise<TcgDexSetBrief[]> {
    return firstValueFrom(
      this.http.get<TcgDexSetBrief[]>(`${this.baseUrl}/sets`)
    );
  }

  async getSet(id: string): Promise<TcgDexSet> {
    return firstValueFrom(
      this.http.get<TcgDexSet>(`${this.baseUrl}/sets/${encodeURIComponent(id)}`)
    );
  }

  async getSeries(): Promise<TcgDexSerie[]> {
    return firstValueFrom(
      this.http.get<TcgDexSerie[]>(`${this.baseUrl}/sets/series`)
    );
  }
}
