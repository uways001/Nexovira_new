import { Product } from '../types';

export const FLAGSHIP_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    title: 'Nexovira UltraFrost 520L French Door Inverter Refrigerator',
    brand: 'Nexovira Smart Living',
    categoryId: 'refrigerators',
    price: 785000,
    originalPrice: 850000,
    discountPercentage: 8,
    currency: 'NGN',
    rating: 4.9,
    reviewCount: 64,
    stock: 18,
    sellerId: 'store-1',
    sellerName: 'NexaTech Global Store',
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    images: [
      'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Energy-saving French door refrigerator featuring dual inverter cooling, multi-airflow humidity retention, and smart Wi-Fi temperature diagnostics for Nigerian households.',
    keyFeatures: [
      '520 Liters total net storage capacity',
      'Dual inverter digital compressor with 10-year motor warranty',
      'Power blackout cold-storage retention up to 18 hours',
      'Touch LED exterior temperature control display'
    ],
    specifications: {
      'Capacity': '520 Liters',
      'Cooling Type': 'No Frost Dual Inverter',
      'Voltage': '220-240V / 50Hz Surge Protected',
      'Energy Rating': 'A+++ Efficiency'
    },
    warranty: '2 Years Manufacturer Warranty + 10 Years Compressor',
    featured: true,
    isFlashDeal: true,
    isBestSeller: true,
    tags: ['refrigerator', 'smart home', 'inverter', 'kitchen']
  },
  {
    id: 'prod-2',
    title: 'Nexovira Dual Inverter Silent Air Conditioner 1.5HP with Smart WiFi',
    brand: 'Nexovira Climate',
    categoryId: 'air-conditioners',
    price: 425000,
    originalPrice: 470000,
    discountPercentage: 10,
    currency: 'NGN',
    rating: 4.85,
    reviewCount: 52,
    stock: 25,
    sellerId: 'store-1',
    sellerName: 'NexaTech Global Store',
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    images: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527018607616-a656a38cb4d9?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Ultra-quiet 1.5 HP dual-inverter split AC engineered for rapid cooling in tropical climates with low-voltage operation down to 135V, perfect for inverter generator setups.',
    keyFeatures: [
      'Low voltage startup (Runs on 135V - 260V)',
      'Smart WiFi smartphone app & Alexa/Google Assistant control',
      '70% energy efficiency boost vs conventional non-inverter systems',
      'GoldFin anti-corrosive condenser coil coating'
    ],
    specifications: {
      'Horsepower': '1.5 HP (12,000 BTU)',
      'Refrigerant': 'R410A Eco-Friendly Gas',
      'Noise Level': '19 dB Whisper Mode',
      'Filter': 'High-Density Antibacterial Filter'
    },
    warranty: '2 Years Full Unit + 5 Years Inverter Motor',
    featured: true,
    isBestSeller: true,
    tags: ['air conditioner', 'inverter', 'cooling', 'smart climate']
  },
  {
    id: 'prod-3',
    title: 'EcoSteam 10.5kg Front-Load Smart AI Washer & Dryer Combo',
    brand: 'EcoCare Pro',
    categoryId: 'washing-machines',
    price: 560000,
    originalPrice: 620000,
    discountPercentage: 10,
    currency: 'NGN',
    rating: 4.88,
    reviewCount: 39,
    stock: 14,
    sellerId: 'store-2',
    sellerName: 'ElectraHome Hub',
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    images: [
      'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Direct drive inverter washer-dryer with AI fabric detection, steam allergy care, and rapid 15-minute wash cycles.',
    keyFeatures: [
      '10.5kg Wash / 7kg Dry all-in-one capacity',
      'AI DD intelligent fabric protection',
      'Allergy Care Steam kills 99.9% of dust mites and allergens',
      'TurboWash 360 water spray precision'
    ],
    specifications: {
      'Drum Volume': '10.5 kg',
      'Spin Speed': '1400 RPM',
      'Motor': 'Inverter Direct Drive',
      'Display': 'Full Touch LED Console'
    },
    warranty: '2 Years Comprehensive + 10 Years Direct Drive Motor',
    featured: true,
    tags: ['washing machine', 'laundry', 'washer dryer', 'smart home']
  },
  {
    id: 'prod-4',
    title: 'SolarFlow 5kVA / 48V Hybrid Pure Sine Wave Inverter & LiFePO4 Station',
    brand: 'Nexovira Energy',
    categoryId: 'accessories',
    price: 1350000,
    originalPrice: 1490000,
    discountPercentage: 9,
    currency: 'NGN',
    rating: 4.95,
    reviewCount: 88,
    stock: 12,
    sellerId: 'store-3',
    sellerName: 'Apex Computing & Energy',
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    images: [
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Heavy-duty 5kVA hybrid solar power station designed for 24/7 uninterrupted residential and office backup in Nigeria. Features integrated MPPT solar charge controller.',
    keyFeatures: [
      '5000W continuous output / 10000W surge peak',
      'Built-in 100A MPPT solar charge controller',
      'Seamless 10ms UPS transfer time for computers and sensitive electronics',
      'Integrated LiFePO4 battery communication protocol'
    ],
    specifications: {
      'Rated Power': '5000VA / 5000W',
      'DC Input': '48V DC',
      'AC Output': '230V AC Pure Sine Wave',
      'Solar Max Input': '450V DC / 5000W PV Array'
    },
    warranty: '3 Years Warranty & Local Lagos Service Center Support',
    featured: true,
    isBestSeller: true,
    tags: ['solar inverter', 'energy', 'lifepo4', 'backup power', 'generator alternative']
  },
  {
    id: 'prod-5',
    title: 'Nexovira Vision Neo 65-Inch 4K UHD Smart QLED TV with Dolby Vision',
    brand: 'Nexovira Vision',
    categoryId: 'tvs',
    price: 820000,
    originalPrice: 900000,
    discountPercentage: 9,
    currency: 'NGN',
    rating: 4.92,
    reviewCount: 45,
    stock: 20,
    sellerId: 'store-1',
    sellerName: 'NexaTech Global Store',
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    images: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Quantum Dot 4K cinema display with 120Hz native refresh rate, HDR10+, Dolby Atmos sound, and Google TV operating system.',
    keyFeatures: [
      'Quantum Dot QLED Panel with 100% color volume',
      'Native 120Hz VRR support for PlayStation 5 & Xbox Series X',
      'Built-in Google TV with Netflix, Prime Video & YouTube 4K',
      'Ultra-slim frameless aerospace aluminum design'
    ],
    specifications: {
      'Screen Size': '65 Inches',
      'Resolution': '3840 x 2160 (4K UHD)',
      'Audio Output': '60W Dolby Atmos Acoustic System',
      'Ports': '4x HDMI 2.1, 2x USB 3.0, Optical, LAN'
    },
    warranty: '2 Years Manufacturer Guarantee',
    featured: true,
    tags: ['smart tv', 'qled', '4k tv', 'home cinema', 'gaming']
  },
  {
    id: 'prod-6',
    title: 'Apex Titan AI 16-Inch Professional Workstation Laptop',
    brand: 'Apex Tech',
    categoryId: 'laptops',
    price: 1480000,
    originalPrice: 1650000,
    discountPercentage: 10,
    currency: 'NGN',
    rating: 4.96,
    reviewCount: 78,
    stock: 16,
    sellerId: 'store-3',
    sellerName: 'Apex Computing & Energy',
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'High-performance engineering and AI developer laptop powered by Intel Core Ultra 9, NVIDIA RTX 4070 8GB GPU, 32GB DDR5 RAM, and 1TB NVMe Gen4 SSD.',
    keyFeatures: [
      'Intel Core Ultra 9 processor with dedicated NPU AI engine',
      'NVIDIA GeForce RTX 4070 8GB GDDR6 graphics',
      '16-inch 3.2K 165Hz 100% DCI-P3 color calibrated display',
      'All-day 99Wh battery with 140W USB-C fast charging'
    ],
    specifications: {
      'Processor': 'Intel Core Ultra 9 185H (16 Cores)',
      'Memory': '32GB DDR5 5600MHz (Upgradable)',
      'Storage': '1TB PCIe 4.0 NVMe SSD',
      'Operating System': 'Windows 11 Pro'
    },
    warranty: '2 Years Official Warranty & Priority Technical Care',
    featured: true,
    tags: ['laptop', 'workstation', 'ai hardware', 'computing', 'developer laptop']
  },
  {
    id: 'prod-7',
    title: 'Nexovira ProPulse Digital High-Speed Commercial Blender & Extractor',
    brand: 'Nexovira Home',
    categoryId: 'blenders',
    price: 89000,
    originalPrice: 105000,
    discountPercentage: 15,
    currency: 'NGN',
    rating: 4.82,
    reviewCount: 110,
    stock: 35,
    sellerId: 'store-1',
    sellerName: 'NexaTech Global Store',
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    images: [
      'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Commercial 2200W high-speed blender capable of crushing ice, beans, nuts, and tigernut smoothies in seconds.',
    keyFeatures: [
      '2200W heavy-duty pure copper motor',
      'Japanese hardened stainless steel 6-blade assembly',
      'Unbreakable BPA-free 2.5L tritan pitcher',
      'Variable 10-speed dial with pulse control'
    ],
    specifications: {
      'Power': '2200 Watts',
      'Capacity': '2.5 Liters',
      'Speed': '38,000 RPM Max',
      'Overheat Protection': 'Automated thermal cutoff sensor'
    },
    warranty: '1 Year Warranty',
    featured: true,
    tags: ['blender', 'kitchen appliances', 'commercial blender', 'food processor']
  },
  {
    id: 'prod-8',
    title: 'Nexovira Smart Solar Engineering & Grid-Tied Blueprint Handbook (PDF)',
    brand: 'Nexovira Academy',
    categoryId: 'ebooks',
    price: 25000,
    originalPrice: 35000,
    discountPercentage: 28,
    currency: 'NGN',
    rating: 4.94,
    reviewCount: 142,
    stock: 999,
    sellerId: 'store-3',
    sellerName: 'Apex Computing & Energy',
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    images: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Comprehensive 280-page engineering guide and schematic blueprint for sizing, wiring, and commissioning solar inverter systems and lithium batteries in Nigeria.',
    keyFeatures: [
      'Instant digital PDF download with lifetime updates',
      'Load calculation spreadsheets and real-world installation templates',
      'Safety, earthing, surge protection and Nigerian grid standards',
      'Includes troubleshooting flowcharts and inverter wiring diagrams'
    ],
    specifications: {
      'Format': 'PDF E-Book (Print-ready 300 DPI)',
      'Pages': '280 Pages with full color diagrams',
      'Language': 'English',
      'Author': 'NEXOVIRA Engineering Research Group'
    },
    warranty: '30-Day Money-Back Guarantee',
    featured: true,
    tags: ['ebook', 'solar guide', 'engineering blueprint', 'training', 'digital product']
  }
];
