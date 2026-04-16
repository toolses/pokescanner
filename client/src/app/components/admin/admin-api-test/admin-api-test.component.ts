import { Component, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-admin-api-test',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-api-test.component.html',
})
export class AdminApiTestComponent {
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
}
