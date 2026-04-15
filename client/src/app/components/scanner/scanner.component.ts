import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { CardScanService, ScanResponse, TcgDexCardBrief } from '../../services/card-scan.service';
import { CollectionService, AddCollectionCardRequest } from '../../services/collection.service';
import { TcgDexService, TcgDexCard } from '../../services/tcgdex.service';
import { NotificationService } from '../../services/notification.service';
import { CardModalComponent, CardModalDetails } from '../card-modal/card-modal.component';

type ScanStep = 'capture' | 'scanning' | 'results' | 'confirm' | 'saving';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, CardModalComponent],
  template: `
    <div class="max-w-lg mx-auto p-4 pb-24">
      <h1 class="text-2xl font-display font-bold text-dex-text mb-6">Scan Card</h1>

      <!-- Step: Capture -->
      @if (step() === 'capture') {
        <div class="flex flex-col items-center gap-4">
          <div class="w-full max-h-[55vh] aspect-[3/4] bg-dex-surface rounded-2xl border-2 border-dashed border-dex-surface-light flex items-center justify-center overflow-hidden">
            @if (previewUrl()) {
              <img [src]="previewUrl()" alt="Card preview" class="w-full h-full object-contain" />
            } @else {
              <div class="text-center text-dex-text-muted p-6">
                <span class="text-5xl mb-3 block">📷</span>
                <p class="text-sm">Take a photo or upload an image of your Pokémon card</p>
              </div>
            }
          </div>

          <div class="flex gap-3 w-full">
            <label class="flex-1 bg-dex-accent hover:bg-dex-accent-dark text-white font-semibold py-3 px-4 rounded-xl text-center cursor-pointer transition-colors">
              📸 Camera
              <input type="file" accept="image/*" capture="environment" class="hidden"
                     (change)="onFileSelected($event)" />
            </label>
            <label class="flex-1 bg-dex-surface-light hover:bg-dex-surface text-dex-text font-semibold py-3 px-4 rounded-xl text-center cursor-pointer transition-colors border border-dex-surface-light">
              📁 Upload
              <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden"
                     (change)="onFileSelected($event)" />
            </label>
          </div>

          @if (previewUrl()) {
            <button (click)="startScan()"
                    class="w-full bg-dex-gold hover:bg-dex-gold-light text-dex-bg font-bold py-3 rounded-xl transition-colors">
              ⚡ Scan Card
            </button>
          }
        </div>
      }

      <!-- Step: Scanning -->
      @if (step() === 'scanning') {
        <div class="flex flex-col items-center gap-4 py-16">
          <div class="w-16 h-16 border-4 border-dex-accent border-t-transparent rounded-full animate-spin"></div>
          <p class="text-dex-text-muted">Analyzing your card...</p>
        </div>
      }

      <!-- Step: Results -->
      @if (step() === 'results') {
        <div class="space-y-4">
          <ng-container *ngTemplateOutlet="ocrDetails" />

          <h2 class="text-lg font-bold text-dex-text">Select the correct card:</h2>

          @if (scanResponse()?.candidates?.length === 0) {
            <p class="text-dex-text-muted text-center py-8">No matches found. Try scanning again.</p>
          }

          <div class="grid grid-cols-2 gap-3">
            @for (card of scanResponse()?.candidates ?? []; track card.id) {
              <button (click)="selectCard(card)"
                      class="bg-dex-surface rounded-xl p-2 border border-dex-surface-light hover:border-dex-accent transition-colors cardhover text-left">
                @if (card.image) {
                  <img [src]="card.image + '/high.webp'" [alt]="card.name"
                       class="w-full aspect-[3/4] object-contain rounded-lg bg-dex-bg mb-2" loading="lazy"
                       (error)="onImgError($event)" />
                }
                <p class="text-sm font-medium text-dex-text truncate">{{ card.name }}</p>
                <p class="text-xs text-dex-text-muted">{{ card.id }}</p>
              </button>
            }
          </div>

          <button (click)="reset()" class="w-full text-dex-text-muted py-2 text-sm hover:text-dex-text">
            ← Scan another card
          </button>
        </div>
      }

      <!-- Step: Confirm -->
      @if (step() === 'confirm') {
        <div class="space-y-4">
          <ng-container *ngTemplateOutlet="ocrDetails" />

          @if (selectedCardFull()) {
            <div class="bg-dex-surface rounded-xl overflow-hidden border border-dex-surface-light">
              @if (selectedCardFull()!.image) {
                <img [src]="selectedCardFull()!.image + '/high.webp'" [alt]="selectedCardFull()!.name"
                     class="w-full max-h-80 object-contain bg-dex-bg cursor-pointer"
                     (click)="openCardModal()"
                     (error)="onImgError($event)" />
              }
              <div class="p-4 space-y-2">
                <h2 class="text-xl font-bold text-dex-text">{{ selectedCardFull()!.name }}</h2>
                @if (selectedCardFull()!.set) {
                  <p class="text-sm text-dex-text-muted">{{ selectedCardFull()!.set!.name }}</p>
                }
                @if (selectedCardFull()!.rarity) {
                  <span class="inline-block bg-dex-gold/20 text-dex-gold text-xs px-2 py-0.5 rounded-full">
                    {{ selectedCardFull()!.rarity }}
                  </span>
                }
              </div>
            </div>
          }

          <div class="space-y-3">
            <div>
              <label class="text-sm text-dex-text-muted block mb-1">Condition</label>
              <select [(ngModel)]="selectedCondition"
                      class="w-full bg-dex-surface border border-dex-surface-light rounded-lg px-3 py-2 text-dex-text">
                <option value="mint">Mint</option>
                <option value="near_mint">Near Mint</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="played">Played</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <button (click)="saveToCollection()"
                  class="w-full bg-dex-success hover:bg-dex-success/80 text-dex-bg font-bold py-3 rounded-xl transition-colors">
            ✅ Add to Collection
          </button>

          <button (click)="step.set('results')" class="w-full text-dex-text-muted py-2 text-sm hover:text-dex-text">
            ← Back to results
          </button>
        </div>
      }

      <!-- Step: Saving -->
      @if (step() === 'saving') {
        <div class="flex flex-col items-center gap-4 py-16">
          <div class="w-16 h-16 border-4 border-dex-success border-t-transparent rounded-full animate-spin"></div>
          <p class="text-dex-text-muted">Adding to collection...</p>
        </div>
      }
      <app-card-modal
        [imageUrl]="modalImageUrl()"
        [cardName]="modalCardName()"
        [visible]="modalVisible()"
        [details]="modalDetails()"
        (close)="modalVisible.set(false)" />

      <!-- Shared OCR details template -->
      <ng-template #ocrDetails>
        @if (scanResponse()?.scanResult; as scan) {
          <div class="bg-dex-surface rounded-xl p-4 border border-dex-surface-light">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-bold text-dex-gold">OCR Results</h2>
              <button (click)="ocrExpanded.set(!ocrExpanded())"
                      class="text-xs text-dex-text-muted hover:text-dex-text">
                {{ ocrExpanded() ? 'Collapse ▲' : 'Expand ▼' }}
              </button>
            </div>
            <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <span class="text-dex-text-muted">Name</span>
              <span class="text-dex-text">{{ scan.name ?? '—' }}</span>
              <span class="text-dex-text-muted">Set Code</span>
              <span class="text-dex-text font-mono">{{ scan.setCode ?? '—' }}</span>
              @if (ocrExpanded()) {
                <span class="text-dex-text-muted">Set ID</span>
                <span class="text-dex-text font-mono">{{ scan.setId ?? '—' }}</span>
                <span class="text-dex-text-muted">Local ID</span>
                <span class="text-dex-text font-mono">{{ scan.localId ?? '—' }}</span>
                <span class="text-dex-text-muted">Card #</span>
                <span class="text-dex-text">{{ scan.cardNumber ?? '—' }}</span>
                <span class="text-dex-text-muted">Set Name</span>
                <span class="text-dex-text">{{ scan.setName ?? '—' }}</span>
                <span class="text-dex-text-muted">HP</span>
                <span class="text-dex-text">{{ scan.hp ?? '—' }}</span>
                <span class="text-dex-text-muted">Types</span>
                <span class="text-dex-text">{{ scan.types?.join(', ') ?? '—' }}</span>
                <span class="text-dex-text-muted">Rarity</span>
                <span class="text-dex-text">{{ scan.rarity ?? '—' }}</span>
                <span class="text-dex-text-muted">Stage</span>
                <span class="text-dex-text">{{ scan.stage ?? '—' }}</span>
                <span class="text-dex-text-muted">Raw Text</span>
                <span class="text-dex-text text-xs break-all">{{ scan.rawText ?? '—' }}</span>
              }
            </div>
          </div>
        }
      </ng-template>
    </div>
  `,
})
export class ScannerComponent {
  private readonly scanService = inject(CardScanService);
  private readonly collectionService = inject(CollectionService);
  private readonly tcgDexService = inject(TcgDexService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly step = signal<ScanStep>('capture');
  readonly previewUrl = signal<string | null>(null);
  readonly scanResponse = signal<ScanResponse | null>(null);
  readonly selectedCardFull = signal<TcgDexCard | null>(null);
  readonly ocrExpanded = signal(false);
  readonly modalVisible = signal(false);
  readonly modalImageUrl = signal('');
  readonly modalCardName = signal('');
  readonly modalDetails = signal<CardModalDetails | null>(null);

  readonly detectedVariant = signal<string | null>(null);
  selectedCondition = 'near_mint';

  private selectedFile: File | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  async startScan(): Promise<void> {
    if (!this.selectedFile) return;

    this.step.set('scanning');
    try {
      const response = await this.scanService.scanCard(this.selectedFile);
      this.scanResponse.set(response);

      // If exact match found, skip straight to confirm
      if (response.exactMatch) {
        const exact = response.exactMatch;
        // Fetch full card to get variant info
        try {
          const fullCard = await this.tcgDexService.getCard(exact.id);
          this.selectedCardFull.set(fullCard);
          this.detectedVariant.set(this.resolveVariant(fullCard));
        } catch {
          this.selectedCardFull.set({
            id: exact.id,
            localId: exact.localId,
            name: exact.name,
            image: exact.image,
            rarity: exact.rarity,
            category: exact.category,
            set: exact.set ? { id: exact.set.id, name: exact.set.name, logo: null, symbol: null, cardCount: null } : null,
          } as TcgDexCard);
        }
        this.step.set('confirm');
        this.notifications.success('Exact match found!');
      } else {
        this.step.set('results');
      }
    } catch {
      this.notifications.error('Failed to scan card. Please try again.');
      this.step.set('capture');
    }
  }

  async selectCard(card: TcgDexCardBrief): Promise<void> {
    try {
      const fullCard = await this.tcgDexService.getCard(card.id);
      this.selectedCardFull.set(fullCard);
      this.detectedVariant.set(this.resolveVariant(fullCard));
      this.step.set('confirm');
    } catch {
      this.notifications.error('Failed to load card details.');
    }
  }

  async saveToCollection(): Promise<void> {
    const card = this.selectedCardFull();
    if (!card) return;

    // Use exactMatch + OCR scan result as fallback data sources
    const scan = this.scanResponse()?.scanResult;
    const exact = this.scanResponse()?.exactMatch;

    const imageBase = card.image || exact?.image || null;

    this.step.set('saving');
    try {
      const req: AddCollectionCardRequest = {
        tcgdexCardId: card.id || exact?.id || '',
        cardName: card.name || exact?.name || scan?.name || '',
        setId: card.set?.id || exact?.set?.id || undefined,
        setName: card.set?.name || exact?.set?.name || scan?.setName || undefined,
        localId: card.localId || exact?.localId || scan?.localId || undefined,
        rarity: card.rarity || exact?.rarity || scan?.rarity || undefined,
        cardImageUrl: imageBase ? imageBase + '/high.webp' : undefined,
        category: card.category || exact?.category || undefined,
        variant: this.detectedVariant() ?? 'normal',
        condition: this.selectedCondition,
        hp: card.hp ?? scan?.hp ?? undefined,
        types: card.types ?? scan?.types ?? undefined,
        illustrator: card.illustrator ?? undefined,
        stage: card.stage ?? scan?.stage ?? undefined,
        evolveFrom: card.evolveFrom ?? undefined,
        description: card.description ?? undefined,
      };

      const name = req.cardName || 'Card';
      await this.collectionService.addCard(req);
      this.notifications.success(`${name} added to collection!`);
      this.router.navigate(['/collection']);
    } catch {
      this.notifications.error('Failed to save card.');
      this.step.set('confirm');
    }
  }

  openCardModal(): void {
    const card = this.selectedCardFull();
    if (!card?.image) return;
    this.modalImageUrl.set(card.image + '/high.webp');
    this.modalCardName.set(card.name ?? '');
    this.modalDetails.set({
      setName: card.set?.name,
      rarity: card.rarity ?? undefined,
      hp: card.hp ?? undefined,
      types: card.types ?? undefined,
      illustrator: card.illustrator ?? undefined,
      localId: card.localId ?? undefined,
    });
    this.modalVisible.set(true);
  }

  reset(): void {
    this.step.set('capture');
    this.previewUrl.set(null);
    this.scanResponse.set(null);
    this.selectedCardFull.set(null);
    this.detectedVariant.set(null);
    this.selectedFile = null;
  }

  private resolveVariant(card: TcgDexCard): string {
    const v = card.variants;
    if (!v) return 'normal';
    if (v.firstEdition) return '1st Edition';
    if (v.holo) return 'holo';
    if (v.reverse) return 'reverse';
    return 'normal';
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/placeholder-card.svg';
    img.onerror = null;
  }
}
