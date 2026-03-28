import { Component } from '@angular/core';

@Component({
  selector: 'app-top-navbar',
  imports: [],
  templateUrl: './top-navbar.component.html',
  styleUrl: './top-navbar.component.css',
})
export class TopNavbarComponent {

languages = [
    { code: 'en', label: 'English' },
    { code: 'it', label: 'Italiano' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' }
  ];

  selectedLanguage: string = 'en';
}
