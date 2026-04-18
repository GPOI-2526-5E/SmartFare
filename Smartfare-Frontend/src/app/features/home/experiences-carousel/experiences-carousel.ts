import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';


export interface Experience {
  id: number;
  category: string;
  categoryIcon: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  /** CSS gradient used for the category badge */
  accentGradient: string;
  /** Glow rgba color used for card highlight */
  glowColor: string;
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
      category: 'Beach Escapes',
      categoryIcon: '🌊',
      title: 'Go & Explore Beaches',
      subtitle: 'Sun, sand & crystal shores',
      description:
        'Discover the world\'s most beautiful shores, from secluded coves with pristine white sand to vibrant coastal towns. Immerse yourself in the relaxing sounds of the waves, soak up the sun, and dive into crystal-clear waters.',
      imageUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?fm=jpg&q=80&w=1920',
      accentGradient: 'linear-gradient(135deg, #0077b6, #00b4d8)',
      glowColor: 'rgba(0, 180, 216, 0.45)',
    },
    {
      id: 2,
      category: 'Mountain Hiking',
      categoryIcon: '⛰️',
      title: 'Conquer the Peaks',
      subtitle: 'Trails above the clouds',
      description:
        'Experience the thrill of reaching new heights. Our mountain excursions offer breathtaking panoramic views, challenging trails for all levels, and a deep connection with untouched nature.',
      imageUrl:
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?fm=jpg&q=80&w=1920',
      accentGradient: 'linear-gradient(135deg, #6a4c93, #c77dff)',
      glowColor: 'rgba(199, 125, 255, 0.45)',
    },
    {
      id: 3,
      category: 'Deep Sea Diving',
      categoryIcon: '🤿',
      title: 'Discover the Ocean',
      subtitle: 'Unknown depths await',
      description:
        'Explore vibrant coral reefs and majestic marine life. Plunge into the depths of the ocean to experience an unforgettable and mesmerizing underwater world full of colors and mystery.',
      imageUrl:
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?fm=jpg&q=80&w=1920',
      accentGradient: 'linear-gradient(135deg, #005f73, #0a9396)',
      glowColor: 'rgba(10, 147, 150, 0.45)',
    },
    {
      id: 4,
      category: 'Forest Retreat',
      categoryIcon: '🌲',
      title: 'Lost in the Woods',
      subtitle: 'Ancient trees & silence',
      description:
        'Reconnect with tranquility in ancient forests. Walk among towering trees, breathe the fresh pine-scented air, and let the peaceful ambiance of the deep woods rejuvenate your soul.',
      imageUrl:
        'https://images.unsplash.com/photo-1448375240586-882707db888b?fm=jpg&q=80&w=1920',
      accentGradient: 'linear-gradient(135deg, #2d6a4f, #52b788)',
      glowColor: 'rgba(82, 183, 136, 0.45)',
    },
    {
      id: 5,
      category: 'Desert Safari',
      categoryIcon: '🏜️',
      title: 'Sands of Gold',
      subtitle: 'Endless dunes & sunsets',
      description:
        'Embark on an unforgettable journey through golden dunes, starlit skies, and ancient caravan routes that stretch beyond the horizon. Let the silence of the desert speak to you.',
      imageUrl:
        'https://images.unsplash.com/photo-1509316785289-025f5b846b35?fm=jpg&q=80&w=1920',
      accentGradient: 'linear-gradient(135deg, #c77800, #ffb703)',
      glowColor: 'rgba(255, 183, 3, 0.45)',
    },
  ];

  displayExperiences: Experience[] = [];

  @ViewChild('carouselContainer') carouselContainer!: ElementRef;
  @ViewChildren('cardEl') cardElements!: QueryList<ElementRef>;

  activeExperience = signal<Experience>(this.experiences[0]);
  private autoScrollInterval: ReturnType<typeof setInterval> | null = null;
  private isHovering = false;
  private itemWidth = 264;

  ngOnInit() {
    this.displayExperiences = Array(12).fill(this.experiences).flat();
    this.startAutoScroll();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.carouselContainer) {
        const el = this.carouselContainer.nativeElement as HTMLElement;
        el.style.scrollBehavior = 'auto';
        el.scrollLeft = this.itemWidth * this.experiences.length * 4;
        el.style.scrollBehavior = 'smooth';
      }
    }, 80);
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
      }, 3800);
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
    this.carouselContainer?.nativeElement.scrollBy({
      left: -this.itemWidth,
      behavior: 'smooth',
    });
  }

  scrollRight() {
    this.carouselContainer?.nativeElement.scrollBy({
      left: this.itemWidth,
      behavior: 'smooth',
    });
  }

  /** Returns CSS custom properties string for a card's accent colors */
  cardVars(exp: Experience): Record<string, string> {
    return {
      '--card-glow': exp.glowColor,
      '--card-gradient': exp.accentGradient,
    };
  }
}
