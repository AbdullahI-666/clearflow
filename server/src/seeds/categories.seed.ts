import { ServiceCategory } from '../models/serviceCategory.model.js';

export const seedCategories = async () => {
  await ServiceCategory.deleteMany({});
  const categories = [
    { name: 'Cleaning', description: 'Deep cleaning, routine sanitation, and floor maintenance', isPaid: true, isWaste: false, basePrice: 1200 },
    { name: 'Electrical Repair', description: 'Wiring fixes, light replacement, generator checks, and circuit repairs', isPaid: true, isWaste: false, basePrice: 2000 },
    { name: 'Plumbing', description: 'Leak repairs, pipe replacement, drain unblocking, and fixture installs', isPaid: true, isWaste: false, basePrice: 1500 },
    { name: 'Pest Control', description: 'Fumigation, rodent elimination, termite control, and barrier sprays', isPaid: true, isWaste: false, basePrice: 3500 },
    { name: 'Gardening', description: 'Lawn mowing, tree trimming, landscaping, and irrigation maintenance', isPaid: true, isWaste: false, basePrice: 1800 },
    { name: 'General Waste Collection', description: 'Institutional trash pickup, dumpsters clearing, and sorting', isPaid: false, isWaste: true, basePrice: 0 },
    { name: 'E-Waste Recycling', description: 'Secure disposal and recycling of computers, electronics, and batteries with certificate', isPaid: false, isWaste: true, basePrice: 0 }
  ];
  await ServiceCategory.insertMany(categories);
  console.log('[Seed] Service categories seeded successfully (7 categories)');
};
