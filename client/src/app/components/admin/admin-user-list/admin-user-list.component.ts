import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminUserService } from '../../../services/admin-user.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-admin-user-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-user-list.component.html',
})
export class AdminUserListComponent implements OnInit {
  protected readonly userService = inject(AdminUserService);
  private readonly notify = inject(NotificationService);

  protected readonly searchQuery = signal('');

  async ngOnInit(): Promise<void> {
    await this.userService.loadUsers();
  }

  async search(): Promise<void> {
    await this.userService.loadUsers(this.searchQuery() || undefined);
  }

  async toggleAdmin(userId: string, currentIsAdmin: boolean): Promise<void> {
    const ok = await this.userService.toggleAdmin(userId, !currentIsAdmin);
    if (ok) {
      this.notify.success(`Admin status updated`);
    } else {
      this.notify.error('Could not update user');
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
