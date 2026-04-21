import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-builder-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container">
      <div class="map-placeholder">
        <i class="bi bi-map"></i>
        <span>Visualizzazione Mappa</span>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      height: 100%;
      width: 100%;
      background: #111827; /* Very Dark Slate */
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .map-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: rgba(255, 255, 255, 0.4);
    }
    i { font-size: 3rem; }
    span { font-weight: 600; font-size: 1.2rem; }
  `]
})
export class BuilderMapComponent {}
