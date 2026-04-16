import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AdminTraceService, type TraceSummary } from '../../../services/admin-trace.service';

@Component({
  selector: 'app-admin-traces',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './admin-traces.component.html',
})
export class AdminTracesComponent implements OnInit {
  protected readonly traceService = inject(AdminTraceService);

  protected readonly selectedTrace = signal<TraceSummary | null>(null);
  protected readonly expandedEntryId = signal<string | null>(null);
  protected readonly days = signal(7);

  async ngOnInit(): Promise<void> {
    await this.traceService.loadTraces(this.days());
  }

  async selectTrace(trace: TraceSummary): Promise<void> {
    if (this.selectedTrace()?.correlationId === trace.correlationId) {
      this.selectedTrace.set(null);
      return;
    }
    this.selectedTrace.set(trace);
    this.expandedEntryId.set(null);
    await this.traceService.loadTraceDetail(trace.correlationId);
  }

  toggleEntry(entryId: string): void {
    this.expandedEntryId.set(this.expandedEntryId() === entryId ? null : entryId);
  }

  async refresh(): Promise<void> {
    this.selectedTrace.set(null);
    await this.traceService.loadTraces(this.days());
  }

  async changeDays(newDays: number): Promise<void> {
    this.days.set(newDays);
    this.selectedTrace.set(null);
    await this.traceService.loadTraces(newDays);
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  providerLabel(provider: string): string {
    const labels: Record<string, string> = {
      groq: 'Groq',
      deepseek: 'DeepSeek',
      tcgdex: 'TCGdex',
    };
    return labels[provider] ?? provider;
  }

  providerBadgeClass(provider: string): string {
    const classes: Record<string, string> = {
      groq: 'bg-orange-500/20 text-orange-300',
      deepseek: 'bg-blue-500/20 text-blue-300',
      tcgdex: 'bg-emerald-500/20 text-emerald-300',
    };
    return classes[provider] ?? 'bg-white/10 text-dex-text-muted';
  }

  statusClass(code: number): string {
    if (code >= 200 && code < 300) return 'text-dex-success';
    if (code >= 400) return 'text-dex-error';
    return 'text-dex-warning';
  }
}
