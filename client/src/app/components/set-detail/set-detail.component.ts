import { Component, inject, OnInit, signal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TcgDexService, TcgDexSet, TcgDexCard } from '../../services/tcgdex.service';
import { CardModalComponent, CardModalDetails } from '../card-modal/card-modal.component';

@Component({
  selector: 'app-set-detail',
  standalone: true,
  imports: [RouterLink, CardModalComponent],
  template: `
    <div class="max-w-lg mx-auto p-4 space-y-4">
      <a routerLink="/sets" class="text-sm text-dex-text-muted hover:text-dex-text">← Back to sets</a>

      @if (set()) {
        <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
          @if (set()!.logo) {
            <img [src]="set()!.logo + '.webp'" [alt]="set()!.name"
                 class="h-12 object-contain mb-3" />
          }
          <h1 class="text-2xl font-bold text-dex-text">{{ set()!.name }}</h1>
          @if (set()!.cardCount) {
            <p class="text-sm text-dex-text-muted mt-1">{{ set()!.cardCount!.total }} cards in set</p>
          }
        </div>

        @if (loading()) {
          <div class="flex justify-center py-8">
            <div class="w-10 h-10 border-4 border-dex-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else {
          <div class="grid grid-cols-3 gap-3">
            @for (card of cards(); track card.id) {
              <button (click)="openModal(card)"
                      class="bg-dex-surface rounded-xl p-2 border border-dex-surface-light cardhover text-left">
                @if (card.image) {
                  <img [src]="card.image + '/high.webp'" [alt]="card.name"
                       class="w-full aspect-[3/4] object-contain rounded-lg bg-dex-bg mb-1" loading="lazy" />
                } @else {
                  <div class="w-full aspect-[3/4] rounded-lg bg-dex-bg flex items-center justify-center text-2xl mb-1">🃏</div>
                }
                <p class="text-xs font-medium text-dex-text truncate">{{ card.name }}</p>
                <p class="text-[10px] text-dex-text-muted">{{ card.localId }}</p>
              </button>
            }
          </div>
        }
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
export class SetDetailComponent implements OnInit {
  private readonly tcgDexService = inject(TcgDexService);

  readonly id = input.required<string>();
  readonly set = signal<TcgDexSet | null>(null);
  readonly cards = signal<{ id: string; localId: string | null; name: string; image: string | null }[]>([]);
  readonly loading = signal(true);

  readonly modalVisible = signal(false);
  readonly modalImageUrl = signal('');
  readonly modalCardName = signal('');
  readonly modalDetails = signal<CardModalDetails | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const setData = await this.tcgDexService.getSet(this.id());
      this.set.set(setData);

      if (setData.cards) {
        this.cards.set(setData.cards);
      }
    } finally {
      this.loading.set(false);
    }
  }

  openModal(card: { name: string; image: string | null; localId: string | null }): void {
    if (!card.image) return;
    this.modalImageUrl.set(card.image + '/high.webp');
    this.modalCardName.set(card.name);
    this.modalDetails.set({
      setName: this.set()?.name,
      localId: card.localId ?? undefined,
    });
    this.modalVisible.set(true);
  }
}
