import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() activeTab: string = 'FLIGHT';
  @Output() tabChange = new EventEmitter<string>();

  services = [
    { id: 'FLIGHT', label: 'Voli', icon: 'bi-airplane-fill' },
    { id: 'TRAIN', label: 'Treni', icon: 'bi-train-front-fill' },
    { id: 'HOTEL', label: 'Hotel', icon: 'bi-building-fill' }
  ];

  secondary = [
    { label: 'Home', path: '/', icon: 'bi-house-fill' },
    { label: 'Esplora', path: '/explore', icon: 'bi-compass-fill' },
    { label: 'Preferiti', path: '/favs', icon: 'bi-heart-fill' }
  ];
}
