import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NavigationComponent } from './components/navigation/navigation.component';
import { NotificationService } from './services/notification.service';
import { AdminService } from './services/admin.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavigationComponent],
  template: `
    <div class="h-dvh overflow-hidden bg-dex-bg flex flex-col">
      <div class="flex-1 overflow-y-auto overscroll-y-none">
        <router-outlet />
        @if (!isLoginPage()) {
          <div class="shrink-0" aria-hidden="true" style="height: calc(4rem + env(safe-area-inset-bottom))"></div>
        }
      </div>
    </div>
    @if (!isLoginPage()) {
      <app-navigation />
    }

    <!-- Admin floating button (top-right) -->
    @if (!isLoginPage() && !isAdminPage() && admin.isAdmin()) {
      <a routerLink="/admin"
         class="fixed top-4 right-4 z-[90] w-9 h-9 flex items-center justify-center rounded-full bg-dex-surface/80 backdrop-blur border border-dex-surface-light text-dex-gold hover:bg-dex-surface hover:border-dex-gold/30 transition-all shadow-lg"
         title="Admin">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </a>
    }

    <!-- Toast Notifications -->
    @if (notifications.toasts().length) {
      <div class="fixed top-4 right-4 left-4 z-[100] flex flex-col gap-2 max-w-lg mx-auto">
        @for (n of notifications.toasts(); track n.id) {
          <div class="rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-slide-in"
               [class]="n.type === 'error' ? 'bg-dex-error text-dex-text' : 'bg-dex-success text-dex-bg'">
            {{ n.message }}
          </div>
        }
      </div>
    }
  `,
  styles: [`
    @keyframes slide-in {
      from { opacity: 0; transform: translateY(-1rem); }
      to { opacity: 1; transform: translateY(0); }
    }
    :host .animate-slide-in { animation: slide-in 0.2s ease-out; }
  `],
})
export class AppComponent {
  readonly notifications = inject(NotificationService);
  readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  readonly isLoginPage = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects === '/login'),
    ),
    { initialValue: false },
  );

  readonly isAdminPage = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects.startsWith('/admin')),
    ),
    { initialValue: false },
  );
}
