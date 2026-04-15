import { Injectable } from '@angular/core';
import { TcgDexCardBrief } from './card-scan.service';
import { TcgDexSerie } from './tcgdex.service';

@Injectable({ providedIn: 'root' })
export class SetsStateService {
  // Card search tab state
  activeTab: 'sets' | 'cards' = 'cards';
  cardSearchQuery = '';
  cardSearchResults: TcgDexCardBrief[] = [];
  cardSearchDone = false;

  // Browse sets tab state
  selectedSeriesId = '';
  setSearchQuery = '';
  cachedSeries: TcgDexSerie[] | null = null;
}
