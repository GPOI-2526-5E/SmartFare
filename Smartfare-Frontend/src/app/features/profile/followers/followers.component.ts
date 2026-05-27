import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { ProfileService } from '../../../core/services/profile.service';
import { UserProfileFull } from '../../../core/models/user-profile.model';
import { AppLoaderComponent } from '../../ui/loader/loader.component';

@Component({
  selector: 'app-followers',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, AppLoaderComponent],
  templateUrl: './followers.component.html',
  styleUrl: './followers.component.css'
})
export class FollowersComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  isLoading = signal(true);
  followers = signal<UserProfileFull[]>([]);
  total = signal(0);

  ngOnInit() {
    this.profileService.getMyFollowers().subscribe((res) => {
      if (res) {
        this.followers.set(res.followers);
        this.total.set(res.total);
      }
      this.isLoading.set(false);
    });
  }

  goBack() {
    this.router.navigate(['/profile']);
  }

  openProfile(user: UserProfileFull) {
    if (user.id) {
      this.router.navigate(['/profile', user.id]);
    }
  }

  personName(user: UserProfileFull): string {
    const name = user.profile?.name || '';
    const surname = user.profile?.surname || '';
    return `${name} ${surname}`.trim() || 'Viaggiatore';
  }

  personInitials(user: UserProfileFull): string {
    const name = this.personName(user);
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  avatarUrl(user: UserProfileFull): string | null {
    return user.profile?.avatarUrl || null;
  }

  cityLabel(user: UserProfileFull): string | null {
    return user.profile?.city?.trim() || null;
  }

  followedAtLabel(user: UserProfileFull): string | null {
    if (!user.followedAt) return null;
    const date = new Date(user.followedAt);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
