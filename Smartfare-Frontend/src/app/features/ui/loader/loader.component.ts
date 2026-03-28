import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css',
  standalone: true
})
export class AppLoaderComponent {
  readonly show = input(false);
  readonly message = input('Stiamo preparando la tua esperienza.');
  protected readonly phases = [
    'Connessione ai servizi',
    'Composizione del viaggio',
    'Allineamento dei risultati'
  ];
}
