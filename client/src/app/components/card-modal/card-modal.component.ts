import { Component, ElementRef, input, output, signal, ViewChild } from '@angular/core';

export interface CardModalDetails {
  setName?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  illustrator?: string;
  localId?: string;
}

@Component({
  selector: 'app-card-modal',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center"
           (click)="close.emit()">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

        <!-- Card wrapper -->
        <div class="relative z-10 p-4" (click)="$event.stopPropagation()">
          <div #cardEl
               class="card-3d relative w-full max-w-sm sm:max-w-md mx-auto cursor-grab active:cursor-grabbing select-none"
               (pointerdown)="onPointerDown($event)"
               (pointermove)="onPointerMove($event)"
               (pointerup)="onPointerUp()"
               (pointerleave)="onPointerUp()">
            <img [src]="imageUrl()"
                 [alt]="cardName()"
                 class="w-full max-h-[80dvh] object-contain rounded-xl shadow-2xl shadow-dex-accent/20"
                 draggable="false" />
            <!-- Holographic sheen overlay -->
            <div #sheenEl
                 class="absolute inset-0 rounded-xl pointer-events-none opacity-0"></div>
          </div>

          <p class="text-center text-dex-text-muted text-xs mt-3">Tap outside to close · Drag to tilt</p>
        </div>
      </div>
    }
  `,
  styles: [`
    .card-3d {
      transform: perspective(800px) rotateX(0deg) rotateY(0deg);
      transform-style: preserve-3d;
      will-change: transform;
    }
  `],
})
export class CardModalComponent {
  @ViewChild('cardEl') cardEl!: ElementRef<HTMLElement>;
  @ViewChild('sheenEl') sheenEl!: ElementRef<HTMLElement>;

  readonly imageUrl = input.required<string>();
  readonly cardName = input<string>('');
  readonly visible = input<boolean>(false);
  readonly details = input<CardModalDetails | null>(null);
  readonly close = output<void>();

  readonly isDragging = signal(false);

  private dragging = false;
  private startX = 0;
  private startY = 0;
  private rafId = 0;
  private pendingRX = 0;
  private pendingRY = 0;

  onPointerDown(e: PointerEvent): void {
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // Remove spring-back transition while dragging
    this.cardEl.nativeElement.style.transition = 'none';
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    this.pendingRY = Math.max(-15, Math.min(15, dx * 0.15));
    this.pendingRX = Math.max(-15, Math.min(15, -dy * 0.15));

    if (this.rafId) return; // already scheduled
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      const el = this.cardEl?.nativeElement;
      const sheen = this.sheenEl?.nativeElement;
      if (!el) return;

      el.style.transform =
        `perspective(800px) rotateX(${this.pendingRX}deg) rotateY(${this.pendingRY}deg) scale(1.02)`;

      if (sheen) {
        const sx = 50 + this.pendingRY * 2;
        const sy = 50 + this.pendingRX * 2;
        sheen.style.background =
          `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.4) 0%, transparent 60%)`;
        sheen.style.opacity = '0.15';
      }
    });
  }

  onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    const el = this.cardEl?.nativeElement;
    const sheen = this.sheenEl?.nativeElement;
    if (el) {
      // Smooth spring-back only on release
      el.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    }
    if (sheen) {
      sheen.style.opacity = '0';
    }
  }
}
