import { Product } from '../types';
import { CATEGORIES } from '../data/mockData';
import { FLAGSHIP_PRODUCTS } from '../data/flagshipProducts';

export const CANONICAL_SITE_URL = 'https://ais-dev-w4x4rqu6lcepucql6laucs-235870753092.europe-west1.run.app';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface RouteSEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: 'website' | 'product';
  robots: string;
  statusCode: number;
  isKnownRoute: boolean;
  breadcrumbs?: BreadcrumbItem[];
  jsonLdSchemas: object[];
  semanticHtml: string;
}

/**
 * Standard public categories that should be crawled and indexed
 */
export const SEO_PUBLIC_CATEGORIES = [
  'refrigerators',
  'air-conditioners',
  'washing-machines',
  'microwaves',
  'cookers',
  'blenders',
  'vacuums',
  'tvs',
  'audio',
  'laptops',
  'gaming',
  'accessories',
  'ebooks'
];

/**
 * Clean absolute HTTPS URL helper
 */
export function toAbsoluteHttpsUrl(pathOrUrl: string, baseUrl: string): string {
  if (!pathOrUrl) return `${baseUrl}/Logo.png`;
  if (pathOrUrl.startsWith('https://')) return pathOrUrl;
  if (pathOrUrl.startsWith('http://')) {
    // If it's a localhost URL in development, keep or convert
    return pathOrUrl.replace(/^http:\/\//i, 'https://');
  }
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Global Organization schema for NEXOVIRA Ecosystem Nigeria
 */
export function getOrganizationSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'NEXOVIRA Ecosystem',
    'legalName': 'NEXOVIRA Technology Nigeria Limited',
    'url': baseUrl,
    'logo': toAbsoluteHttpsUrl('/Logo.png', baseUrl),
    'description': 'Innovation begins with vision. Smart living, better every day. Premier AI-powered technology ecosystem, verified smart marketplace, and tech engineering services in Nigeria.',
    'founders': [
      {
        '@type': 'Person',
        'name': 'Abdullah Oderinde'
      },
      {
        '@type': 'Person',
        'name': 'Musa Uways'
      }
    ],
    'contactPoint': [
      {
        '@type': 'ContactPoint',
        'telephone': '+234-911-044-3054',
        'contactType': 'customer support',
        'areaServed': 'NG',
        'availableLanguage': ['en']
      }
    ],
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': 'Victoria Island, Lagos',
      'addressRegion': 'Lagos State',
      'addressCountry': 'NG'
    },
    'sameAs': [
      'https://twitter.com/nexovira',
      'https://linkedin.com/company/nexovira'
    ]
  };
}

/**
 * Global WebSite schema with Sitelinks SearchBox
 */
export function getWebSiteSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'NEXOVIRA Ecosystem Nigeria',
    'alternateName': 'NEXOVIRA Nigeria',
    'url': baseUrl,
    'description': 'Premier smart living technology marketplace, certified solar installations, and digital engineering ecosystem in Nigeria.',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${baseUrl}/marketplace?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * BreadcrumbList Schema Generator
 */
export function getBreadcrumbSchema(items: BreadcrumbItem[], baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'name': item.name,
      'item': toAbsoluteHttpsUrl(item.url, baseUrl)
    }))
  };
}

/**
 * Product & Offer Schema Generator (ONLY FOR REAL PRODUCTS)
 */
export function getProductOfferSchema(product: Product, canonicalUrl: string, baseUrl: string) {
  const images = (product.images && product.images.length > 0)
    ? product.images.map(img => toAbsoluteHttpsUrl(img, baseUrl))
    : [toAbsoluteHttpsUrl('/Logo.png', baseUrl)];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': product.title,
    'image': images,
    'description': product.description,
    'sku': product.id,
    'mpn': product.id,
    'brand': {
      '@type': 'Brand',
      'name': product.brand || 'NEXOVIRA'
    },
    'category': product.categoryId,
    'offers': {
      '@type': 'Offer',
      'url': canonicalUrl,
      'priceCurrency': product.currency || 'NGN',
      'price': product.price,
      'priceValidUntil': '2027-12-31',
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'seller': {
        '@type': 'Organization',
        'name': product.sellerName || 'NEXOVIRA Verified Merchant'
      }
    },
    'aggregateRating': product.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      'ratingValue': product.rating || 4.9,
      'reviewCount': product.reviewCount || 1,
      'bestRating': '5',
      'worstRating': '1'
    } : undefined
  };
}

/**
 * Evaluates route SEO metadata, status code, canonical tags, Open Graph, and Structured Data
 */
export function getRouteSEOMetadata(
  rawPath: string,
  baseUrl: string = CANONICAL_SITE_URL,
  productCatalog: Product[] = FLAGSHIP_PRODUCTS
): RouteSEOMetadata {
  const cleanPath = rawPath.split('?')[0].split('#')[0].toLowerCase();
  const orgSchema = getOrganizationSchema(baseUrl);
  const websiteSchema = getWebSiteSchema(baseUrl);
  const defaultLogo = toAbsoluteHttpsUrl('/Logo.png', baseUrl);

  // 1. Homepage
  if (cleanPath === '' || cleanPath === '/') {
    const canonicalUrl = `${baseUrl}/`;
    return {
      title: 'NEXOVIRA Ecosystem Nigeria | Smart Marketplace, Technology and Digital Services..',
      description: 'Explore NEXOVIRA Nigeria: premier technology ecosystem, smart home marketplace, verified engineering services, Nexovira Academy, and digital innovations.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs: [
        { name: 'Home', url: '/' }
      ],
      jsonLdSchemas: [
        orgSchema,
        websiteSchema
      ],
      semanticHtml: `
        <header>
          <h1>NEXOVIRA Ecosystem Nigeria — Smart Marketplace, Technology and Digital Services</h1>
          <p>Innovation begins with vision. Smart living, better every day.</p>
        </header>
        <main>
          <section>
            <h2>Verified Smart Home Appliances & Electronics</h2>
            <p>Browse dual inverter air conditioners, energy-saving French door refrigerators, smart front-load washers, and commercial blenders engineered for Nigeria.</p>
          </section>
          <section>
            <h2>Solar Power Systems & Engineering Solutions</h2>
            <p>Certified LiFePO4 battery banks, hybrid pure sine wave inverters, and expert on-site installations across Lagos and Nigeria.</p>
          </section>
          <section>
            <h2>NEXOVIRA Academy & Skill Verification</h2>
            <p>Vocational scholarships, solar installation certifications, software engineering bootcamps, and digital masterclasses.</p>
          </section>
        </main>
      `
    };
  }

  // 2. Marketplace
  if (cleanPath === '/marketplace') {
    const canonicalUrl = `${baseUrl}/marketplace`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Marketplace', url: '/marketplace' }
    ];
    return {
      title: 'Marketplace & Products | NEXOVIRA Ecosystem Nigeria',
      description: 'Browse verified smart home appliances, computing workstations, inverter solar solutions, and genuine electronics on NEXOVIRA Marketplace.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>NEXOVIRA Technology Marketplace Nigeria</h1>
          <p>Verified merchants, authentic warranties, Paystack escrow protection, and nationwide logistics.</p>
        </header>
        <main>
          <h2>Featured Technology & Appliance Categories</h2>
          <ul>
            ${CATEGORIES.map(c => `<li><a href="/category/${c.id}">${c.name}</a>: ${c.description}</li>`).join('')}
          </ul>
        </main>
      `
    };
  }

  // 3. Product Categories: /category/:catId
  if (cleanPath.startsWith('/category/')) {
    const catId = cleanPath.replace('/category/', '').trim();
    const category = CATEGORIES.find(c => c.id === catId);

    if (!category) {
      return get404Metadata(rawPath, baseUrl);
    }

    const canonicalUrl = `${baseUrl}/category/${catId}`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Marketplace', url: '/marketplace' },
      { name: category.name, url: `/category/${catId}` }
    ];

    const categoryProducts = productCatalog.filter(p => p.categoryId === catId);

    return {
      title: `${category.name} | NEXOVIRA Marketplace Nigeria`,
      description: `Buy genuine ${category.name} in Nigeria. ${category.description} Verified quality, warranty, and fast delivery on NEXOVIRA.`,
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>${category.name} — NEXOVIRA Nigeria</h1>
          <p>${category.description}</p>
        </header>
        <main>
          <h2>Available ${category.name}</h2>
          ${categoryProducts.length > 0 ? `
            <ul>
              ${categoryProducts.map(p => `
                <li>
                  <a href="/product/${p.id}"><strong>${p.title}</strong></a> - ₦${p.price.toLocaleString()} (${p.brand})
                  <p>${p.description}</p>
                </li>
              `).join('')}
            </ul>
          ` : `<p>Viewing official ${category.name} catalog with nationwide delivery across Lagos, Abuja, Port Harcourt, and Nigeria.</p>`}
        </main>
      `
    };
  }

  // 4. Product Details: /product/:productId (ONLY FOR REAL PRODUCTS)
  if (cleanPath.startsWith('/product/')) {
    const productId = cleanPath.replace('/product/', '').trim();
    const product = productCatalog.find(p => p.id === productId);

    if (!product) {
      // Unknown or non-existent product MUST return 404!
      return get404Metadata(rawPath, baseUrl, `Product "${productId}" not found`);
    }

    const canonicalUrl = `${baseUrl}/product/${product.id}`;
    const category = CATEGORIES.find(c => c.id === product.categoryId);
    const categoryName = category?.name || 'Electronics';

    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Marketplace', url: '/marketplace' },
      { name: categoryName, url: `/category/${product.categoryId}` },
      { name: product.title, url: `/product/${product.id}` }
    ];

    const primaryImg = product.images?.[0] ? toAbsoluteHttpsUrl(product.images[0], baseUrl) : defaultLogo;

    return {
      title: `${product.title} | Buy Online | NEXOVIRA Nigeria`,
      description: `${product.description.slice(0, 155)}... Buy ${product.title} with verified warranty on NEXOVIRA Nigeria.`,
      canonicalUrl,
      ogImage: primaryImg,
      ogType: 'product',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl),
        getProductOfferSchema(product, canonicalUrl, baseUrl)
      ],
      semanticHtml: `
        <article itemscope itemtype="https://schema.org/Product">
          <header>
            <h1 itemprop="name">${product.title}</h1>
            <p>Brand: <span itemprop="brand">${product.brand}</span> | Category: ${categoryName}</p>
          </header>
          <section>
            <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
              <p>Price: <span itemprop="priceCurrency">NGN</span> <strong itemprop="price">${product.price.toLocaleString()}</strong></p>
              <p>Availability: ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
              <p>Seller: ${product.sellerName} (${product.sellerVerified ? 'Verified Merchant' : 'Merchant'})</p>
            </div>
            <h2>Description & Key Features</h2>
            <div itemprop="description">
              <p>${product.description}</p>
            </div>
            <ul>
              ${product.keyFeatures?.map(kf => `<li>${kf}</li>`).join('') || ''}
            </ul>
            <h2>Technical Specifications</h2>
            <dl>
              ${Object.entries(product.specifications || {}).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}
            </dl>
          </section>
        </article>
      `
    };
  }

  // 5. Services
  if (cleanPath === '/services' || cleanPath === '/book-service' || cleanPath === '/services/nigeria' || cleanPath === '/services-nigeria') {
    const canonicalUrl = `${baseUrl}/services`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Services', url: '/services' }
    ];
    return {
      title: 'Verified Technology & Engineering Services in Nigeria | NEXOVIRA',
      description: 'Hire vetted Nigerian tech experts for solar inverter installations, software engineering, smart home automation, and appliance repairs.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>Verified Technology & Engineering Services — NEXOVIRA Nigeria</h1>
          <p>Direct access to licensed Nigerian technicians, certified solar installers, and software engineers with escrow-backed guarantees.</p>
        </header>
        <main>
          <h2>Engineering & Technical Specialties</h2>
          <ul>
            <li>Solar & Renewable Energy Inverter Sizing, Setup & Maintenance</li>
            <li>Smart Home Automation, IoT Sensor Integration & CCTV Security</li>
            <li>Inverter AC & Commercial Refrigeration Diagnostics & Repairs</li>
            <li>Full-Stack Software Engineering, AI Integrations & Digital Solutions</li>
          </ul>
        </main>
      `
    };
  }

  // 6. Academy
  if (cleanPath === '/academy') {
    const canonicalUrl = `${baseUrl}/academy`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Academy', url: '/academy' }
    ];
    return {
      title: 'NEXOVIRA Academy & Tech Scholarship Program | Nigeria',
      description: 'Learn in-demand engineering, AI development, solar technology, and digital skills with expert mentorship and certified credentials at NEXOVIRA Academy.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>NEXOVIRA Academy & Scholarship Program</h1>
          <p>Empowering African youth, engineers, and digital entrepreneurs through certified hands-on vocational courses and technology scholarships.</p>
        </header>
        <main>
          <h2>Featured Technical Disciplines</h2>
          <ul>
            <li>Solar Inverter Engineering & Lithium Energy Storage Systems</li>
            <li>Artificial Intelligence, Machine Learning & Automation</li>
            <li>Full-Stack Web & Mobile Software Development</li>
            <li>Digital Entrepreneurship, E-Commerce & Global Affiliate Marketing</li>
          </ul>
        </main>
      `
    };
  }

  // 7. Digital Library
  if (cleanPath === '/library') {
    const canonicalUrl = `${baseUrl}/library`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Digital Library', url: '/library' }
    ];
    return {
      title: 'Digital Library & Technical Resources | NEXOVIRA Nigeria',
      description: 'Access technical blueprints, engineering manuals, solar sizing calculators, and open-source software guides on NEXOVIRA Digital Library.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>NEXOVIRA Digital Technical Library</h1>
          <p>Curated engineering blueprints, solar wiring schematics, technical documentation, and high-impact digital guides.</p>
        </header>
      `
    };
  }

  // 8. AI Workspace
  if (cleanPath === '/ai') {
    const canonicalUrl = `${baseUrl}/ai`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'AI Workspace', url: '/ai' }
    ];
    return {
      title: 'AI Workspace & Smart Intelligent Tools | NEXOVIRA',
      description: 'Leverage intelligent AI tools, automated engineering assistants, and productivity workspace powered by advanced Gemini AI on NEXOVIRA.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>NEXOVIRA Intelligent AI Workspace</h1>
          <p>Next-generation artificial intelligence tools for product recommendations, energy load analysis, automated diagnostics, and workflow automation.</p>
        </header>
      `
    };
  }

  // 9. Affiliate
  if (cleanPath === '/affiliate') {
    const canonicalUrl = `${baseUrl}/affiliate`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Affiliate Program', url: '/affiliate' }
    ];
    return {
      title: 'Affiliate Partner Program | Earn High Commissions | NEXOVIRA',
      description: 'Join the official NEXOVIRA Affiliate Program. Earn competitive commissions by recommending verified smart tech, services, and digital products.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>NEXOVIRA High-Commission Affiliate Partner Program</h1>
          <p>Partner with Nigeria's fastest growing tech ecosystem. Earn up to 30% commissions on verified physical products, services, and academy enrollments.</p>
        </header>
      `
    };
  }

  // 10. About
  if (cleanPath === '/about') {
    const canonicalUrl = `${baseUrl}/about`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'About', url: '/about' }
    ];
    return {
      title: 'About NEXOVIRA | Vision, Founders & Technology Ecosystem',
      description: 'Discover NEXOVIRA: founded by Abdullah Oderinde & Musa Uways to empower African smart living, digital infrastructure, and vocational excellence.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>About NEXOVIRA Technology Ecosystem</h1>
          <p>Co-founded by Abdullah Oderinde & Musa Uways with the mission to pioneer sustainable smart living, verified technical vocational skills, and trusted commerce.</p>
        </header>
      `
    };
  }

  // 11. Contact
  if (cleanPath === '/contact') {
    const canonicalUrl = `${baseUrl}/contact`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Contact', url: '/contact' }
    ];
    return {
      title: 'Contact NEXOVIRA Support & Corporate Headquarters | Lagos, Nigeria',
      description: 'Get in touch with NEXOVIRA customer support, vendor relations, corporate headquarters in Lagos, or reach our official WhatsApp hotline.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>Contact NEXOVIRA Headquarters & Customer Care</h1>
          <p>Lagos Innovation Center: Victoria Island, Lagos, Nigeria. Phone: +234 911 044 3054. Email: nexovirasupport@gmail.com.</p>
        </header>
      `
    };
  }

  // 12. Privacy
  if (cleanPath === '/privacy') {
    const canonicalUrl = `${baseUrl}/privacy`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Privacy Policy', url: '/privacy' }
    ];
    return {
      title: 'Privacy Policy & Data Protection | NEXOVIRA Nigeria',
      description: 'Learn how NEXOVIRA securely collects, protects, and handles personal data in accordance with the Nigeria Data Protection Regulation (NDPR) and global standards.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>NEXOVIRA Privacy Policy & NDPR Compliance</h1>
          <p>Comprehensive information regarding user data collection, cookie usage, payment security, and data protection rights.</p>
        </header>
      `
    };
  }

  // 13. Terms
  if (cleanPath === '/terms') {
    const canonicalUrl = `${baseUrl}/terms`;
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Terms of Service', url: '/terms' }
    ];
    return {
      title: 'Terms of Service & Marketplace Agreement | NEXOVIRA Nigeria',
      description: 'Review the terms and conditions governing the use of NEXOVIRA marketplace, buyer guarantees, vendor requirements, and platform policies.',
      canonicalUrl,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'index, follow',
      statusCode: 200,
      isKnownRoute: true,
      breadcrumbs,
      jsonLdSchemas: [
        orgSchema,
        getBreadcrumbSchema(breadcrumbs, baseUrl)
      ],
      semanticHtml: `
        <header>
          <h1>NEXOVIRA Platform Terms of Service</h1>
          <p>Marketplace transaction policies, dispute resolution, merchant terms, and buyer protection guidelines.</p>
        </header>
      `
    };
  }

  // 14. Private or Utility routes (Noindex, keep from search results)
  const isPrivateDashboard = [
    '/admin',
    '/account',
    '/signin',
    '/signup',
    '/cart',
    '/checkout'
  ].includes(cleanPath) || cleanPath.startsWith('/dashboard/');

  if (isPrivateDashboard) {
    return {
      title: 'Secure Account Portal | NEXOVIRA',
      description: 'Authorized account access and user dashboard on NEXOVIRA.',
      canonicalUrl: `${baseUrl}${cleanPath}`,
      ogImage: defaultLogo,
      ogType: 'website',
      robots: 'noindex, nofollow',
      statusCode: 200,
      isKnownRoute: true,
      jsonLdSchemas: [],
      semanticHtml: `<p>Secure portal loading...</p>`
    };
  }

  // 15. Unknown Route -> MUST Return 404!
  return get404Metadata(rawPath, baseUrl);
}

/**
 * 404 Response generator
 */
export function get404Metadata(rawPath: string, baseUrl: string, customMessage?: string): RouteSEOMetadata {
  const defaultLogo = toAbsoluteHttpsUrl('/Logo.png', baseUrl);
  return {
    title: '404 - Page Not Found | NEXOVIRA Ecosystem Nigeria',
    description: 'The page you requested does not exist on NEXOVIRA Ecosystem. Return to the marketplace to browse authentic products and services.',
    canonicalUrl: `${baseUrl}/404`,
    ogImage: defaultLogo,
    ogType: 'website',
    robots: 'noindex, follow',
    statusCode: 404,
    isKnownRoute: false,
    jsonLdSchemas: [],
    semanticHtml: `
      <header>
        <h1>404 — Page Not Found</h1>
        <p>${customMessage || `The page "${rawPath}" could not be located on the NEXOVIRA platform.`}</p>
      </header>
      <main>
        <p><a href="/">Return to NEXOVIRA Homepage</a> or explore our <a href="/marketplace">Marketplace</a>.</p>
      </main>
    `
  };
}

/**
 * Generates valid XML sitemap with ONLY public canonical routes
 */
export function generateSitemapXml(baseUrl: string, products: Product[] = FLAGSHIP_PRODUCTS): string {
  const today = new Date().toISOString().split('T')[0];

  const staticPublicRoutes = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: '/marketplace', priority: '0.9', changefreq: 'daily' },
    ...SEO_PUBLIC_CATEGORIES.map(cat => ({
      path: `/category/${cat}`,
      priority: '0.8',
      changefreq: 'weekly'
    })),
    { path: '/services', priority: '0.8', changefreq: 'weekly' },
    { path: '/book-service', priority: '0.7', changefreq: 'weekly' },
    { path: '/academy', priority: '0.8', changefreq: 'weekly' },
    { path: '/library', priority: '0.7', changefreq: 'weekly' },
    { path: '/ai', priority: '0.7', changefreq: 'weekly' },
    { path: '/affiliate', priority: '0.7', changefreq: 'monthly' },
    { path: '/about', priority: '0.6', changefreq: 'monthly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
    { path: '/terms', priority: '0.5', changefreq: 'monthly' }
  ];

  const productUrls = products.map(p => ({
    path: `/product/${p.id}`,
    priority: '0.8',
    changefreq: 'weekly'
  }));

  const allEntries = [...staticPublicRoutes, ...productUrls];

  const urlElements = allEntries.map(e => `
  <url>
    <loc>${baseUrl}${e.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

/**
 * Generates valid plain text robots.txt referencing canonical sitemap URL
 */
export function generateRobotsTxt(baseUrl: string): string {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard/
Disallow: /account
Disallow: /seller
Disallow: /expert
Disallow: /cart
Disallow: /checkout
Disallow: /payment/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
}
