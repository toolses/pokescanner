import { Component, inject, OnInit, signal, input, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CollectionService, CollectionCard } from '../../services/collection.service';
import { TcgDexService, TcgDexCard } from '../../services/tcgdex.service';
import { WishlistService } from '../../services/wishlist.service';
import { NotificationService } from '../../services/notification.service';
import { CardModalComponent, CardModalDetails } from '../card-modal/card-modal.component';

@Component({
  selector: 'app-card-detail',
  standalone: true,
  imports: [RouterLink, CardModalComponent],
  template: `
    <div class="max-w-lg mx-auto p-4 pb-24 space-y-4">
      <a routerLink="/collection" class="text-sm text-dex-text-muted hover:text-dex-text">← Back to collection</a>

      @if (card()) {
        <!-- Card Image -->
        <div class="bg-dex-surface rounded-xl overflow-hidden border border-dex-surface-light">
          @if (card()!.cardImageUrl) {
            <img [src]="card()!.cardImageUrl" [alt]="card()!.cardName"
                 class="w-full max-h-96 object-contain bg-dex-bg cursor-pointer"
                 (click)="openModal()" />
          }
        </div>

        <!-- Name & Tags -->
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-dex-text">{{ card()!.cardName }}</h1>
            @if (tcgCard()?.set?.logo || tcgCard()?.set?.symbol) {
              <div class="flex items-center gap-2 ml-1">
                @if (tcgCard()!.set!.logo) {
                  <img [src]="tcgCard()!.set!.logo + '.webp'" [alt]="tcgCard()!.set!.name"
                       class="h-7 object-contain" />
                }
                @if (tcgCard()!.set!.symbol) {
                  <img [src]="tcgCard()!.set!.symbol + '.webp'" [alt]="tcgCard()!.set!.name + ' symbol'"
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
            @if (card()!.variant && card()!.variant !== 'normal') {
              <span class="text-xs bg-dex-accent/20 text-dex-accent px-2.5 py-1 rounded-full">{{ card()!.variant }}</span>
            }
            @if (card()!.condition) {
              <span class="text-xs bg-dex-surface-light text-dex-text px-2.5 py-1 rounded-full">{{ formatCondition(card()!.condition) }}</span>
            }
          </div>
        </div>

        <!-- Card Details (from stored data + tcgdex enrichment) -->
        <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
          <h2 class="text-sm font-bold text-dex-text-muted uppercase tracking-wider mb-3">Details</h2>
          <div class="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
            @if (hp()) {
              <div>
                <span class="text-dex-text-muted text-xs">HP</span>
                <p class="text-dex-text font-semibold">{{ hp() }}</p>
              </div>
            }
            @if (types()?.length) {
              <div>
                <span class="text-dex-text-muted text-xs">Type{{ types()!.length > 1 ? 's' : '' }}</span>
                <div class="flex gap-1 mt-0.5">
                  @for (t of types()!; track t) {
                    <span class="text-xs bg-dex-accent/20 text-dex-accent px-2 py-0.5 rounded-full">{{ t }}</span>
                  }
                </div>
              </div>
            }
            @if (stage()) {
              <div>
                <span class="text-dex-text-muted text-xs">Stage</span>
                <p class="text-dex-text">{{ stage() }}</p>
              </div>
            }
            @if (evolveFrom()) {
              <div>
                <span class="text-dex-text-muted text-xs">Evolves from</span>
                <p class="text-dex-text">{{ evolveFrom() }}</p>
              </div>
            }
            @if (illustrator()) {
              <div class="col-span-2">
                <span class="text-dex-text-muted text-xs">Illustrator</span>
                <p class="text-dex-text">{{ illustrator() }}</p>
              </div>
            }
            @if (description()) {
              <div class="col-span-2">
                <span class="text-dex-text-muted text-xs">Description</span>
                <p class="text-dex-text text-xs leading-relaxed mt-0.5">{{ description() }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Attacks (from TCGdex live data) -->
        @if (tcgCard()?.attacks?.length) {
          <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
            <h2 class="text-sm font-bold text-dex-text-muted uppercase tracking-wider mb-3">Attacks</h2>
            <div class="space-y-2">
              @for (atk of tcgCard()!.attacks!; track atk.name) {
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

        <!-- Weaknesses & Retreat (from TCGdex) -->
        @if (tcgCard()?.weaknesses?.length || tcgCard()?.retreat) {
          <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
            <div class="flex gap-6">
              @if (tcgCard()!.weaknesses?.length) {
                <div>
                  <span class="text-dex-text-muted text-xs">Weakness</span>
                  <div class="flex gap-1 mt-1">
                    @for (w of tcgCard()!.weaknesses!; track w.type) {
                      <span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{{ w.type }} {{ w.value }}</span>
                    }
                  </div>
                </div>
              }
              @if (tcgCard()!.retreat) {
                <div>
                  <span class="text-dex-text-muted text-xs">Retreat Cost</span>
                  <p class="text-dex-text text-sm mt-1">{{ tcgCard()!.retreat }}</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- Pricing -->
        @if (tcgCard()?.pricing?.tcgplayer || tcgCard()?.pricing?.cardmarket) {
          <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
            <div class="flex items-baseline gap-2 mb-3">
              <h2 class="text-sm font-bold text-dex-gold uppercase tracking-wider">Pricing</h2>
              <span class="text-[10px] text-dex-text-muted">Ungraded · Near Mint</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              @if (tcgCard()!.pricing!.tcgplayer?.normal?.marketPrice) {
                <div class="bg-dex-bg rounded-lg p-3 text-center">
                  <p class="text-xs text-dex-text-muted mb-1">TCGPlayer</p>
                  <p class="text-lg font-bold text-dex-text">\${{ tcgCard()!.pricing!.tcgplayer!.normal!.marketPrice }}</p>
                </div>
              }
              @if (tcgCard()!.pricing!.cardmarket?.avg) {
                <div class="bg-dex-bg rounded-lg p-3 text-center">
                  <p class="text-xs text-dex-text-muted mb-1">Cardmarket</p>
                  <p class="text-lg font-bold text-dex-text">€{{ tcgCard()!.pricing!.cardmarket!.avg }}</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="flex gap-3">
          <button (click)="toggleWishlist()"
                  class="flex-1 bg-dex-surface border border-dex-gold text-dex-gold font-semibold py-2.5 rounded-xl hover:bg-dex-gold/10 transition-colors">
            {{ isWishlisted() ? '⭐' : '☆' }} Wishlist
          </button>
          <button (click)="deleteCard()"
                  class="bg-dex-surface border border-red-500 text-red-500 font-semibold py-2.5 px-5 rounded-xl hover:bg-red-500/10 transition-colors">
            🗑️
          </button>
        </div>
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
export class CardDetailComponent implements OnInit {
  private readonly collectionService = inject(CollectionService);
  private readonly tcgDexService = inject(TcgDexService);
  private readonly wishlistService = inject(WishlistService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly card = signal<CollectionCard | null>(null);
  readonly tcgCard = signal<TcgDexCard | null>(null);
  readonly isWishlisted = computed(() => {
    const c = this.card();
    return c?.tcgdexCardId ? this.wishlistService.isWishlisted(c.tcgdexCardId) : false;
  });
  readonly modalVisible = signal(false);
  readonly modalImageUrl = signal('');
  readonly modalCardName = signal('');
  readonly modalDetails = signal<CardModalDetails | null>(null);

  // Merge stored card data with live TCGdex data (stored takes priority for what we have)
  readonly hp = computed(() => this.card()?.hp ?? this.tcgCard()?.hp ?? null);
  readonly types = computed(() => this.card()?.types ?? this.tcgCard()?.types ?? null);
  readonly stage = computed(() => this.card()?.stage ?? this.tcgCard()?.stage ?? null);
  readonly evolveFrom = computed(() => this.card()?.evolveFrom ?? this.tcgCard()?.evolveFrom ?? null);
  readonly illustrator = computed(() => this.card()?.illustrator ?? this.tcgCard()?.illustrator ?? null);
  readonly description = computed(() => this.card()?.description ?? this.tcgCard()?.description ?? null);

  async ngOnInit(): Promise<void> {
    this.wishlistService.loadWishlist();
    await this.collectionService.loadCollection();
    const found = this.collectionService.cards().find(c => String(c.id) === this.id());
    if (found) {
      this.card.set(found);
      if (found.tcgdexCardId) {
        try {
          const details = await this.tcgDexService.getCard(found.tcgdexCardId);
          this.tcgCard.set(details);
        } catch { /* card details not critical */ }
      }
    }
  }

  formatCondition(condition: string): string {
    return condition.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  async toggleWishlist(): Promise<void> {
    const c = this.card();
    if (!c) return;
    try {
      if (this.isWishlisted()) {
        await this.wishlistService.removeByTcgdexId(c.tcgdexCardId);
        this.notifications.success('Removed from wishlist.');
      } else {
        const tcg = this.tcgCard();
        await this.wishlistService.addCard({
          tcgdexCardId: c.tcgdexCardId,
          cardName: c.cardName,
          setId: c.setId ?? undefined,
          setName: c.setName ?? undefined,
          localId: c.localId ?? undefined,
          rarity: c.rarity ?? undefined,
          cardImageUrl: c.cardImageUrl ?? undefined,
          setLogo: tcg?.set?.logo ?? undefined,
          setSymbol: tcg?.set?.symbol ?? undefined,
        });
        this.notifications.success('Added to wishlist!');
      }
    } catch {
      this.notifications.error('Failed to update wishlist.');
    }
  }

  async deleteCard(): Promise<void> {
    const c = this.card();
    if (!c || !confirm('Remove this card from your collection?')) return;
    try {
      await this.collectionService.deleteCard(c.id);
      this.notifications.success('Card removed.');
      this.router.navigate(['/collection']);
    } catch {
      this.notifications.error('Failed to remove card.');
    }
  }

  openModal(): void {
    const c = this.card();
    if (!c?.cardImageUrl) return;
    this.modalImageUrl.set(c.cardImageUrl);
    this.modalCardName.set(c.cardName);
    const tcg = this.tcgCard();
    this.modalDetails.set({
      setName: c.setName ?? tcg?.set?.name ?? undefined,
      rarity: c.rarity ?? tcg?.rarity ?? undefined,
      hp: tcg?.hp ?? undefined,
      types: tcg?.types ?? undefined,
      illustrator: tcg?.illustrator ?? undefined,
      localId: c.localId ?? tcg?.localId ?? undefined,
    });
    this.modalVisible.set(true);
  }
}
