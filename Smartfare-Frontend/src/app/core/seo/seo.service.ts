import { DOCUMENT } from '@angular/common';
import { Injectable, inject, Renderer2, RendererFactory2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DEFAULT_SITE_URL,
  SEO_PAGES,
  SITE_NAME,
  SITE_NAVIGATION,
  SITE_TAGLINE,
  SeoPageConfig
} from './seo.config';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(RendererFactory2).createRenderer(null, null);

  private readonly jsonLdScriptId = 'smartfare-seo-jsonld';

  init(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const seoKey = this.resolveSeoKey();
        const config = seoKey ? SEO_PAGES[seoKey] : SEO_PAGES['home'];
        if (config) {
          this.applyPageSeo(config);
        }
      });

    const initialKey = this.resolveSeoKey();
    const initial = (initialKey && SEO_PAGES[initialKey]) || SEO_PAGES['home'];
    this.applyPageSeo(initial);
  }

  getSiteUrl(): string {
    const url = (environment as { siteUrl?: string }).siteUrl?.trim();
    return (url || DEFAULT_SITE_URL).replace(/\/$/, '');
  }

  private resolveSeoKey(): string | undefined {
    let route: ActivatedRoute | null = this.router.routerState.root;
    let seoKey: string | undefined;

    while (route) {
      if (route.snapshot.data['seoKey']) {
        seoKey = route.snapshot.data['seoKey'] as string;
      }
      route = route.firstChild;
    }

    return seoKey;
  }

  private applyPageSeo(config: SeoPageConfig): void {
    const siteUrl = this.getSiteUrl();
    const canonicalPath = config.path.startsWith('/') ? config.path : `/${config.path}`;
    const canonicalUrl = `${siteUrl}${canonicalPath === '/' ? '' : canonicalPath}`;
    const fullTitle = config.title.includes(SITE_NAME) ? config.title : `${config.title} | ${SITE_NAME}`;

    this.title.setTitle(fullTitle);

    this.setMetaTag('name', 'description', config.description);
    this.setMetaTag('name', 'robots', config.robots ?? 'index, follow');
    if (config.keywords) {
      this.setMetaTag('name', 'keywords', config.keywords);
    }

    this.setMetaTag('property', 'og:title', fullTitle);
    this.setMetaTag('property', 'og:description', config.description);
    this.setMetaTag('property', 'og:type', config.ogType ?? 'website');
    this.setMetaTag('property', 'og:url', canonicalUrl);
    this.setMetaTag('property', 'og:site_name', SITE_NAME);
    this.setMetaTag('property', 'og:locale', 'it_IT');
    this.setMetaTag('property', 'og:image', `${siteUrl}/favicon.png`);

    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', fullTitle);
    this.setMetaTag('name', 'twitter:description', config.description);
    this.setMetaTag('name', 'twitter:image', `${siteUrl}/favicon.png`);

    this.setCanonicalLink(canonicalUrl);
    this.injectJsonLd(siteUrl, canonicalUrl, config);
  }

  private setMetaTag(attr: 'name' | 'property', selector: string, content: string): void {
    const key = attr === 'name' ? `name="${selector}"` : `property="${selector}"`;
    if (this.meta.getTag(key)) {
      this.meta.updateTag({ [attr]: selector, content });
    } else {
      this.meta.addTag({ [attr]: selector, content });
    }
  }

  private setCanonicalLink(url: string): void {
    const head = this.document.head;
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'rel', 'canonical');
      this.renderer.appendChild(head, link);
    }
    this.renderer.setAttribute(link, 'href', url);
  }

  private injectJsonLd(siteUrl: string, pageUrl: string, config: SeoPageConfig): void {
    const isHome = config.path === '/';
    const navigation = SITE_NAVIGATION.map((item) => ({
      '@type': 'SiteNavigationElement',
      name: item.name,
      url: `${siteUrl}${item.url}`,
      ...(item.description ? { description: item.description } : {})
    }));

    const graph: Record<string, unknown>[] = [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo: `${siteUrl}/favicon.png`,
        email: 'info.smartfare@gmail.com',
        sameAs: []
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_TAGLINE,
        inLanguage: 'it-IT',
        publisher: { '@id': `${siteUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/discover?q={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: config.title,
        description: config.description,
        isPartOf: { '@id': `${siteUrl}/#website` },
        inLanguage: 'it-IT'
      }
    ];

    if (isHome) {
      graph.push({
        '@type': 'ItemList',
        '@id': `${siteUrl}/#navigation`,
        name: 'Navigazione principale SmartFare',
        itemListElement: navigation.map((nav, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: nav
        }))
      });
    }

    const payload = {
      '@context': 'https://schema.org',
      '@graph': graph
    };

    this.replaceJsonLdScript(JSON.stringify(payload));
  }

  private replaceJsonLdScript(json: string): void {
    const head = this.document.head;
    this.document.getElementById('smartfare-static-jsonld')?.remove();
    const existing = this.document.getElementById(this.jsonLdScriptId);
    if (existing) {
      existing.remove();
    }

    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'type', 'application/ld+json');
    this.renderer.setAttribute(script, 'id', this.jsonLdScriptId);
    script.text = json;
    this.renderer.appendChild(head, script);
  }
}
