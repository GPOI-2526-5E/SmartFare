import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css',
  standalone: true
})
export class AppLoaderComponent {
  readonly show = input(false);
}
