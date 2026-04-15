import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CollectionService } from '../../services/collection.service';
import { CardModalComponent, CardModalDetails } from '../card-modal/card-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CardModalComponent],
  template: `
    <div class="max-w-lg mx-auto p-4 space-y-6">
      <div class="text-center pt-4 pb-2">
        <h1 class="text-3xl font-display font-bold text-dex-gold">PokéScanner</h1>
        <p class="text-dex-text-muted text-sm mt-1">Your Pokémon card collection manager</p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
          <p class="text-2xl font-bold text-dex-text">{{ stats()?.totalCards ?? 0 }}</p>
          <p class="text-xs text-dex-text-muted">Total Cards</p>
        </div>
        <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
          <p class="text-2xl font-bold text-dex-text">{{ stats()?.uniqueCards ?? 0 }}</p>
          <p class="text-xs text-dex-text-muted">Unique Cards</p>
        </div>
        <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
          <p class="text-2xl font-bold text-dex-text">{{ stats()?.totalSets ?? 0 }}</p>
          <p class="text-xs text-dex-text-muted">Sets Collected</p>
        </div>
        <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
          <p class="text-2xl font-bold text-dex-gold">\${{ (stats()?.estimatedValue ?? 0).toFixed(2) }}</p>
          <p class="text-xs text-dex-text-muted">Est. Value</p>
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
            📚 Browse Sets
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
          <div class="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 custom-scrollbar">
            @for (card of stats()!.recentAdditions; track card.id) {
              <div class="flex-shrink-0 w-28 bg-dex-surface rounded-xl p-2 border border-dex-surface-light cardhover">
                @if (card.cardImageUrl) {
                  <img [src]="card.cardImageUrl" [alt]="card.cardName"
                       class="w-full aspect-[3/4] object-contain rounded-lg bg-dex-bg mb-1 cursor-pointer" loading="lazy"
                       (click)="openModal(card.cardName, card.cardImageUrl, card)" />
                } @else {
                  <div class="w-full aspect-[3/4] rounded-lg bg-dex-bg flex items-center justify-center text-2xl mb-1">🃏</div>
                }
                <p class="text-xs text-dex-text truncate">{{ card.cardName }}</p>
                <a [routerLink]="['/collection', card.id]" class="text-[10px] text-dex-accent hover:underline">View details</a>
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
})
export class DashboardComponent implements OnInit {
  private readonly collectionService = inject(CollectionService);
  readonly stats = this.collectionService.stats;

  readonly modalVisible = signal(false);
  readonly modalImageUrl = signal('');
  readonly modalCardName = signal('');
  readonly modalDetails = signal<CardModalDetails | null>(null);

  ngOnInit(): void {
    this.collectionService.loadStats();
  }

  openModal(name: string, imageUrl: string, card?: any): void {
    this.modalImageUrl.set(imageUrl);
    this.modalCardName.set(name);
    this.modalDetails.set(card ? { setName: card.setName, rarity: card.rarity } : null);
    this.modalVisible.set(true);
  }
}
