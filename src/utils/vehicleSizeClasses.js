// Fixed vehicle size bands. Service Master stores an explicit price per band; an estimate quotes
// the price for the customer's vehicle size, falling back to the service's base price.

export const SIZE_CLASSES = {
  CAR: [
    ['SMALL', 'Small / Hatchback'],
    ['SEDAN', 'Sedan'],
    ['SUV', 'SUV'],
    ['MUV', 'MUV'],
    ['LUXURY', 'Luxury'],
  ],
  BIKE: [
    ['STANDARD', 'Standard'],
    ['PREMIUM', 'Premium'],
  ],
};

export const sizeClassesFor = (category) =>
  (SIZE_CLASSES[category] || []).map(([value, label]) => ({ value, label }));

export const vehicleSizeClassLabel = (code) => {
  for (const list of Object.values(SIZE_CLASSES)) {
    const hit = list.find(([v]) => v === code);
    if (hit) return hit[1];
  }
  return code || '';
};
