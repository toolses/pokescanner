import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="fixed bottom-0 left-0 right-0 bg-dex-surface border-t border-dex-surface-light z-50"
         style="padding-bottom: env(safe-area-inset-bottom)">
      <div class="flex justify-around items-end h-16 max-w-lg mx-auto">

        <!-- Left: Home -->
        <a routerLink="/" routerLinkActive="text-dex-accent" [routerLinkActiveOptions]="{ exact: true }"
           class="flex flex-col items-center gap-0.5 text-dex-text-muted hover:text-dex-text transition-colors px-3 py-1">
          <span class="text-xl">🏠</span>
          <span class="text-[10px] font-medium">Home</span>
        </a>

        <!-- Left: Collection -->
        <a routerLink="/collection" routerLinkActive="text-dex-accent"
           class="flex flex-col items-center gap-0.5 text-dex-text-muted hover:text-dex-text transition-colors px-3 py-1">
          <span class="text-xl">📦</span>
          <span class="text-[10px] font-medium">Collection</span>
        </a>

        <!-- Center: Pokéball Scan -->
        <a routerLink="/scan" routerLinkActive="scan-active"
           class="flex flex-col items-center -mt-5 pokeball-pulse">
          <svg class="w-14 h-14 drop-shadow-lg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Red top half -->
            <path d="M50 5C26.15 5 5.9 23.3 5.02 47H37.1a13 13 0 0 1 25.8 0h32.08C94.1 23.3 73.85 5 50 5Z" fill="#FF0000"/>
            <!-- White bottom half -->
            <path d="M50 95c23.85 0 44.1-18.3 44.98-42H62.9a13 13 0 0 1-25.8 0H5.02C5.9 76.7 26.15 95 50 95Z" fill="#f5f5ff"/>
            <!-- Black band -->
            <rect x="5" y="47" width="90" height="6" rx="1" fill="#1a1a2e"/>
            <!-- Center circle outer -->
            <circle cx="50" cy="50" r="15" fill="#1a1a2e"/>
            <!-- Center circle inner -->
            <circle cx="50" cy="50" r="11" fill="#f5f5ff"/>
            <!-- SCAN text -->
            <text x="50" y="53.5" text-anchor="middle" fill="#1a1a2e" font-size="9" font-weight="bold" font-family="sans-serif">SCAN</text>
          </svg>
        </a>

        <!-- Right: Search -->
        <a routerLink="/sets" routerLinkActive="text-dex-accent"
           class="flex flex-col items-center gap-0.5 text-dex-text-muted hover:text-dex-text transition-colors px-3 py-1">
          <span class="text-xl">🔍</span>
          <span class="text-[10px] font-medium">Search</span>
        </a>

        <!-- Right: Trainer (Ultra Ball) -->
        <a routerLink="/expert" routerLinkActive="text-dex-accent"
           class="flex flex-col items-center gap-0.5 text-dex-text-muted hover:text-dex-text transition-colors px-3 py-1">
          <svg class="w-6 h-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Black top half -->
            <path d="M50 5C26.15 5 5.9 23.3 5.02 47H37.1a13 13 0 0 1 25.8 0h32.08C94.1 23.3 73.85 5 50 5Z" fill="#1a1a2e"/>
            <!-- Yellow accent band on top half -->
            <path d="M50 12c-18.5 0-34 10.8-38.5 26h7.2C22.8 26.5 35.2 18 50 18s27.2 8.5 31.3 20h7.2C84 22.8 68.5 12 50 12Z" fill="#FFDE00"/>
            <!-- White bottom half -->
            <path d="M50 95c23.85 0 44.1-18.3 44.98-42H62.9a13 13 0 0 1-25.8 0H5.02C5.9 76.7 26.15 95 50 95Z" fill="#f5f5ff"/>
            <!-- Black band -->
            <rect x="5" y="47" width="90" height="6" rx="1" fill="#1a1a2e"/>
            <!-- Center circle outer -->
            <circle cx="50" cy="50" r="15" fill="#1a1a2e"/>
            <!-- Center circle inner -->
            <circle cx="50" cy="50" r="11" fill="#f5f5ff"/>
            <!-- Center dot -->
            <circle cx="50" cy="50" r="4" fill="#1a1a2e"/>
          </svg>
          <span class="text-[10px] font-medium">Trainer</span>
        </a>

      </div>
    </nav>
  `,
  styles: [`
    .scan-active svg { filter: drop-shadow(0 0 8px rgba(255, 0, 0, 0.6)); }
  `],
})
export class NavigationComponent {}
