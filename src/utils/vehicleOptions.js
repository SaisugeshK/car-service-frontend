// Car vs Bike specific dropdown choices for the vehicle forms. vehicleType (body style) and
// fuelType are free-text columns on the backend, so these lists only shape the UI.

const BODY = {
  CAR: ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Van', 'Other'],
  BIKE: ['Scooter', 'Motorcycle', 'Sports', 'Cruiser', 'Moped', 'Other'],
};

const FUEL = {
  CAR: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'],
  BIKE: ['Petrol', 'Electric'],
};

export const bodyTypeOptions = (category) => (BODY[category] || []).map((v) => ({ value: v, label: v }));
export const fuelTypeOptions = (category) => (FUEL[category] || []).map((v) => ({ value: v, label: v }));
