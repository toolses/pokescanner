import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface ScanTestResult {
  correlationId: string;
  aiResult: {
    name: string | null;
    setName: string | null;
    setCode: string | null;
    localId: string | null;
    cardNumber: string | null;
    hp: number | null;
    types: string[] | null;
    rarity: string | null;
    stage: string | null;
  };
  exactMatch: { id: string; name: string; image: string | null } | null;
  candidates: { id: string; name: string; image: string | null }[];
}

interface ExpertTestResult {
  correlationId: string;
  response: string;
  provider: string;
  durationMs: number;
}

interface TcgDexSearchResult {
  cards: { id: string; localId: string | null; name: string; image: string | null }[];
  count: number;
  durationMs: number;
}

interface TcgDexCardResult {
  card: {
    id: string; localId: string | null; name: string; image: string | null;
    category: string | null; illustrator: string | null; rarity: string | null;
    hp: number | null; types: string[] | null; evolveFrom: string | null;
    description: string | null; stage: string | null;
    set: { id: string; name: string; logo: string | null } | null;
    attacks: { name: string; damage: string | null; effect: string | null; cost: string[] | null }[] | null;
  };
  durationMs: number;
}

interface AiProviderInfo {
  name: string;
  available: boolean;
}

interface AiChatResult {
  correlationId: string;
  response: string;
  provider: string;
  model: string | null;
  tokensUsed: number | null;
  success: boolean;
  durationMs: number;
}

@Component({
  selector: 'app-admin-api-test',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-api-test.component.html',
})
export class AdminApiTestComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/api-test`;

  // Scan state
  protected readonly scanLoading = signal(false);
  protected readonly scanResult = signal<ScanTestResult | null>(null);
  protected readonly scanError = signal<string | null>(null);
  protected readonly scanFile = signal<File | null>(null);

  // Expert state
  protected readonly expertMessage = signal('');
  protected readonly expertLoading = signal(false);
  protected readonly expertResult = signal<ExpertTestResult | null>(null);
  protected readonly expertError = signal<string | null>(null);

  // TCGdex search state
  protected readonly tcgSearchQuery = signal('');
  protected readonly tcgSearchLoading = signal(false);
  protected readonly tcgSearchResult = signal<TcgDexSearchResult | null>(null);
  protected readonly tcgSearchError = signal<string | null>(null);

  // TCGdex card lookup state
  protected readonly tcgCardId = signal('');
  protected readonly tcgCardLoading = signal(false);
  protected readonly tcgCardResult = signal<TcgDexCardResult | null>(null);
  protected readonly tcgCardError = signal<string | null>(null);

  // AI provider state
  protected readonly aiProviders = signal<AiProviderInfo[]>([]);
  protected readonly aiSelectedProvider = signal('');
  protected readonly aiSystemPrompt = signal('');
  protected readonly aiMessage = signal('');
  protected readonly aiLoading = signal(false);
  protected readonly aiResult = signal<AiChatResult | null>(null);
  protected readonly aiError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAiProviders();
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.scanFile.set(input.files?.[0] ?? null);
  }

  async runScan(): Promise<void> {
    const file = this.scanFile();
    if (!file) return;

    this.scanLoading.set(true);
    this.scanResult.set(null);
    this.scanError.set(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const result = await firstValueFrom(
        this.http.post<ScanTestResult>(`${this.base}/scan`, formData),
      );
      this.scanResult.set(result);
    } catch (err: any) {
      this.scanError.set(err?.error?.detail ?? err?.message ?? 'Scan failed');
    } finally {
      this.scanLoading.set(false);
    }
  }

  async runExpert(): Promise<void> {
    const msg = this.expertMessage().trim();
    if (!msg) return;

    this.expertLoading.set(true);
    this.expertResult.set(null);
    this.expertError.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<ExpertTestResult>(`${this.base}/expert`, { message: msg }),
      );
      this.expertResult.set(result);
    } catch (err: any) {
      this.expertError.set(err?.error?.detail ?? err?.message ?? 'Expert test failed');
    } finally {
      this.expertLoading.set(false);
    }
  }

  async runTcgSearch(): Promise<void> {
    const name = this.tcgSearchQuery().trim();
    if (!name) return;

    this.tcgSearchLoading.set(true);
    this.tcgSearchResult.set(null);
    this.tcgSearchError.set(null);

    try {
      const result = await firstValueFrom(
        this.http.get<TcgDexSearchResult>(`${this.base}/tcgdex/search`, { params: { name } }),
      );
      this.tcgSearchResult.set(result);
    } catch (err: any) {
      this.tcgSearchError.set(err?.error?.detail ?? err?.message ?? 'TCGdex search failed');
    } finally {
      this.tcgSearchLoading.set(false);
    }
  }

  async runTcgCardLookup(): Promise<void> {
    const id = this.tcgCardId().trim();
    if (!id) return;

    this.tcgCardLoading.set(true);
    this.tcgCardResult.set(null);
    this.tcgCardError.set(null);

    try {
      const result = await firstValueFrom(
        this.http.get<TcgDexCardResult>(`${this.base}/tcgdex/card/${encodeURIComponent(id)}`),
      );
      this.tcgCardResult.set(result);
    } catch (err: any) {
      this.tcgCardError.set(err?.error?.detail ?? err?.message ?? 'Card lookup failed');
    } finally {
      this.tcgCardLoading.set(false);
    }
  }

  async loadAiProviders(): Promise<void> {
    try {
      const providers = await firstValueFrom(
        this.http.get<AiProviderInfo[]>(`${this.base}/ai/providers`),
      );
      this.aiProviders.set(providers);
      const available = providers.find(p => p.available);
      if (available) this.aiSelectedProvider.set(available.name);
    } catch {
      // ignore — providers list is optional
    }
  }

  async runAiChat(): Promise<void> {
    const provider = this.aiSelectedProvider();
    const message = this.aiMessage().trim();
    if (!provider || !message) return;

    this.aiLoading.set(true);
    this.aiResult.set(null);
    this.aiError.set(null);

    try {
      const body: any = { provider, message };
      const sys = this.aiSystemPrompt().trim();
      if (sys) body.systemPrompt = sys;

      const result = await firstValueFrom(
        this.http.post<AiChatResult>(`${this.base}/ai/chat`, body),
      );
      this.aiResult.set(result);
    } catch (err: any) {
      this.aiError.set(err?.error?.detail ?? err?.message ?? 'AI chat failed');
    } finally {
      this.aiLoading.set(false);
    }
  }
}
