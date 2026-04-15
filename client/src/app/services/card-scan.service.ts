import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ScanResponse {
  scanResult: CardScanResult;
  exactMatch: TcgDexCardFull | null;
  candidates: TcgDexCardBrief[];
}

export interface CardScanResult {
  name: string | null;
  setName: string | null;
  setCode: string | null;
  setId: string | null;
  localId: string | null;
  cardNumber: string | null;
  hp: number | null;
  types: string[] | null;
  rarity: string | null;
  stage: string | null;
  rawText: string | null;
}

export interface TcgDexCardFull {
  id: string;
  localId: string | null;
  name: string;
  image: string | null;
  rarity: string | null;
  category: string | null;
  set: { id: string; name: string } | null;
}

export interface TcgDexCardBrief {
  id: string;
  localId: string | null;
  name: string;
  image: string | null;
}

@Injectable({ providedIn: 'root' })
export class CardScanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  async scanCard(imageFile: File): Promise<ScanResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);
    return firstValueFrom(
      this.http.post<ScanResponse>(`${this.baseUrl}/cards/scan`, formData)
    );
  }
}
