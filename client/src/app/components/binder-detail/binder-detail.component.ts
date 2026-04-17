import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BinderService, Binder, BinderCard } from '../../services/binder.service';
import { TcgDexService } from '../../services/tcgdex.service';
import { TcgDexCardBrief } from '../../services/card-scan.service';

@Component({
  selector: 'app-binder-detail',
  standalone: true,
  imports: [],
  template: `
    <div class="max-w-lg mx-auto p-4 pb-24 space-y-4">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <button (click)="goBack()" class="text-dex-text-muted text-2xl leading-none">←</button>
        <h1 class="text-2xl font-display font-bold text-dex-text flex-1 truncate">
          {{ binder()?.name ?? 'Binder' }}
        </h1>
        <button (click)="openAddOverlay()"
                class="bg-dex-accent text-white font-bold text-xl w-9 h-9 rounded-full flex items-center justify-center shrink-0">
          +
        </button>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="w-10 h-10 border-4 border-dex-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (cards().length === 0) {
        <div class="text-center py-12 text-dex-text-muted">
          <span class="text-4xl block mb-3">📒</span>
          <p>This binder is empty.</p>
          <button (click)="openAddOverlay()" class="text-dex-accent mt-2 inline-block">Add cards →</button>
        </div>
      } @else {
        <p class="text-sm text-dex-text-muted">{{ cards().length }} card{{ cards().length === 1 ? '' : 's' }}</p>
        <div class="grid grid-cols-3 gap-3">
          @for (card of cards(); track card.id) {
            <div class="bg-dex-surface rounded-xl p-2 border border-dex-surface-light group relative">
              @if (card.cardImageUrl) {
                <img [src]="card.cardImageUrl" [alt]="card.cardName"
                     class="w-full aspect-[3/4] object-contain rounded-lg bg-dex-bg mb-1" loading="lazy" />
              } @else {
                <div class="w-full aspect-[3/4] rounded-lg bg-dex-bg flex items-center justify-center text-2xl mb-1">🃏</div>
              }
              <p class="text-xs font-medium text-dex-text truncate">{{ card.cardName }}</p>
              <button (click)="removeCard(card)"
                      class="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                &times;
              </button>
            </div>
          }
        </div>
      }
    </div>

    <!-- Add Cards Overlay -->
    @if (showAddOverlay()) {
      <div class="fixed inset-0 bg-black/60 z-[60] flex flex-col"
           (click)="closeAddOverlay()">
        <div class="bg-dex-surface flex-1 mt-16 rounded-t-2xl flex flex-col overflow-hidden"
             (click)="$event.stopPropagation()">

          <!-- Overlay header -->
          <div class="flex items-center justify-between p-4 border-b border-dex-surface-light shrink-0">
            <div>
              <h2 class="text-lg font-bold text-dex-text">Add Cards</h2>
              @if (selectedCardIds().size > 0) {
                <p class="text-xs text-dex-accent">{{ selectedCardIds().size }} selected</p>
              }
            </div>
            <button (click)="closeAddOverlay()" class="text-dex-text-muted text-3xl leading-none">&times;</button>
          </div>

          <!-- Search bar -->
          <div class="p-4 shrink-0">
            <form (submit)="searchCards($event)" class="flex gap-2">
              <input #overlayInput type="text" placeholder="Search cards by name..."
                     class="flex-1 bg-dex-bg border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm placeholder-dex-text-muted" />
              <button type="submit"
                      class="bg-dex-accent text-white font-semibold px-4 py-2 rounded-lg text-sm shrink-0"
                      [disabled]="overlaySearchLoading()">
                {{ overlaySearchLoading() ? '...' : 'Search' }}
              </button>
            </form>
          </div>

          <!-- Results -->
          <div class="flex-1 overflow-y-auto px-4">
            @if (overlaySearchLoading()) {
              <div class="flex justify-center py-8">
                <div class="w-8 h-8 border-4 border-dex-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            } @else if (overlaySearchResults().length > 0) {
              <div class="grid grid-cols-3 gap-3 pb-4">
                @for (card of overlaySearchResults(); track card.id) {
                  <button (click)="toggleCardSelection(card)"
                          [class]="selectedCardIds().has(card.id)
                            ? 'bg-dex-surface rounded-xl p-2 border-2 border-dex-accent relative text-left w-full'
                            : 'bg-dex-surface rounded-xl p-2 border border-dex-surface-light cardhover relative text-left w-full'">
                    @if (selectedCardIds().has(card.id)) {
                      <div class="absolute top-1 right-1 w-5 h-5 bg-dex-accent rounded-full flex items-center justify-center text-white text-xs font-bold z-10">✓</div>
                    }
                    @if (card.image) {
                      <img [src]="card.image + '/high.webp'" [alt]="card.name"
                           class="w-full aspect-[3/4] object-contain rounded-lg bg-dex-bg mb-1" loading="lazy" />
                    } @else {
                      <div class="w-full aspect-[3/4] rounded-lg bg-dex-bg flex items-center justify-center text-2xl mb-1">🃏</div>
                    }
                    <p class="text-xs font-medium text-dex-text truncate">{{ card.name }}</p>
                  </button>
                }
              </div>
            } @else if (overlaySearchDone()) {
              <div class="text-center py-8 text-dex-text-muted text-sm">No cards found. Try a different name.</div>
            } @else {
              <div class="text-center py-8 text-dex-text-muted text-sm">Search for cards to add to this binder.</div>
            }
          </div>

          <!-- Add button (sticky at bottom when cards selected) -->
          @if (selectedCardIds().size > 0) {
            <div class="p-4 border-t border-dex-surface-light shrink-0">
              <button (click)="addSelectedCards()"
                      [disabled]="addingCards()"
                      class="w-full bg-dex-accent text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-opacity">
                {{ addingCards() ? 'Adding...' : 'Add ' + selectedCardIds().size + ' card' + (selectedCardIds().size === 1 ? '' : 's') + ' to Binder' }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class BinderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly binderService = inject(BinderService);
  private readonly tcgDex = inject(TcgDexService);

  readonly binder = signal<Binder | null>(null);
  readonly cards = signal<BinderCard[]>([]);
  readonly loading = signal(true);

  readonly showAddOverlay = signal(false);
  readonly overlaySearchLoading = signal(false);
  readonly overlaySearchResults = signal<TcgDexCardBrief[]>([]);
  readonly overlaySearchDone = signal(false);
  readonly selectedCardIds = signal<Set<string>>(new Set());
  readonly addingCards = signal(false);

  private selectedCardsData = new Map<string, TcgDexCardBrief>();
  private binderId = '';

  ngOnInit(): void {
    this.binderId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadBinder();
  }

  private async loadBinder(): Promise<void> {
    this.loading.set(true);
    try {
      await this.binderService.loadBinders();
      const found = this.binderService.binders().find(b => b.id === this.binderId) ?? null;
      this.binder.set(found);
      const binderCards = await this.binderService.getBinderCards(this.binderId);
      this.cards.set(binderCards);
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/collection']);
  }

  openAddOverlay(): void {
    this.overlaySearchResults.set([]);
    this.overlaySearchDone.set(false);
    this.selectedCardIds.set(new Set());
    this.selectedCardsData.clear();
    this.showAddOverlay.set(true);
  }

  closeAddOverlay(): void {
    this.showAddOverlay.set(false);
  }

  async searchCards(event: Event): Promise<void> {
    event.preventDefault();
    const input = (event.target as HTMLFormElement).querySelector('input') as HTMLInputElement;
    const query = input.value.trim();
    if (!query) return;

    this.overlaySearchLoading.set(true);
    this.overlaySearchDone.set(false);
    try {
      const results = await this.tcgDex.searchCards(query);
      this.overlaySearchResults.set(results);
    } catch {
      this.overlaySearchResults.set([]);
    } finally {
      this.overlaySearchLoading.set(false);
      this.overlaySearchDone.set(true);
    }
  }

  toggleCardSelection(card: TcgDexCardBrief): void {
    const current = new Set(this.selectedCardIds());
    if (current.has(card.id)) {
      current.delete(card.id);
      this.selectedCardsData.delete(card.id);
    } else {
      current.add(card.id);
      this.selectedCardsData.set(card.id, card);
    }
    this.selectedCardIds.set(current);
  }

  async addSelectedCards(): Promise<void> {
    this.addingCards.set(true);
    try {
      const cards = Array.from(this.selectedCardIds()).map(id => {
        const card = this.selectedCardsData.get(id)!;
        return {
          tcgdexCardId: card.id,
          cardName: card.name,
          cardImageUrl: card.image ? card.image + '/high.webp' : undefined,
        };
      });
      await this.binderService.addBinderCards(this.binderId, { cards });
      const updated = await this.binderService.getBinderCards(this.binderId);
      this.cards.set(updated);
      this.closeAddOverlay();
    } finally {
      this.addingCards.set(false);
    }
  }

  async removeCard(card: BinderCard): Promise<void> {
    await this.binderService.removeBinderCard(this.binderId, card.id);
    this.cards.update(cs => cs.filter(c => c.id !== card.id));
  }
}
