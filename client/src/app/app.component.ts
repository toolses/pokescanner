import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent],
  template: `
    <main class="min-h-screen pb-20">
      <router-outlet />
    </main>
    <app-navigation />

    <!-- Toast Notifications -->
    @if (notifications.toasts().length) {
      <div class="fixed top-4 right-4 left-4 z-[100] flex flex-col gap-2 max-w-lg mx-auto">
        @for (n of notifications.toasts(); track n.id) {
          <div class="rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-slide-in"
               [class]="n.type === 'error' ? 'bg-red-500 text-white' : 'bg-dex-success text-dex-bg'">
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
}
