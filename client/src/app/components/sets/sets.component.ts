import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TcgDexService, TcgDexSetBrief, TcgDexSerie } from '../../services/tcgdex.service';
import { TcgDexCardBrief } from '../../services/card-scan.service';
import { CardModalComponent, CardModalDetails } from '../card-modal/card-modal.component';

@Component({
  selector: 'app-sets',
  standalone: true,
  imports: [RouterLink, CardModalComponent, FormsModule],
  template: `
    <div class="max-w-lg mx-auto p-4 pb-24 space-y-4">
      <!-- Tab Bar -->
      <div class="flex gap-1 bg-dex-bg rounded-lg p-1">
        <button (click)="activeTab.set('cards')"
                [class]="activeTab() === 'cards' ? 'flex-1 py-2 rounded-md text-sm font-semibold bg-dex-accent text-white' : 'flex-1 py-2 rounded-md text-sm font-semibold text-dex-text-muted hover:text-dex-text'">
          Search Cards
        </button>
        <button (click)="activeTab.set('sets')"
                [class]="activeTab() === 'sets' ? 'flex-1 py-2 rounded-md text-sm font-semibold bg-dex-accent text-white' : 'flex-1 py-2 rounded-md text-sm font-semibold text-dex-text-muted hover:text-dex-text'">
          Browse Sets
        </button>
      </div>

      @if (activeTab() === 'sets') {
        <!-- Filters -->
        <div class="flex gap-2">
          <input type="text" placeholder="Filter sets..."
                 (input)="onSetSearch($event)"
                 class="flex-1 bg-dex-surface border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm placeholder-dex-text-muted" />
          <select [(ngModel)]="selectedSeriesId" (ngModelChange)="applySetFilters()"
                  class="bg-dex-surface border border-dex-surface-light rounded-lg px-2 py-2 text-dex-text text-sm max-w-[45%]">
            <option value="">All Series</option>
            @for (s of series(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        </div>

        @if (loading()) {
          <div class="flex justify-center py-12">
            <div class="w-10 h-10 border-4 border-dex-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else {
          @if (filteredGroups().length === 0) {
            <div class="text-center py-12 text-dex-text-muted text-sm">No sets match your filters.</div>
          }
          <div class="space-y-6">
            @for (group of filteredGroups(); track group.id) {
              <div>
                <h3 class="text-xs font-semibold text-dex-text-muted uppercase tracking-wide mb-2 px-1">{{ group.name }}</h3>
                <div class="space-y-2">
                  @for (set of group.sets; track set.id) {
                    <a [routerLink]="['/sets', set.id]"
                       class="flex items-center gap-3 bg-dex-surface rounded-xl p-3 border border-dex-surface-light hover:border-dex-accent transition-colors">
                      @if (set.logo) {
                        <img [src]="set.logo + '.webp'" [alt]="set.name"
                             class="w-16 h-10 object-contain" loading="lazy" />
                      } @else {
                        <div class="w-16 h-10 bg-dex-bg rounded flex items-center justify-center text-lg">📚</div>
                      }
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-dex-text truncate">{{ set.name }}</p>
                        @if (set.cardCount) {
                          <p class="text-xs text-dex-text-muted">{{ set.cardCount.total }} cards</p>
                        }
                      </div>
                      <span class="text-dex-text-muted text-sm">→</span>
                    </a>
                  }
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <!-- Card Search Tab -->
        <form (submit)="searchCards($event)" class="flex gap-2">
          <input type="text" placeholder="Search cards by name..."
                 #cardInput
                 class="flex-1 bg-dex-surface border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm placeholder-dex-text-muted" />
          <button type="submit"
                  class="bg-dex-accent hover:bg-dex-accent-dark text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                  [disabled]="cardSearchLoading()">
            {{ cardSearchLoading() ? '...' : 'Search' }}
          </button>
        </form>

        @if (cardSearchLoading()) {
          <div class="flex justify-center py-12">
            <div class="w-10 h-10 border-4 border-dex-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (cardSearchResults().length > 0) {
          <p class="text-xs text-dex-text-muted">{{ cardSearchResults().length }} result{{ cardSearchResults().length === 1 ? '' : 's' }}</p>
          <div class="grid grid-cols-3 gap-3">
            @for (card of cardSearchResults(); track card.id) {
              <button (click)="openModal(card)"
                      class="bg-dex-surface rounded-xl p-2 border border-dex-surface-light cardhover text-left">
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
        } @else if (cardSearchDone()) {
          <div class="text-center py-12 text-dex-text-muted text-sm">
            No cards found. Try a different name.
          </div>
        } @else {
          <div class="text-center py-12 text-dex-text-muted text-sm">
            Search for any Pokémon card by name.
          </div>
        }
      }
    </div>

    <app-card-modal
      [imageUrl]="modalImageUrl()"
      [cardName]="modalCardName()"
      [visible]="modalVisible()"
      [details]="modalDetails()"
      (close)="modalVisible.set(false)" />
  `,
})
export class SetsComponent implements OnInit {
  private readonly tcgDexService = inject(TcgDexService);

  readonly activeTab = signal<'sets' | 'cards'>('cards');

  // Sets tab
  readonly loading = signal(true);
  readonly series = signal<TcgDexSerie[]>([]);
  readonly allSets = signal<TcgDexSetBrief[]>([]);
  readonly filteredGroups = signal<{ id: string; name: string; logo: string | null; sets: TcgDexSetBrief[] }[]>([]);
  private setSearchQuery = '';
  selectedSeriesId = '';

  // Card search tab
  readonly cardSearchLoading = signal(false);
  readonly cardSearchResults = signal<TcgDexCardBrief[]>([]);
  readonly cardSearchDone = signal(false);

  // Modal
  readonly modalVisible = signal(false);
  readonly modalImageUrl = signal('');
  readonly modalCardName = signal('');
  readonly modalDetails = signal<CardModalDetails | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const seriesList = await this.tcgDexService.getSeries();
      const detailed = await Promise.all(
        seriesList.map(s => this.tcgDexService.getSerie(s.id).catch(() => ({ ...s, sets: null })))
      );
      this.series.set(detailed.reverse()); // newest first
      this.applySetFilters();
    } finally {
      this.loading.set(false);
    }
  }

  onSetSearch(event: Event): void {
    this.setSearchQuery = (event.target as HTMLInputElement).value.toLowerCase();
    this.applySetFilters();
  }

  applySetFilters(): void {
    const query = this.setSearchQuery;
    const groups = this.series()
      .filter(s => !this.selectedSeriesId || s.id === this.selectedSeriesId)
      .map(s => ({
        id: s.id,
        name: s.name,
        logo: s.logo,
        sets: (s.sets ?? []).filter(set =>
          !query || set.name.toLowerCase().includes(query)
        ),
      }))
      .filter(g => g.sets.length > 0);
    this.filteredGroups.set(groups);
  }

  async searchCards(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const input = form.querySelector('input') as HTMLInputElement;
    const query = input.value.trim();
    if (!query) return;

    this.cardSearchLoading.set(true);
    this.cardSearchDone.set(false);
    try {
      const results = await this.tcgDexService.searchCards(query);
      this.cardSearchResults.set(results);
    } catch {
      this.cardSearchResults.set([]);
    } finally {
      this.cardSearchLoading.set(false);
      this.cardSearchDone.set(true);
    }
  }

  openModal(card: { name: string; image: string | null }): void {
    if (!card.image) return;
    this.modalImageUrl.set(card.image + '/high.webp');
    this.modalCardName.set(card.name);
    this.modalDetails.set(null);
    this.modalVisible.set(true);
  }
}
