import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CollectionService } from '../../services/collection.service';
import { SetCacheService } from '../../services/set-cache.service';
import { CardModalComponent, CardModalDetails } from '../card-modal/card-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CardModalComponent],
  template: `
    <div class="max-w-lg mx-auto p-4 space-y-6">
      <div class="text-center pb-2">
        <h1 class="text-3xl font-display font-bold text-dex-gold">P<svg class="pokeball-o" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="48" fill="#CC0000" stroke="currentColor" stroke-width="4"/><rect x="0" y="46" width="100" height="8" fill="currentColor"/><circle cx="50" cy="50" r="48" fill="transparent" stroke="currentColor" stroke-width="4"/><path d="M0,50 Q0,100 50,100 Q100,100 100,50" fill="white" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="16" fill="white" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="8" fill="currentColor"/></svg>kéScanner</h1>
        <p class="text-dex-text-muted text-sm mt-1">Your Pokémon card collection manager</p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-dex-surface rounded-xl px-4 py-2.5 border border-dex-surface-light">
          <p class="text-2xl font-bold text-dex-text">{{ stats()?.totalCards ?? 0 }}</p>
          <p class="text-xs text-dex-text-muted">Total Cards</p>
        </div>
        <div class="bg-dex-surface rounded-xl px-4 py-2.5 border border-dex-surface-light">
          <p class="text-2xl font-bold text-dex-text">{{ stats()?.uniqueCards ?? 0 }}</p>
          <p class="text-xs text-dex-text-muted">Unique Cards</p>
        </div>
        <div class="bg-dex-surface rounded-xl px-4 py-2.5 border border-dex-surface-light">
          <p class="text-2xl font-bold text-dex-text">{{ stats()?.totalSets ?? 0 }}</p>
          <p class="text-xs text-dex-text-muted">Sets Collected</p>
        </div>
        <div class="bg-dex-surface rounded-xl px-4 py-2.5 border border-dex-surface-light">
          <p class="text-2xl font-bold text-dex-gold">€{{ (stats()?.estimatedValue ?? 0).toFixed(2) }}</p>
          <p class="text-xs text-dex-text-muted">Est. Value (NM)</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="space-y-3">
        <a routerLink="/scan"
           class="block bg-dex-accent hover:bg-dex-accent-dark text-white font-bold text-center py-4 rounded-xl transition-colors text-lg">
          📷 Scan a Card
        </a>
        <div class="grid grid-cols-2 gap-3">
          <a routerLink="/collection"
             class="block bg-dex-surface hover:bg-dex-surface-light text-dex-text font-semibold text-center py-3 rounded-xl transition-colors border border-dex-surface-light">
            📦 Collection
          </a>
          <a routerLink="/sets"
             class="block bg-dex-surface hover:bg-dex-surface-light text-dex-text font-semibold text-center py-3 rounded-xl transition-colors border border-dex-surface-light">
            🔍 Search cards/sets
          </a>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <a routerLink="/wishlist"
             class="block bg-dex-surface hover:bg-dex-surface-light text-dex-text font-semibold text-center py-3 rounded-xl transition-colors border border-dex-surface-light">
            ⭐ Wishlist
          </a>
          <a routerLink="/expert"
             class="block bg-dex-surface hover:bg-dex-surface-light text-dex-text font-semibold text-center py-3 rounded-xl transition-colors border border-dex-surface-light">
            🧠 Ask Expert
          </a>
        </div>
      </div>

      <!-- Recent Additions -->
      @if (stats()?.recentAdditions?.length) {
        <div>
          <h2 class="text-lg font-bold text-dex-text mb-3">Recently Added</h2>
          <div class="flex justify-center gap-3 pb-2">
            @for (card of stats()!.recentAdditions.slice(0, 3); track card.id) {
              <div (click)="goToCard(card.id)"
                   class="flex-shrink-0 w-28 bg-dex-surface rounded-xl p-2 border border-dex-surface-light cardhover cursor-pointer">
                @if (card.cardImageUrl) {
                  <img [src]="card.cardImageUrl" [alt]="card.cardName"
                       class="w-full aspect-[3/4] object-contain rounded-lg bg-dex-bg mb-1" loading="lazy" />
                } @else {
                  <div class="w-full aspect-[3/4] rounded-lg bg-dex-bg flex items-center justify-center text-2xl mb-1">🃏</div>
                }
                <p class="text-xs text-dex-text truncate">{{ card.cardName }}</p>
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
              </div>
            }
          </div>
        </div>
      }
    </div>

    <app-card-modal
      [imageUrl]="modalImageUrl()"
      [cardName]="modalCardName()"
      [visible]="modalVisible()"
      [details]="modalDetails()"
      (close)="modalVisible.set(false)" />
  `,
  styles: [`
    .pokeball-o {
      display: inline-block;
      width: 0.75em;
      height: 0.75em;
      vertical-align: -0.05em;
      margin: 0 -0.03em;
    }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly collectionService = inject(CollectionService);
  private readonly router = inject(Router);
  readonly setCache = inject(SetCacheService);
  readonly stats = this.collectionService.stats;

  readonly modalVisible = signal(false);
  readonly modalImageUrl = signal('');
  readonly modalCardName = signal('');
  readonly modalDetails = signal<CardModalDetails | null>(null);

  ngOnInit(): void {
    this.collectionService.loadStats();
    this.setCache.ensureLoaded();
  }

  goToCard(id: string): void {
    this.router.navigate(['/collection', id]);
  }

  openModal(name: string, imageUrl: string, card?: any): void {
    this.modalImageUrl.set(imageUrl);
    this.modalCardName.set(name);
    this.modalDetails.set(card ? { setName: card.setName, rarity: card.rarity } : null);
    this.modalVisible.set(true);
  }
}
