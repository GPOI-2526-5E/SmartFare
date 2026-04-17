import { Component, signal, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Experience {
  id: number;
  category: string;
  title: string;
  description: string;
  imageUrl: string;
}

@Component({
  selector: 'app-experiences-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiences-carousel.html',
  styleUrl: './experiences-carousel.css',
})
export class ExperiencesCarousel implements OnInit, AfterViewInit, OnDestroy {
  experiences: Experience[] = [
    {
      id: 1,
      category: 'Beach Experience',
      title: 'Go & Explore Beaches',
      description: 'Discover the world\'s most beautiful shores, from secluded coves with pristine white sand to vibrant coastal towns. Immerse yourself in the relaxing sounds of the waves, soak up the sun, and dive into crystal-clear waters.',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?fm=jpg&q=80&w=1920'
    },
    {
      id: 2,
      category: 'Mountain Hiking',
      title: 'Conquer the Peaks',
      description: 'Experience the thrill of reaching new heights. Our mountain excursions offer breathtaking panoramic views, challenging trails for all levels, and a deep connection with untouched nature.',
      imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?fm=jpg&q=80&w=1920'
    },
    {
      id: 3,
      category: 'Deep Sea Diving',
      title: 'Discover the Ocean',
      description: 'Explore vibrant coral reefs and majestic marine life. Plunge into the depths of the ocean to experience an unforgettable and mesmerizing underwater world full of colors and mystery.',
      imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?fm=jpg&q=80&w=1920'
    },
    {
      id: 4,
      category: 'Forest Retreat',
      title: 'Lost in the Woods',
      description: 'Reconnect with tranquility in ancient forests. Walk among towering trees, breathe the fresh pine-scented air, and let the peaceful ambiance of the deep woods rejuvenate your soul.',
      imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?fm=jpg&q=80&w=1920'
    }
  ];

  displayExperiences: Experience[] = [];
  @ViewChild('carouselContainer') carouselContainer!: ElementRef;
  activeExperience = signal<Experience>(this.experiences[0]);
  private autoScrollInterval: any = null;
  private isHovering = false;
  private itemWidth = 250; // Approximated width for scrolling

  ngOnInit() {
    // Clone array 15 times to provide a virtually infinite scroll without runtime array shifts (prevents scroll jumps)
    this.displayExperiences = Array(15).fill(this.experiences).flat();
    this.startAutoScroll();
  }

  ngAfterViewInit() {
    // Start somewhere in the middle so user can scroll left or right immediately
    setTimeout(() => {
      if (this.carouselContainer) {
        this.carouselContainer.nativeElement.scrollBehavior = 'auto';
        this.carouselContainer.nativeElement.scrollLeft = this.itemWidth * 4 * 5; 
        this.carouselContainer.nativeElement.scrollBehavior = 'smooth';
      }
    }, 100);
  }

  ngOnDestroy() {
    this.stopAutoScroll();
  }

  selectExperience(exp: Experience) {
    this.activeExperience.set(exp);
  }

  startAutoScroll() {
    if (!this.autoScrollInterval) {
      this.autoScrollInterval = setInterval(() => {
        if (!this.isHovering) {
          this.scrollRight();
        }
      }, 3500); 
    }
  }

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  onMouseEnter() {
    this.isHovering = true;
  }

  onMouseLeave() {
    this.isHovering = false;
  }

  scrollLeft() {
    if (this.carouselContainer) {
      this.carouselContainer.nativeElement.scrollBy({ left: -this.itemWidth, behavior: 'smooth' });
    }
  }

  scrollRight() {
    if (this.carouselContainer) {
      this.carouselContainer.nativeElement.scrollBy({ left: this.itemWidth, behavior: 'smooth' });
    }
  }
}
