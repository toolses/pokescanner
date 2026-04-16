import { Component, effect, inject, OnInit, signal, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { ExpertService, ExpertCardResult } from '../../services/expert.service';
import { NotificationService } from '../../services/notification.service';
import { CardModalComponent, CardModalDetails } from '../card-modal/card-modal.component';

@Component({
  selector: 'app-expert',
  standalone: true,
  imports: [FormsModule, CardModalComponent],
  template: `
    <div class="max-w-lg mx-auto p-4 flex flex-col h-[calc(100dvh-5rem)]">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-display font-bold text-dex-text">PokéExpert</h1>
        <button (click)="newSession()"
                class="text-xs bg-dex-surface-light text-dex-text-muted px-3 py-1.5 rounded-lg hover:text-dex-text">
          New chat
        </button>
      </div>

      <!-- Messages -->
      <div #messagesContainer class="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
        @if (messages().length === 0 && !loading()) {
          <div class="text-center py-12 text-dex-text-muted">
            <span class="text-5xl block mb-3">🧠</span>
            <p class="font-medium mb-2">Ask the PokéExpert!</p>
            <p class="text-xs">Questions about cards, decks, strategies, sets, and more.</p>
            <div class="mt-4 space-y-2">
              @for (suggestion of suggestions; track suggestion) {
                <button (click)="askQuestion(suggestion)"
                        class="block w-full text-left bg-dex-surface rounded-lg p-3 text-sm text-dex-text-muted hover:text-dex-text border border-dex-surface-light hover:border-dex-accent transition-colors">
                  {{ suggestion }}
                </button>
              }
            </div>
          </div>
        }

        @for (msg of messages(); track msg.id) {
          <div data-msg [class]="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
            <div [class]="msg.role === 'user'
              ? 'bg-dex-accent text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[85%]'
              : 'bg-dex-surface text-dex-text rounded-2xl rounded-bl-sm px-4 py-3 w-full border border-dex-surface-light'">
              @if (msg.role === 'user') {
                <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
              } @else {
                <div class="text-sm prose-chat leading-relaxed" [innerHTML]="renderMarkdown(msg.content)"></div>
              }
              @if (msg.modelUsed) {
                <p class="text-[10px] mt-1 opacity-50">{{ msg.modelUsed }}</p>
              }
            </div>
          </div>

          <!-- Card results attached to assistant message -->
          @if (msg.cards?.length) {
            <div class="grid grid-cols-4 gap-2 mt-1">
              @for (card of msg.cards; track card.id) {
                <button (click)="openCardModal(card)"
                        class="bg-dex-surface rounded-lg p-1.5 border border-dex-surface-light hover:border-dex-accent transition-colors">
                  @if (card.image) {
                    <img [src]="card.image + '/high.webp'" [alt]="card.name"
                         class="w-full aspect-[3/4] object-contain rounded bg-dex-bg mb-1" loading="lazy" />
                  }
                  <p class="text-[10px] text-dex-text truncate">{{ card.name }}</p>
                </button>
              }
            </div>
          }
        }

        @if (loading()) {
          <div data-msg class="flex justify-start">
            <div class="bg-dex-surface rounded-2xl rounded-bl-sm px-4 py-3 border border-dex-surface-light">
              <div class="flex gap-1">
                <span class="w-2 h-2 bg-dex-text-muted rounded-full animate-bounce"></span>
                <span class="w-2 h-2 bg-dex-text-muted rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
                <span class="w-2 h-2 bg-dex-text-muted rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="flex gap-2">
        <input type="text"
               [(ngModel)]="userInput"
               (keydown.enter)="send()"
               placeholder="Ask about Pokémon cards..."
               [disabled]="loading()"
               class="flex-1 bg-dex-surface border border-dex-surface-light rounded-xl px-4 py-3 text-dex-text text-sm placeholder-dex-text-muted disabled:opacity-50" />
        <button (click)="send()"
                [disabled]="!userInput.trim() || loading()"
                class="bg-dex-accent hover:bg-dex-accent-dark text-white font-semibold px-5 py-3 rounded-xl transition-colors disabled:opacity-50">
          →
        </button>
      </div>
    </div>

    <app-card-modal
      [imageUrl]="modalImageUrl()"
      [cardName]="modalCardName()"
      [visible]="modalVisible()"
      [details]="modalDetails()"
      (close)="modalVisible.set(false)" />
  `,
  styles: [`
    :host ::ng-deep .prose-chat {
      line-height: 1.7;
      font-size: 0.875rem;
    }
    :host ::ng-deep .prose-chat > *:first-child { margin-top: 0; }
    :host ::ng-deep .prose-chat > *:last-child { margin-bottom: 0; }

    :host ::ng-deep .prose-chat h1,
    :host ::ng-deep .prose-chat h2,
    :host ::ng-deep .prose-chat h3,
    :host ::ng-deep .prose-chat h4 {
      font-weight: 700;
      color: var(--color-dex-gold);
      margin-top: 1em;
      margin-bottom: 0.4em;
      line-height: 1.3;
    }
    :host ::ng-deep .prose-chat h1 { font-size: 1.1em; }
    :host ::ng-deep .prose-chat h2 { font-size: 1.0em; }
    :host ::ng-deep .prose-chat h3 { font-size: 0.95em; }

    :host ::ng-deep .prose-chat p {
      margin-top: 0;
      margin-bottom: 0.65em;
    }

    :host ::ng-deep .prose-chat ul {
      list-style-type: disc;
      padding-left: 1.4em;
      margin-bottom: 0.65em;
    }
    :host ::ng-deep .prose-chat ol {
      list-style-type: decimal;
      padding-left: 1.4em;
      margin-bottom: 0.65em;
    }
    :host ::ng-deep .prose-chat li {
      margin-bottom: 0.3em;
    }
    :host ::ng-deep .prose-chat li > ul,
    :host ::ng-deep .prose-chat li > ol {
      margin-top: 0.2em;
      margin-bottom: 0.1em;
    }
    :host ::ng-deep .prose-chat li > ul { list-style-type: circle; }

    :host ::ng-deep .prose-chat strong {
      font-weight: 700;
      color: rgba(255, 255, 255, 0.95);
    }
    :host ::ng-deep .prose-chat em {
      font-style: italic;
      color: rgba(255, 255, 255, 0.8);
    }

    :host ::ng-deep .prose-chat code {
      background: rgba(255, 255, 255, 0.12);
      padding: 0.15em 0.4em;
      border-radius: 4px;
      font-size: 0.82em;
      font-family: monospace;
    }
    :host ::ng-deep .prose-chat pre {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.75em 1em;
      border-radius: 8px;
      overflow-x: auto;
      margin: 0.6em 0;
    }
    :host ::ng-deep .prose-chat pre code {
      background: none;
      padding: 0;
      font-size: 0.85em;
    }

    :host ::ng-deep .prose-chat blockquote {
      border-left: 3px solid var(--color-dex-gold);
      padding-left: 0.75em;
      margin: 0.6em 0;
      opacity: 0.8;
      font-style: italic;
    }

    :host ::ng-deep .prose-chat hr {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin: 0.75em 0;
    }

    :host ::ng-deep .prose-chat a {
      color: var(--color-dex-accent);
      text-decoration: underline;
    }

    :host ::ng-deep .prose-chat table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.65em 0;
      font-size: 0.85em;
    }
    :host ::ng-deep .prose-chat th,
    :host ::ng-deep .prose-chat td {
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 0.35em 0.6em;
      text-align: left;
    }
    :host ::ng-deep .prose-chat th {
      background: rgba(255, 255, 255, 0.07);
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }
  `],
})
export class ExpertComponent implements OnInit {
  constructor() {
    effect(() => {
      this.messages();
      this.loading();
      this.scrollToLatestEntry();
    });
  }

  private readonly expertService = inject(ExpertService);
  private readonly notifications = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly messagesContainer = viewChild<ElementRef>('messagesContainer');

  readonly messages = this.expertService.messages;
  readonly loading = this.expertService.loading;

  readonly sessionId = signal<string | null>(null);
  readonly modalVisible = signal(false);
  readonly modalImageUrl = signal('');
  readonly modalCardName = signal('');
  readonly modalDetails = signal<CardModalDetails | null>(null);
  userInput = '';

  private markdownCache = new Map<string, SafeHtml>();

  readonly suggestions = [
    'What are the most valuable Charizard cards?',
    'How do I identify 1st Edition cards?',
    'Show me Pikachu cards',
    'Best starter deck for beginners?',
  ];

  ngOnInit(): void {
    this.expertService.loadSessions();
  }

  newSession(): void {
    this.sessionId.set(null);
    this.expertService.clearMessages();
  }

  async askQuestion(question: string): Promise<void> {
    this.userInput = question;
    await this.send();
  }

  async send(): Promise<void> {
    const q = this.userInput.trim();
    if (!q) return;

    this.userInput = '';

    try {
      const response = await this.expertService.ask(q, this.sessionId() ?? undefined);
      if (response.sessionId && !this.sessionId()) {
        this.sessionId.set(response.sessionId);
      }
    } catch {
      this.notifications.error('Failed to get a response. Please try again.');
    }
  }

  renderMarkdown(content: string): SafeHtml {
    const cached = this.markdownCache.get(content);
    if (cached) return cached;
    const html = marked.parse(content, { async: false }) as string;
    const safe = this.sanitizer.bypassSecurityTrustHtml(html);
    this.markdownCache.set(content, safe);
    return safe;
  }

  openCardModal(card: ExpertCardResult): void {
    if (!card.image) return;
    this.modalImageUrl.set(card.image + '/high.webp');
    this.modalCardName.set(card.name);
    this.modalDetails.set(null);
    this.modalVisible.set(true);
  }

  private scrollToLatestEntry(): void {
    setTimeout(() => {
      const el = this.messagesContainer()?.nativeElement as HTMLElement | undefined;
      if (!el) return;
      const entries = el.querySelectorAll('[data-msg]');
      const last = entries[entries.length - 1] as HTMLElement | undefined;
      if (last) {
        last.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
