import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'scan',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/scanner/scanner.component').then(m => m.ScannerComponent),
  },
  {
    path: 'collection',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/collection/collection.component').then(m => m.CollectionComponent),
  },
  {
    path: 'collection/binders/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/binder-detail/binder-detail.component').then(m => m.BinderDetailComponent),
  },
  {
    path: 'collection/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/card-detail/card-detail.component').then(m => m.CardDetailComponent),
  },
  {
    path: 'sets',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/sets/sets.component').then(m => m.SetsComponent),
  },
  {
    path: 'sets/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/set-detail/set-detail.component').then(m => m.SetDetailComponent),
  },
  {
    path: 'cards/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/tcg-card-detail/tcg-card-detail.component').then(m => m.TcgCardDetailComponent),
  },
  {
    path: 'wishlist',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/wishlist/wishlist.component').then(m => m.WishlistComponent),
  },
  {
    path: 'expert',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/expert/expert.component').then(m => m.ExpertComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./components/admin/admin-layout/admin-layout.component').then(
        m => m.AdminLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/admin/admin-dashboard/admin-dashboard.component').then(
            m => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./components/admin/admin-user-list/admin-user-list.component').then(
            m => m.AdminUserListComponent,
          ),
      },
      {
        path: 'traces',
        loadComponent: () =>
          import('./components/admin/admin-traces/admin-traces.component').then(
            m => m.AdminTracesComponent,
          ),
      },
      {
        path: 'api-test',
        loadComponent: () =>
          import('./components/admin/admin-api-test/admin-api-test.component').then(
            m => m.AdminApiTestComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
