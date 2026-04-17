import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CollectionService, CollectionCard } from '../../services/collection.service';
import { SetCacheService } from '../../services/set-cache.service';
import { BinderService, Binder, CreateBinderRequest } from '../../services/binder.service';
import { TcgDexService } from '../../services/tcgdex.service';
import { TcgDexCardBrief } from '../../services/card-scan.service';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-lg mx-auto p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-display font-bold text-dex-text">Collection</h1>
        @if (activeTab() === 'all') {
          <span class="text-sm text-dex-text-muted">{{ filteredCards().length }} cards</span>
        } @else {
          <span class="text-sm text-dex-text-muted">{{ binderService.binders().length }} binders</span>
        }
      </div>

      <!-- Tab Bar -->
      <div class="flex gap-1 bg-dex-bg rounded-lg p-1">
        <button (click)="activeTab.set('all')"
                [class]="activeTab() === 'all' ? 'flex-1 py-2 rounded-md text-sm font-semibold bg-dex-accent text-white' : 'flex-1 py-2 rounded-md text-sm font-semibold text-dex-text-muted hover:text-dex-text'">
          All
        </button>
        <button (click)="onBindersTab()"
                [class]="activeTab() === 'binders' ? 'flex-1 py-2 rounded-md text-sm font-semibold bg-dex-accent text-white' : 'flex-1 py-2 rounded-md text-sm font-semibold text-dex-text-muted hover:text-dex-text'">
          Binders
        </button>
      </div>

      @if (activeTab() === 'all') {
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
      } @else {
        <!-- Binders Tab -->
        <div class="flex justify-end">
          <button (click)="openCreateModal()"
                  class="bg-dex-accent text-white text-sm font-semibold px-4 py-2 rounded-lg">
            + New Binder
          </button>
        </div>

        @if (binderService.loading()) {
          <div class="flex justify-center py-12">
            <div class="w-10 h-10 border-4 border-dex-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (binderService.binders().length === 0) {
          <div class="text-center py-12 text-dex-text-muted">
            <span class="text-4xl block mb-3">📒</span>
            <p>No binders yet.</p>
            <p class="text-sm mt-1">Create a binder to organise your cards.</p>
          </div>
        } @else {
          <div class="grid grid-cols-2 gap-4">
            @for (binder of binderService.binders(); track binder.id) {
              <button (click)="openBinder(binder.id)"
                      class="bg-dex-surface rounded-xl border border-dex-surface-light overflow-hidden text-left cardhover">
                @if (binder.artCardImageUrl) {
                  <img [src]="binder.artCardImageUrl" [alt]="binder.name"
                       class="w-full aspect-[3/4] object-contain bg-dex-bg" loading="lazy" />
                } @else {
                  <div class="w-full aspect-[3/4] bg-dex-bg flex items-center justify-center text-4xl">📒</div>
                }
                <div class="p-2">
                  <p class="text-sm font-semibold text-dex-text truncate">{{ binder.name }}</p>
                  <p class="text-xs text-dex-text-muted">{{ binder.cardCount }} card{{ binder.cardCount === 1 ? '' : 's' }}</p>
                </div>
              </button>
            }
          </div>
        }
      }
    </div>

    <!-- Create Binder Modal -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
           (click)="closeCreateModal()">
        <div class="bg-dex-surface w-full max-w-lg rounded-t-2xl p-5 space-y-4 pb-safe"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-dex-text">New Binder</h2>
            <button (click)="closeCreateModal()" class="text-dex-text-muted text-3xl leading-none">&times;</button>
          </div>

          <input type="text" placeholder="Binder name..."
                 [value]="newBinderName()"
                 (input)="newBinderName.set($any($event.target).value)"
                 class="w-full bg-dex-bg border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm placeholder-dex-text-muted" />

          <div>
            <p class="text-xs font-semibold text-dex-text-muted uppercase tracking-wide mb-2">Binder Art (optional)</p>

            @if (selectedArtCard()) {
              <div class="flex items-center gap-3 bg-dex-bg rounded-xl p-2 border border-dex-accent">
                @if (selectedArtCard()!.image) {
                  <img [src]="selectedArtCard()!.image + '/high.webp'" [alt]="selectedArtCard()!.name"
                       class="w-12 h-16 object-contain rounded" loading="lazy" />
                }
                <span class="text-sm text-dex-text flex-1 truncate">{{ selectedArtCard()!.name }}</span>
                <button (click)="selectedArtCard.set(null)" class="text-xs text-dex-text-muted shrink-0">Remove</button>
              </div>
            } @else {
              <form (submit)="searchArtCards($event)" class="flex gap-2">
                <input #artSearchInput type="text" placeholder="Search for art card..."
                       class="flex-1 bg-dex-bg border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm placeholder-dex-text-muted" />
                <button type="submit"
                        class="bg-dex-surface border border-dex-surface-light text-dex-text text-sm px-3 py-2 rounded-lg shrink-0"
                        [disabled]="artSearchLoading()">
                  {{ artSearchLoading() ? '...' : 'Search' }}
                </button>
              </form>

              @if (artSearchResults().length > 0) {
                <div class="grid grid-cols-4 gap-2 mt-2 max-h-44 overflow-y-auto">
                  @for (card of artSearchResults(); track card.id) {
                    <button (click)="selectArtCard(card)"
                            class="bg-dex-bg rounded-lg p-1 border border-dex-surface-light hover:border-dex-accent transition-colors">
                      @if (card.image) {
                        <img [src]="card.image + '/high.webp'" [alt]="card.name"
                             class="w-full aspect-[3/4] object-contain rounded" loading="lazy" />
                      } @else {
                        <div class="w-full aspect-[3/4] flex items-center justify-center text-xl">🃏</div>
                      }
                    </button>
                  }
                </div>
              }
            }
          </div>

          <button (click)="createBinder()"
                  [disabled]="!newBinderName().trim() || creatingBinder()"
                  class="w-full bg-dex-accent text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-opacity">
            {{ creatingBinder() ? 'Creating...' : 'Create Binder' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class CollectionComponent implements OnInit {
  private readonly collectionService = inject(CollectionService);
  readonly setCache = inject(SetCacheService);
  readonly binderService = inject(BinderService);
  private readonly tcgDex = inject(TcgDexService);
  private readonly router = inject(Router);

  readonly loading = this.collectionService.loading;
  readonly activeTab = signal<'all' | 'binders'>('all');

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

  // Create binder modal state
  readonly showCreateModal = signal(false);
  readonly newBinderName = signal('');
  readonly selectedArtCard = signal<TcgDexCardBrief | null>(null);
  readonly artSearchLoading = signal(false);
  readonly artSearchResults = signal<TcgDexCardBrief[]>([]);
  readonly creatingBinder = signal(false);

  ngOnInit(): void {
    this.collectionService.loadCollection();
    this.setCache.ensureLoaded();
  }

  onBindersTab(): void {
    this.activeTab.set('binders');
    this.binderService.loadBinders();
  }

  openBinder(id: string): void {
    this.router.navigate(['/collection/binders', id]);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onSort(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as 'newest' | 'name' | 'set');
  }

  openCreateModal(): void {
    this.newBinderName.set('');
    this.selectedArtCard.set(null);
    this.artSearchResults.set([]);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  async searchArtCards(event: Event): Promise<void> {
    event.preventDefault();
    const input = (event.target as HTMLFormElement).querySelector('input') as HTMLInputElement;
    const query = input.value.trim();
    if (!query) return;

    this.artSearchLoading.set(true);
    try {
      const results = await this.tcgDex.searchCards(query);
      this.artSearchResults.set(results);
    } catch {
      this.artSearchResults.set([]);
    } finally {
      this.artSearchLoading.set(false);
    }
  }

  selectArtCard(card: TcgDexCardBrief): void {
    this.selectedArtCard.set(card);
    this.artSearchResults.set([]);
  }

  async createBinder(): Promise<void> {
    const name = this.newBinderName().trim();
    if (!name) return;

    this.creatingBinder.set(true);
    try {
      const artCard = this.selectedArtCard();
      const req: CreateBinderRequest = {
        name,
        artCardTcgdexId: artCard?.id,
        artCardImageUrl: artCard?.image ? artCard.image + '/high.webp' : undefined,
      };
      await this.binderService.createBinder(req);
      this.closeCreateModal();
    } finally {
      this.creatingBinder.set(false);
    }
  }
}
