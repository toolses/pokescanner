import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'scan',
    loadComponent: () =>
      import('./components/scanner/scanner.component').then(m => m.ScannerComponent),
  },
  {
    path: 'collection',
    loadComponent: () =>
      import('./components/collection/collection.component').then(m => m.CollectionComponent),
  },
  {
    path: 'collection/:id',
    loadComponent: () =>
      import('./components/card-detail/card-detail.component').then(m => m.CardDetailComponent),
  },
  {
    path: 'sets',
    loadComponent: () =>
      import('./components/sets/sets.component').then(m => m.SetsComponent),
  },
  {
    path: 'sets/:id',
    loadComponent: () =>
      import('./components/set-detail/set-detail.component').then(m => m.SetDetailComponent),
  },
  {
    path: 'cards/:id',
    loadComponent: () =>
      import('./components/tcg-card-detail/tcg-card-detail.component').then(m => m.TcgCardDetailComponent),
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./components/wishlist/wishlist.component').then(m => m.WishlistComponent),
  },
  {
    path: 'expert',
    loadComponent: () =>
      import('./components/expert/expert.component').then(m => m.ExpertComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
