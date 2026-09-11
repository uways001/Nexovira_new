import React, { useEffect } from 'react';
import { Product } from '../types';
import { getRouteSEOMetadata, CANONICAL_SITE_URL } from '../lib/seoConfig';

interface SEOHeadProps {
  currentPath?: string;
  selectedProduct?: Product | null;
  products?: Product[];
}

export const SEOHead: React.FC<SEOHeadProps> = ({ currentPath, selectedProduct, products = [] }) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const path = currentPath || window.location.pathname;
    const origin = window.location.origin.includes('localhost') 
      ? CANONICAL_SITE_URL 
      : window.location.origin;

    const seo = getRouteSEOMetadata(path, origin, products);

    // 1. Title
    document.title = seo.title;

    // 2. Helper to set/update meta tags
    const setMetaTag = (selector: string, attr: string, value: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        const [key, val] = selector.replace(/[\[\]]/g, '').split('=');
        element.setAttribute(key, val.replace(/['"]/g, ''));
        document.head.appendChild(element);
      }
      element.setAttribute(attr, value);
    };

    // 3. Helper for link tags
    const setLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    // Description & Robots
    setMetaTag('meta[name="description"]', 'content', seo.description);
    setMetaTag('meta[name="robots"]', 'content', seo.robots);

    // Canonical
    setLinkTag('canonical', seo.canonicalUrl);

    // OpenGraph
    setMetaTag('meta[property="og:title"]', 'content', seo.title);
    setMetaTag('meta[property="og:description"]', 'content', seo.description);
    setMetaTag('meta[property="og:url"]', 'content', seo.canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'content', seo.ogImage);
    setMetaTag('meta[property="og:type"]', 'content', seo.ogType);
    setMetaTag('meta[property="og:site_name"]', 'content', 'NEXOVIRA Ecosystem Nigeria');

    // Twitter Card
    setMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'content', seo.title);
    setMetaTag('meta[name="twitter:description"]', 'content', seo.description);
    setMetaTag('meta[name="twitter:image"]', 'content', seo.ogImage);

    // JSON-LD Structured Data Script
    let jsonLdScript = document.getElementById('nexovira-jsonld-schema') as HTMLScriptElement;
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'nexovira-jsonld-schema';
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }

    if (seo.jsonLdSchemas && seo.jsonLdSchemas.length > 0) {
      jsonLdScript.textContent = JSON.stringify(
        seo.jsonLdSchemas.length === 1 ? seo.jsonLdSchemas[0] : seo.jsonLdSchemas
      );
    } else {
      jsonLdScript.textContent = '';
    }
  }, [currentPath, selectedProduct, products]);

  return null;
};
