import { Component, inject, OnInit, signal, input, computed } from '@angular/core';
import { Location } from '@angular/common';
import { TcgDexService, TcgDexCard } from '../../services/tcgdex.service';
import { WishlistService } from '../../services/wishlist.service';
import { NotificationService } from '../../services/notification.service';
import { CardModalComponent, CardModalDetails } from '../card-modal/card-modal.component';

@Component({
  selector: 'app-tcg-card-detail',
  standalone: true,
  imports: [CardModalComponent],
  template: `
    <div class="max-w-lg mx-auto p-4 pb-24 space-y-4">
      <button (click)="goBack()" class="text-sm text-dex-text-muted hover:text-dex-text">← Back</button>

      @if (card()) {
        <!-- Card Image -->
        <div class="bg-dex-surface rounded-xl overflow-hidden border border-dex-surface-light">
          @if (card()!.image) {
            <img [src]="card()!.image + '/high.webp'" [alt]="card()!.name"
                 class="w-full max-h-96 object-contain bg-dex-bg cursor-pointer"
                 (click)="openModal()" />
          }
        </div>

        <!-- Name & Set Icons -->
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-dex-text">{{ card()!.name }}</h1>
            @if (card()!.set?.logo || card()!.set?.symbol) {
              <div class="flex items-center gap-2 ml-1">
                @if (card()!.set!.logo) {
                  <img [src]="card()!.set!.logo + '.webp'" [alt]="card()!.set!.name"
                       class="h-7 object-contain" />
                }
                @if (card()!.set!.symbol) {
                  <img [src]="card()!.set!.symbol + '.webp'" [alt]="card()!.set!.name + ' symbol'"
                       class="h-5 object-contain" />
                }
              </div>
            }
          </div>
          <div class="flex flex-wrap gap-1.5">
            @if (card()!.localId) {
              <span class="text-xs font-mono bg-dex-surface-light text-dex-text-muted px-2.5 py-1 rounded-full">#{{ card()!.localId }}</span>
            }
            @if (card()!.rarity) {
              <span class="text-xs bg-dex-gold/20 text-dex-gold px-2.5 py-1 rounded-full">{{ card()!.rarity }}</span>
            }
            @if (card()!.category) {
              <span class="text-xs bg-dex-surface-light text-dex-text-muted px-2.5 py-1 rounded-full">{{ card()!.category }}</span>
            }
          </div>
        </div>

        <!-- Details -->
        <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
          <h2 class="text-sm font-bold text-dex-text-muted uppercase tracking-wider mb-3">Details</h2>
          <div class="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
            @if (card()!.hp) {
              <div>
                <span class="text-dex-text-muted text-xs">HP</span>
                <p class="text-dex-text font-semibold">{{ card()!.hp }}</p>
              </div>
            }
            @if (card()!.types?.length) {
              <div>
                <span class="text-dex-text-muted text-xs">Type{{ card()!.types!.length > 1 ? 's' : '' }}</span>
                <div class="flex gap-1 mt-0.5">
                  @for (t of card()!.types!; track t) {
                    <span class="text-xs bg-dex-accent/20 text-dex-accent px-2 py-0.5 rounded-full">{{ t }}</span>
                  }
                </div>
              </div>
            }
            @if (card()!.stage) {
              <div>
                <span class="text-dex-text-muted text-xs">Stage</span>
                <p class="text-dex-text">{{ card()!.stage }}</p>
              </div>
            }
            @if (card()!.evolveFrom) {
              <div>
                <span class="text-dex-text-muted text-xs">Evolves from</span>
                <p class="text-dex-text">{{ card()!.evolveFrom }}</p>
              </div>
            }
            @if (card()!.illustrator) {
              <div class="col-span-2">
                <span class="text-dex-text-muted text-xs">Illustrator</span>
                <p class="text-dex-text">{{ card()!.illustrator }}</p>
              </div>
            }
            @if (card()!.description) {
              <div class="col-span-2">
                <span class="text-dex-text-muted text-xs">Description</span>
                <p class="text-dex-text text-xs leading-relaxed mt-0.5">{{ card()!.description }}</p>
              </div>
            }
            @if (card()!.set?.name) {
              <div>
                <span class="text-dex-text-muted text-xs">Set</span>
                <p class="text-dex-text">{{ card()!.set!.name }}</p>
              </div>
            }
            @if (card()!.set?.cardCount) {
              <div>
                <span class="text-dex-text-muted text-xs">Set Size</span>
                <p class="text-dex-text">{{ card()!.set!.cardCount!.total }} cards</p>
              </div>
            }
            @if (card()!.regulationMark) {
              <div>
                <span class="text-dex-text-muted text-xs">Regulation</span>
                <p class="text-dex-text">{{ card()!.regulationMark }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Attacks -->
        @if (card()!.attacks?.length) {
          <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
            <h2 class="text-sm font-bold text-dex-text-muted uppercase tracking-wider mb-3">Attacks</h2>
            <div class="space-y-2">
              @for (atk of card()!.attacks!; track atk.name) {
                <div class="p-3 bg-dex-bg rounded-lg">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-dex-text">{{ atk.name }}</span>
                    @if (atk.damage) { <span class="text-sm font-bold text-dex-accent">{{ atk.damage }}</span> }
                  </div>
                  @if (atk.cost?.length) {
                    <div class="flex gap-1 mt-1">
                      @for (c of atk.cost; track $index) {
                        <span class="text-[10px] bg-dex-surface-light text-dex-text-muted px-1.5 py-0.5 rounded">{{ c }}</span>
                      }
                    </div>
                  }
                  @if (atk.effect) { <p class="text-xs text-dex-text-muted mt-1.5 leading-relaxed">{{ atk.effect }}</p> }
                </div>
              }
            </div>
          </div>
        }

        <!-- Weaknesses & Retreat -->
        @if (card()!.weaknesses?.length || card()!.retreat) {
          <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
            <div class="flex gap-6">
              @if (card()!.weaknesses?.length) {
                <div>
                  <span class="text-dex-text-muted text-xs">Weakness</span>
                  <div class="flex gap-1 mt-1">
                    @for (w of card()!.weaknesses!; track w.type) {
                      <span class="text-xs bg-dex-error/20 text-dex-error px-2 py-0.5 rounded-full">{{ w.type }} {{ w.value }}</span>
                    }
                  </div>
                </div>
              }
              @if (card()!.retreat) {
                <div>
                  <span class="text-dex-text-muted text-xs">Retreat Cost</span>
                  <p class="text-dex-text text-sm mt-1">{{ card()!.retreat }}</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- Pricing -->
        @if (card()!.pricing?.tcgplayer || card()!.pricing?.cardmarket) {
          <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
            <div class="flex items-baseline gap-2 mb-3">
              <h2 class="text-sm font-bold text-dex-gold uppercase tracking-wider">Pricing</h2>
              <span class="text-[10px] text-dex-text-muted">Ungraded · Near Mint</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              @if (card()!.pricing!.tcgplayer?.normal?.marketPrice) {
                <div class="bg-dex-bg rounded-lg p-3 text-center">
                  <p class="text-xs text-dex-text-muted mb-1">TCGPlayer</p>
                  <p class="text-lg font-bold text-dex-text">\${{ card()!.pricing!.tcgplayer!.normal!.marketPrice }}</p>
                </div>
              }
              @if (card()!.pricing!.cardmarket?.avg) {
                <div class="bg-dex-bg rounded-lg p-3 text-center">
                  <p class="text-xs text-dex-text-muted mb-1">Cardmarket</p>
                  <p class="text-lg font-bold text-dex-text">€{{ card()!.pricing!.cardmarket!.avg }}</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- Variants -->
        @if (card()!.variants) {
          <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
            <h2 class="text-sm font-bold text-dex-text-muted uppercase tracking-wider mb-3">Available Variants</h2>
            <div class="flex flex-wrap gap-1.5">
              @if (card()!.variants!.normal) { <span class="text-xs bg-dex-surface-light text-dex-text px-2.5 py-1 rounded-full">Normal</span> }
              @if (card()!.variants!.reverse) { <span class="text-xs bg-dex-surface-light text-dex-text px-2.5 py-1 rounded-full">Reverse Holo</span> }
              @if (card()!.variants!.holo) { <span class="text-xs bg-dex-surface-light text-dex-text px-2.5 py-1 rounded-full">Holo</span> }
              @if (card()!.variants!.firstEdition) { <span class="text-xs bg-dex-surface-light text-dex-text px-2.5 py-1 rounded-full">1st Edition</span> }
            </div>
          </div>
        }

        <!-- Actions -->
        <button (click)="toggleWishlist()"
                class="w-full bg-dex-surface border border-dex-gold text-dex-gold font-semibold py-2.5 rounded-xl hover:bg-dex-gold/10 transition-colors">
          {{ isWishlisted() ? '⭐' : '☆' }} Wishlist
        </button>
      } @else if (error()) {
        <div class="text-center py-12 text-dex-error text-sm">Card not found.</div>
      } @else {
        <div class="flex justify-center py-12">
          <div class="w-10 h-10 border-4 border-dex-accent border-t-transparent rounded-full animate-spin"></div>
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
export class TcgCardDetailComponent implements OnInit {
  private readonly tcgDexService = inject(TcgDexService);
  private readonly wishlistService = inject(WishlistService);
  private readonly notifications = inject(NotificationService);
  private readonly location = inject(Location);

  readonly id = input.required<string>();
  readonly card = signal<TcgDexCard | null>(null);
  readonly error = signal(false);
  readonly isWishlisted = computed(() => this.wishlistService.isWishlisted(this.id()));
  readonly modalVisible = signal(false);
  readonly modalImageUrl = signal('');
  readonly modalCardName = signal('');
  readonly modalDetails = signal<CardModalDetails | null>(null);

  async ngOnInit(): Promise<void> {
    this.wishlistService.loadWishlist();
    try {
      const details = await this.tcgDexService.getCard(this.id());
      this.card.set(details);
    } catch {
      this.error.set(true);
    }
  }

  goBack(): void {
    this.location.back();
  }

  openModal(): void {
    const c = this.card();
    if (!c?.image) return;
    this.modalImageUrl.set(c.image + '/high.webp');
    this.modalCardName.set(c.name);
    this.modalDetails.set({
      setName: c.set?.name ?? undefined,
      rarity: c.rarity ?? undefined,
      hp: c.hp ?? undefined,
      types: c.types ?? undefined,
      illustrator: c.illustrator ?? undefined,
      localId: c.localId ?? undefined,
    });
    this.modalVisible.set(true);
  }

  async toggleWishlist(): Promise<void> {
    const c = this.card();
    if (!c) return;
    try {
      if (this.isWishlisted()) {
        await this.wishlistService.removeByTcgdexId(c.id);
        this.notifications.success('Removed from wishlist.');
      } else {
        await this.wishlistService.addCard({
          tcgdexCardId: c.id,
          cardName: c.name,
          setId: c.set?.id,
          setName: c.set?.name,
          localId: c.localId ?? undefined,
          rarity: c.rarity ?? undefined,
          cardImageUrl: c.image ?? undefined,
          setLogo: c.set?.logo ?? undefined,
          setSymbol: c.set?.symbol ?? undefined,
        });
        this.notifications.success('Added to wishlist!');
      }
    } catch {
      this.notifications.error('Failed to update wishlist.');
    }
  }
}
