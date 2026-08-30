// Shared "All / Car / Bike" segmented filter for catalog pages (Service Master, Products).
//
// A row whose vehicleType is null / '' / 'BOTH' applies to every vehicle, so it shows under
// All, Car AND Bike — never hidden. Matching is case- and whitespace-insensitive so values
// entered as "car", " Car ", "Both", etc. still filter correctly instead of dropping the row.

const norm = (v) => String(v ?? '').trim().toUpperCase();

export const vehicleTypeMatches = (rowVehicleType, target) => {
  const v = norm(rowVehicleType);
  if (!v || v === 'BOTH') return true;
  return v === norm(target);
};

export const vehicleTypeSegments = [
  { value: 'ALL', label: 'All' },
  { value: 'CAR', label: 'Car', predicate: (row) => vehicleTypeMatches(row.vehicleType, 'CAR') },
  { value: 'BIKE', label: 'Bike', predicate: (row) => vehicleTypeMatches(row.vehicleType, 'BIKE') },
];
