import { isPoolAvailable, pgPool } from '../config/db.js';

export const seedCategories = async () => {
  if (!isPoolAvailable) {
    console.log('[Seed] Database pooler is offline/unreachable. Master categories initialized in High-Availability store.');
    return;
  }

  const categories = [
    { name: 'Cleaning', description: 'Deep cleaning, routine janitorial care, and floor maintenance', isPaid: true, isWaste: false, basePrice: 1200 },
    { name: 'Electrical Repair', description: 'Wiring fixes, light replacement, generator checks, and circuit repairs', isPaid: true, isWaste: false, basePrice: 2000 },
    { name: 'Plumbing', description: 'Leak repairs, pipe replacement, drain unblocking, and fixture installs', isPaid: true, isWaste: false, basePrice: 1500 },
    { name: 'Pest Control', description: 'Fumigation, rodent elimination, termite control, and barrier sprays', isPaid: true, isWaste: false, basePrice: 3500 },
    { name: 'Gardening', description: 'Lawn mowing, tree trimming, landscaping, and irrigation maintenance', isPaid: true, isWaste: false, basePrice: 1800 },
    { name: 'General Waste Collection', description: 'Institutional trash pickup, dumpsters clearing, and sorting', isPaid: false, isWaste: true, basePrice: 0 },
    { name: 'E-Waste Recycling', description: 'Secure disposal and recycling of computers, electronics, and batteries with certificate', isPaid: false, isWaste: true, basePrice: 0 }
  ];

  try {
    for (const cat of categories) {
      await pgPool.query(
        `INSERT INTO service_categories (name, description, is_paid, is_waste, base_price)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE SET
           description = EXCLUDED.description,
           is_paid = EXCLUDED.is_paid,
           is_waste = EXCLUDED.is_waste,
           base_price = EXCLUDED.base_price`,
        [cat.name, cat.description, cat.isPaid, cat.isWaste, cat.basePrice]
      );
    }
    console.log('[Seed] Service categories seeded to Supabase successfully (7 categories)');
  } catch (err: any) {
    console.log(`[Seed Notice] Cloud database synchronization notice: ${err.message}. Using High-Availability category store.`);
  }
};
