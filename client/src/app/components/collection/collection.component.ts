import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CollectionService, CollectionCard } from '../../services/collection.service';
import { SetCacheService } from '../../services/set-cache.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-lg mx-auto p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-display font-bold text-dex-text">Collection</h1>
        <span class="text-sm text-dex-text-muted">{{ filteredCards().length }} cards</span>
      </div>

      <!-- Search & Filter -->
      <div class="flex gap-2">
        <input type="text" placeholder="Search cards..."
               (input)="onSearch($event)"
               class="flex-1 bg-dex-surface border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm placeholder-dex-text-muted" />
        <select (change)="onSort($event)"
                class="bg-dex-surface border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm">
          <option value="newest">Newest</option>
          <option value="name">Name</option>
          <option value="set">Set</option>
        </select>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="w-10 h-10 border-4 border-dex-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (filteredCards().length === 0) {
        <div class="text-center py-12 text-dex-text-muted">
          <span class="text-4xl block mb-3">📦</span>
          <p>No cards in your collection yet.</p>
          <a routerLink="/scan" class="text-dex-accent mt-2 inline-block">Scan your first card →</a>
        </div>
      } @else {
        <div class="grid grid-cols-3 gap-3">
          @for (card of filteredCards(); track card.id) {
            <a [routerLink]="['/collection', card.id]"
               class="bg-dex-surface rounded-xl p-2 border border-dex-surface-light cardhover">
              @if (card.cardImageUrl) {
                <img [src]="card.cardImageUrl" [alt]="card.cardName"
                     class="w-full aspect-[3/4] object-contain rounded-lg bg-dex-bg mb-1" loading="lazy" />
              } @else {
                <div class="w-full aspect-[3/4] rounded-lg bg-dex-bg flex items-center justify-center text-2xl mb-1">🃏</div>
              }
              <p class="text-xs font-medium text-dex-text truncate">{{ card.cardName }}</p>
              @if (card.setId && setCache.getSet(card.setId); as set) {
                <div class="flex items-center gap-1 mt-0.5">
                  @if (set.symbol) {
                    <img [src]="set.symbol + '.webp'" [alt]="set.name" class="h-3 w-3 object-contain" loading="lazy" />
                  }
                  @if (set.logo) {
                    <img [src]="set.logo + '.webp'" [alt]="set.name" class="h-3 object-contain" loading="lazy" />
                  }
                </div>
              }
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class CollectionComponent implements OnInit {
  private readonly collectionService = inject(CollectionService);
  private readonly notifications = inject(NotificationService);
  readonly setCache = inject(SetCacheService);

  readonly loading = this.collectionService.loading;
  private readonly searchQuery = signal('');
  private readonly sortBy = signal<'newest' | 'name' | 'set'>('newest');

  readonly filteredCards = computed(() => {
    let cards = [...this.collectionService.cards()];
    const q = this.searchQuery().toLowerCase();
    if (q) {
      cards = cards.filter(c =>
        c.cardName.toLowerCase().includes(q) ||
        (c.setName?.toLowerCase().includes(q) ?? false)
      );
    }
    switch (this.sortBy()) {
      case 'name': cards.sort((a, b) => a.cardName.localeCompare(b.cardName)); break;
      case 'set': cards.sort((a, b) => (a.setName ?? '').localeCompare(b.setName ?? '')); break;
      default: cards.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()); break;
    }
    return cards;
  });

  ngOnInit(): void {
    this.collectionService.loadCollection();
    this.setCache.ensureLoaded();
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onSort(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as 'newest' | 'name' | 'set');
  }
}
