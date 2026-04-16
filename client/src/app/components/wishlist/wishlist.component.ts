import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WishlistService, WishlistCard } from '../../services/wishlist.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="max-w-lg mx-auto p-4 space-y-4">
      <h1 class="text-2xl font-display font-bold text-dex-text">Wishlist</h1>

      <!-- Add Form -->
      <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light space-y-3">
        <h2 class="text-sm font-semibold text-dex-text-muted">Add a card to wishlist</h2>
        <input type="text" placeholder="Card name"
               [(ngModel)]="newCardName"
               class="w-full bg-dex-bg border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm placeholder-dex-text-muted" />
        <div class="flex gap-2">
          <input type="text" placeholder="Set (optional)"
                 [(ngModel)]="newSetName"
                 class="flex-1 bg-dex-bg border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm placeholder-dex-text-muted" />
          <select [(ngModel)]="newPriority"
                  class="bg-dex-bg border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text text-sm">
            <option [ngValue]="1">Low</option>
            <option [ngValue]="2">Medium</option>
            <option [ngValue]="3">High</option>
          </select>
        </div>
        <button (click)="addCard()"
                [disabled]="!newCardName.trim()"
                class="w-full bg-dex-gold hover:bg-dex-gold-light text-dex-bg font-semibold py-2 rounded-lg transition-colors disabled:opacity-50">
          ⭐ Add to Wishlist
        </button>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-8">
          <div class="w-10 h-10 border-4 border-dex-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (cards().length === 0) {
        <div class="text-center py-12 text-dex-text-muted">
          <span class="text-4xl block mb-3">⭐</span>
          <p>Your wishlist is empty.</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (card of cards(); track card.id) {
            <div class="bg-dex-surface rounded-xl p-3 border border-dex-surface-light flex items-center gap-3">
              @if (card.cardImageUrl) {
                <a [routerLink]="['/cards', card.tcgdexCardId]" class="flex-shrink-0">
                  <img [src]="card.cardImageUrl + '/high.webp'" [alt]="card.cardName"
                       class="w-14 aspect-[3/4] object-contain rounded-lg bg-dex-bg" loading="lazy" />
                </a>
              }
              <a [routerLink]="['/cards', card.tcgdexCardId]" class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-dex-text truncate">{{ card.cardName }}</p>
                  @if (card.setLogo) {
                    <img [src]="card.setLogo + '.webp'" [alt]="card.setName" class="h-4 object-contain flex-shrink-0" />
                  }
                  @if (card.setSymbol) {
                    <img [src]="card.setSymbol + '.webp'" [alt]="'symbol'" class="h-3.5 object-contain flex-shrink-0" />
                  }
                </div>
                @if (card.setName) {
                  <p class="text-xs text-dex-text-muted">{{ card.setName }}</p>
                }
              </a>
              <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    [class]="priorityClass(card.priority)">
                {{ priorityLabel(card.priority) }}
              </span>
              <button (click)="removeCard(card.id); $event.stopPropagation()"
                      class="text-dex-error hover:text-dex-accent-light text-sm px-2 py-1 flex-shrink-0">
                ✕
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class WishlistComponent implements OnInit {
  private readonly wishlistService = inject(WishlistService);
  private readonly notifications = inject(NotificationService);

  readonly cards = this.wishlistService.cards;
  readonly loading = this.wishlistService.loading;

  newCardName = '';
  newSetName = '';
  newPriority = 2;

  ngOnInit(): void {
    this.wishlistService.loadWishlist();
  }

  async addCard(): Promise<void> {
    if (!this.newCardName.trim()) return;
    try {
      await this.wishlistService.addCard({
        cardName: this.newCardName.trim(),
        setName: this.newSetName.trim() || undefined,
        priority: this.newPriority,
      });
      this.notifications.success('Added to wishlist!');
      this.newCardName = '';
      this.newSetName = '';
      this.newPriority = 2;
    } catch {
      this.notifications.error('Failed to add to wishlist.');
    }
  }

  async removeCard(id: string): Promise<void> {
    try {
      await this.wishlistService.deleteCard(id);
    } catch {
      this.notifications.error('Failed to remove from wishlist.');
    }
  }

  priorityLabel(p: number): string {
    return p >= 3 ? 'High' : p === 2 ? 'Med' : 'Low';
  }

  priorityClass(p: number): string {
    return p >= 3
      ? 'bg-dex-error/20 text-dex-error'
      : p === 2
        ? 'bg-dex-gold/20 text-dex-gold'
        : 'bg-dex-surface-light text-dex-text-muted';
  }
}
