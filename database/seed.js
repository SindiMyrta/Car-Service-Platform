require('dotenv').config();
const mongoose = require('mongoose');

const DiscountTier = require('../models/DiscountTier');
const Category     = require('../models/Category');
const Part         = require('../models/Part');
const ShippingRate = require('../models/ShippingRate');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Duke ngarkuar të dhënat fillestare...');

    await Promise.all([
        DiscountTier.deleteMany({}),
        Category.deleteMany({}),
        Part.deleteMany({}),
        ShippingRate.deleteMany({})
    ]);

    // Nivelet e diskontit
    const tiers = await DiscountTier.insertMany([
        { name: 'Fillestar', minOrders: 0,  maxOrders: 2,    percentage: 0  },
        { name: 'Bronze',    minOrders: 3,  maxOrders: 9,    percentage: 5  },
        { name: 'Silver',    minOrders: 10, maxOrders: 19,   percentage: 10 },
        { name: 'Gold',      minOrders: 20, maxOrders: null, percentage: 15 },
    ]);

    // Kategoritë
    const categories = await Category.insertMany([
        { name: 'Motor',      slug: 'motor'      },
        { name: 'Frena',      slug: 'frena'      },
        { name: 'Suspension', slug: 'suspension' },
        { name: 'Elektrike',  slug: 'elektrike'  },
        { name: 'Karburant',  slug: 'karburant'  },
        { name: 'Ndricim',    slug: 'ndricim'    },
    ]);
    const cat = {};
    categories.forEach(c => { cat[c.slug] = c._id; });

    // Pjesët e këmbimit
    await Part.insertMany([
        { sku: 'FIL-001', name: 'Filter vaji',          category: cat.motor,      price: 8.50,   stock: 120, weightKg: 0.3,  imageUrl: '/images/parts/filtervaji.jpg'          },
        { sku: 'FIL-002', name: 'Filter ajri',           category: cat.motor,      price: 12.00,  stock: 85,  weightKg: 0.5,  imageUrl: '/images/parts/filterajri.jpg'           },
        { sku: 'FIL-003', name: 'Filter karburanti',     category: cat.karburant,  price: 9.50,   stock: 60,  weightKg: 0.4,  imageUrl: '/images/parts/filterkarburanti.jpg'     },
        { sku: 'FRE-001', name: 'Disk freni para',      category: cat.frena,      price: 45.00,  stock: 40,  weightKg: 3.5,  imageUrl: '/images/parts/diskfreni.jpg'           },
        { sku: 'FRE-002', name: 'Ferrota freni para',   category: cat.frena,      price: 22.00,  stock: 75,  weightKg: 1.2,  imageUrl: '/images/parts/ferrotapara.jpg'        },
        { sku: 'FRE-003', name: 'Ferrota freni mbrapa',  category: cat.frena,      price: 18.00,  stock: 65,  weightKg: 1.0,  imageUrl: '/images/parts/ferrotambrapa.jpg'   },
        { sku: 'SUS-001', name: 'Amortizator para',      category: cat.suspension, price: 85.00,  stock: 25,  weightKg: 5.0,  imageUrl: '/images/parts/amortizatorpara.jpg'      },
        { sku: 'SUS-002', name: 'Amortizator mbrapa',     category: cat.suspension, price: 75.00,  stock: 20,  weightKg: 4.5,  imageUrl: '/images/parts/amortizatormbrapa.jpg'     },
        { sku: 'SUS-003', name: 'Pragu i amortizatorit', category: cat.suspension, price: 15.00,  stock: 50,  weightKg: 0.8,  imageUrl: '/images/parts/praguamortizatorit.jpg'   },
        { sku: 'ELE-001', name: 'Bateri 60Ah',           category: cat.elektrike,  price: 95.00,  stock: 30,  weightKg: 15.0, imageUrl: '/images/parts/bateri.jpg'               },
        { sku: 'ELE-002', name: 'Alternator',             category: cat.elektrike,  price: 145.00, stock: 12,  weightKg: 6.0,  imageUrl: '/images/parts/alternator.jpg'           },
        { sku: 'NDR-001', name: 'Llambe H4',             category: cat.ndricim,    price: 7.50,   stock: 200, weightKg: 0.1,  imageUrl: '/images/parts/llambeH4.jpg'             },
        { sku: 'NDR-002', name: 'Llambe LED far',         category: cat.ndricim,    price: 35.00,  stock: 45,  weightKg: 0.4,  imageUrl: '/images/parts/llambeledFar.jpg'         },
        { sku: 'MOT-001', name: 'Rrip distribucioni',   category: cat.motor,      price: 55.00,  stock: 35,  weightKg: 0.6,  imageUrl: '/images/parts/rripdistribucioni.jpg'   },
        { sku: 'MOT-002', name: 'Garniture cilindri',    category: cat.motor,      price: 120.00, stock: 10,  weightKg: 1.5,  imageUrl: '/images/parts/garnitura.jpg'            },
    ]);

    // Tarifat postare
    await ShippingRate.insertMany([
        { zoneName: 'Lokal (0-50km)',      baseCost: 1.00, costPerKm: 0, minKm: 0,  maxKm: 50   },
        { zoneName: 'Rajonale (51-150km)', baseCost: 2.00, costPerKm: 0, minKm: 51, maxKm: 150  },
        { zoneName: 'Kombëtare (151km+)',  baseCost: 3.00, costPerKm: 0, minKm: 151, maxKm: null },
    ]);

    console.log('Te dhenat u ngarkuan me sukses!');
    console.log('Tani mund te regjistrohesh nga faqja: http://localhost:3000');

    await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
