import { Component, inject, OnInit, signal, ElementRef, viewChild } from '@angular/core';
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
          <div [class]="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
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
            <div class="flex gap-2 overflow-x-auto pb-2 pl-2 custom-scrollbar max-w-full">
              @for (card of msg.cards; track card.id) {
                <button (click)="openCardModal(card)"
                        class="flex-shrink-0 w-20 bg-dex-surface rounded-lg p-1.5 border border-dex-surface-light hover:border-dex-accent transition-colors">
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
          <div class="flex justify-start">
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
      line-height: 1.65;
      h1, h2, h3, h4 { font-weight: 700; margin-top: 0.75em; margin-bottom: 0.35em; }
      h1 { font-size: 1.15em; }
      h2 { font-size: 1.05em; }
      h3 { font-size: 0.95em; }
      p { margin-bottom: 0.5em; }
      ul, ol { padding-left: 1.4em; margin-bottom: 0.5em; }
      li { margin-bottom: 0.2em; }
      li > ul, li > ol { margin-top: 0.15em; margin-bottom: 0; }
      code { background: rgba(255,255,255,0.1); padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.85em; }
      pre { background: rgba(0,0,0,0.3); padding: 0.6em; border-radius: 6px; overflow-x: auto; margin: 0.5em 0; }
      pre code { background: none; padding: 0; }
      strong { font-weight: 700; }
      em { font-style: italic; }
      a { color: #e94560; text-decoration: underline; }
      blockquote { border-left: 3px solid #0f3460; padding-left: 0.6em; margin: 0.5em 0; opacity: 0.85; }
      table { width: 100%; border-collapse: collapse; margin: 0.5em 0; font-size: 0.85em; }
      th, td { border: 1px solid rgba(255,255,255,0.1); padding: 0.3em 0.5em; text-align: left; }
      th { background: rgba(255,255,255,0.05); font-weight: 600; }
    }
  `],
})
export class ExpertComponent implements OnInit {
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

    // Scroll to user message
    this.scrollToLastMessage();

    try {
      const response = await this.expertService.ask(q, this.sessionId() ?? undefined);
      if (response.sessionId && !this.sessionId()) {
        this.sessionId.set(response.sessionId);
      }
      // Scroll to assistant answer
      this.scrollToLastMessage();
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

  private scrollToLastMessage(): void {
    setTimeout(() => {
      const el = this.messagesContainer()?.nativeElement as HTMLElement | undefined;
      if (!el) return;
      // Find the last message bubble (direct child divs)
      const children = el.querySelectorAll(':scope > div');
      const last = children[children.length - 1] as HTMLElement | undefined;
      if (last) {
        last.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }, 80);
  }
}
