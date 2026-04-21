import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-builder-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sidebar-container">
      <h3>Selezione Hotel & Attività</h3>
      <p>Qui potrai cercare e selezionare elementi per il tuo itinerario.</p>
    </div>
  `,
  styles: [`
    .sidebar-container {
      padding: 20px;
      height: 100%;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(10px);
      color: #fff;
    }
    h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: #fff; }
    p { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
  `]
})
export class BuilderSidebarComponent {}
