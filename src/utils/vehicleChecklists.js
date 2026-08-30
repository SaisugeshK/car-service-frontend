// Inspection and Quality-Check checklists, tagged by vehicle category. The job card shows only
// the items that fit its vehicle (CAR / BIKE); items marked BOTH always show. A job card with
// no category set shows everything (unchanged from before this split).

export const INSPECTION_CATEGORY_LABELS = { AC: 'AC / Cooling' };

// [name, appliesTo]  — appliesTo: 'BOTH' | 'CAR' | 'BIKE'
const INSPECTION_DEFS = [
  ['Exterior', 'BOTH'],
  ['Interior', 'CAR'],
  ['Engine', 'BOTH'],
  ['Electrical', 'BOTH'],
  ['Battery', 'BOTH'],
  ['Brakes', 'BOTH'],
  ['Suspension', 'BOTH'],
  ['Tyres', 'BOTH'],
  ['AC', 'CAR'],
  ['Chain & Sprocket', 'BIKE'],
  ['Clutch', 'BIKE'],
  ['Fluids', 'BOTH'],
  ['Lights', 'BOTH'],
  ['Safety', 'BOTH'],
  ['General Condition', 'BOTH'],
];

const QC_DEFS = [
  ['Engine', 'BOTH'],
  ['Brakes', 'BOTH'],
  ['Lights', 'BOTH'],
  ['AC', 'CAR'],
  ['Chain Tension & Lube', 'BIKE'],
  ['Tyres', 'BOTH'],
  ['Road Test', 'BOTH'],
  ['Cleaning', 'BOTH'],
  ['Tools Removed', 'BOTH'],
  ['Old Parts Removed/Returned', 'BOTH'],
  ['Customer Complaint Resolved', 'BOTH'],
];

const pick = (defs, category, keep = []) =>
  defs
    .filter(([name, appliesTo]) => appliesTo === 'BOTH' || !category || appliesTo === category || keep.includes(name))
    .map(([name]) => name);

// existingNames: inspection categories that already have a saved row on this job card — always
// kept visible so switching a vehicle's category never hides data the technician already entered.
export const inspectionCategoriesFor = (category, existingNames = []) => pick(INSPECTION_DEFS, category, existingNames);

export const qcItemsFor = (category) => pick(QC_DEFS, category);
