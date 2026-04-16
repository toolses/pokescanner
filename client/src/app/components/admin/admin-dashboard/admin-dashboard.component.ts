import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminUsageService, type DailyUsageRow } from '../../../services/admin-usage.service';
import { AdminUserService } from '../../../services/admin-user.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  protected readonly usageService = inject(AdminUsageService);
  protected readonly userService = inject(AdminUserService);

  protected readonly totalUsers = signal(0);

  protected readonly todayCalls = computed(() =>
    this.usageService.todayUsage().reduce((sum, r) => sum + r.totalCalls, 0),
  );

  protected readonly todayErrors = computed(() =>
    this.usageService.todayUsage().reduce((sum, r) => sum + r.errorCount, 0),
  );

  protected readonly todayTokens = computed(() =>
    this.usageService.todayUsage().reduce((sum, r) => sum + r.totalTokens, 0),
  );

  protected readonly dailyGrouped = computed(() => {
    const rows = this.usageService.dailyUsage();
    const map = new Map<string, DailyUsageRow[]>();
    for (const row of rows) {
      const existing = map.get(row.date) ?? [];
      existing.push(row);
      map.set(row.date, existing);
    }
    return Array.from(map.entries()).map(([date, providers]) => ({
      date,
      providers: providers.slice().sort((a, b) => b.totalCalls - a.totalCalls),
    }));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.usageService.loadTodayUsage(),
      this.usageService.loadDailyUsage(30),
      this.userService.loadUsers(),
    ]);
    this.totalUsers.set(this.userService.users().length);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
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
}
