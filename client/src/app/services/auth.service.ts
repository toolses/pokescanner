import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';
import type { User, Session } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  private readonly _user = signal<User | null>(null);
  private readonly _session = signal<Session | null>(null);
  private readonly _loading = signal(true);

  readonly user = this._user.asReadonly();
  readonly session = this._session.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly displayName = computed(() =>
    this._user()?.user_metadata?.['full_name'] ?? this._user()?.email ?? null,
  );

  constructor() {
    this.restoreSession();
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);
      this._loading.set(false);
    });
  }

  async signUp(
    userName: string,
    email: string,
    password: string,
  ): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: userName } },
    });

    if (error) return { error: error.message };

    // Create user_profiles row via backend
    if (data.session) {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiBaseUrl}/auth/register-profile`, {
            userName,
            emailAddress: email,
          }),
        );
      } catch {
        // Profile creation failed but Supabase account exists — non-blocking
      }
    }

    return { error: null };
  }

  async signInWithUsername(
    userName: string,
    password: string,
  ): Promise<{ error: string | null }> {
    // Resolve username → email via backend
    let email: string;
    try {
      const result = await firstValueFrom(
        this.http.post<{ email: string }>(`${environment.apiBaseUrl}/auth/resolve-username`, {
          userName,
        }),
      );
      email = result.email;
    } catch {
      return { error: 'Username not found.' };
    }

    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this._user.set(null);
    this._session.set(null);
    // Lazy import to avoid circular dependency (AdminService → AuthService)
    const { AdminService } = await import('./admin.service');
    this.injector.get(AdminService).reset();
  }

  private async restoreSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this._session.set(data.session);
    this._user.set(data.session?.user ?? null);
    this._loading.set(false);
  }
}
