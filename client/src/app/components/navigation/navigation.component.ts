import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="fixed bottom-0 left-0 right-0 bg-dex-surface border-t border-dex-surface-light safe-bottom z-50">
      <div class="flex justify-around items-center h-16 max-w-lg mx-auto">
        @for (item of navItems; track item.path) {
          <a [routerLink]="item.path"
             routerLinkActive="text-dex-accent"
             [routerLinkActiveOptions]="{ exact: item.exact }"
             class="flex flex-col items-center gap-0.5 text-dex-text-muted hover:text-dex-text transition-colors px-3 py-1">
            <span class="text-xl">{{ item.icon }}</span>
            <span class="text-[10px] font-medium">{{ item.label }}</span>
          </a>
        }
      </div>
    </nav>
  `,
})
export class NavigationComponent {
  readonly navItems = [
    { path: '/', icon: '🏠', label: 'Home', exact: true },
    { path: '/scan', icon: '📷', label: 'Scan', exact: false },
    { path: '/collection', icon: '📦', label: 'Collection', exact: false },
    { path: '/sets', icon: '�', label: 'Search', exact: false },
    { path: '/expert', icon: '🧠', label: 'Expert', exact: false },
  ];
}
