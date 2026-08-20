import * as yup from 'yup';

const phoneRegex = /^[0-9]{7,15}$/;
const barcodeRegex = /^[0-9A-Za-z-]{4,32}$/;

export const loginSchema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export const registerSchema = yup.object({
  username: yup.string().required('Username is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(6, 'At least 6 characters').required('Password is required'),
});

export const roleSchema = yup.object({
  roleName: yup.string().required('Role name is required'),
  description: yup.string().nullable(),
});

export const userSchema = yup.object({
  username: yup.string().required('Username is required'),
  firstName: yup.string().nullable(),
  lastName: yup.string().nullable(),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  mobileNumber: yup
    .string()
    .matches(phoneRegex, 'Enter a valid phone number')
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  password: yup.string().nullable(),
  roleId: yup.number().typeError('Role is required').required('Role is required'),
  status: yup.string().nullable(),
});

export const supplierSchema = yup.object({
  supplierName: yup.string().required('Supplier name is required'),
  contactPerson: yup.string().nullable(),
  phone: yup.string().matches(phoneRegex, 'Enter a valid phone number').required('Phone is required'),
  email: yup.string().email('Enter a valid email').nullable(),
  address: yup.string().nullable(),
  status: yup.string().required('Status is required'),
});

export const categorySchema = yup.object({
  categoryName: yup.string().required('Category name is required'),
  description: yup.string().nullable(),
  status: yup.string().required('Status is required'),
});

export const customerSchema = yup.object({
  customerName: yup.string().required('Customer name is required'),
  phone: yup.string().matches(phoneRegex, 'Enter a valid phone number').required('Phone is required'),
  email: yup.string().email('Enter a valid email').nullable(),
  address: yup.string().nullable(),
  city: yup.string().nullable(),
  gstin: yup.string().nullable(),
  notes: yup.string().nullable(),
  status: yup.string().required('Status is required'),
});

// Products only — physical, stock-tracked, inventory-deducting items. Services live entirely in
// serviceMasterSchema/service_master; there is no itemType toggle here anymore.
export const productSchema = yup.object({
  categoryId: yup.number().typeError('Category is required').required('Category is required'),
  productName: yup.string().required('Product name is required'),
  brand: yup.string().nullable(),
  sku: yup.string().required('SKU is required'),
  barcode: yup
    .string()
    .matches(barcodeRegex, 'Enter a valid barcode')
    .required('Barcode is required'),
  purchasePrice: yup
    .number()
    .typeError('Enter a valid amount')
    .positive('Must be positive')
    .required('Purchase price is required'),
  sellingPrice: yup
    .number()
    .typeError('Enter a valid amount')
    .positive('Must be positive')
    .required('Selling price is required'),
  gstPercentage: yup
    .number()
    .typeError('Enter a valid percentage')
    .min(0, 'Cannot be negative')
    .max(100, 'Cannot exceed 100')
    .nullable()
    .transform((v) => (Number.isNaN(v) ? null : v)),
  stockQuantity: yup
    .number()
    .typeError('Enter a valid quantity')
    .min(0, 'Cannot be negative')
    .required('Opening stock is required'),
  minimumStock: yup
    .number()
    .typeError('Enter a valid quantity')
    .min(0, 'Cannot be negative')
    .required('Minimum stock is required'),
  unit: yup.string().required('Unit is required'),
  status: yup.string().required('Status is required'),
});

export const vehicleSchema = yup.object({
  customerId: yup.number().typeError('Customer is required').required('Customer is required'),
  make: yup.string().nullable(),
  vehicleModel: yup.string().required('Vehicle model is required'),
  variant: yup.string().nullable(),
  registrationNumber: yup.string().required('Registration number is required'),
  odometer: yup.number().typeError('Enter a valid odometer reading').min(0).nullable(),
  vehicleType: yup.string().nullable(),
  fuelType: yup.string().nullable(),
  color: yup.string().nullable(),
  year: yup.number().typeError('Enter a valid year').nullable(),
  chassisNumber: yup.string().nullable(),
  engineNumber: yup.string().nullable(),
  notes: yup.string().nullable(),
});

export const serviceMasterSchema = yup.object({
  serviceCode: yup.string().nullable(),
  serviceName: yup.string().required('Service name is required'),
  description: yup.string().nullable(),
  defaultPrice: yup.number().typeError('Enter a valid amount').min(0).required('Default price is required'),
  gstPercentage: yup.number().typeError('Enter a valid percentage').min(0).max(100).required('GST % is required'),
  durationMinutes: yup
    .number()
    .typeError('Enter minutes as a number')
    .min(0)
    .nullable()
    .transform((v) => (Number.isNaN(v) ? null : v)),
  status: yup.string().required('Status is required'),
});

export const unitSchema = yup.object({
  unitName: yup.string().required('Unit name is required'),
  shortName: yup.string().required('Short name is required'),
});

export const settingSchema = yup.object({
  settingKey: yup.string().required('Setting key is required'),
  settingValue: yup.string().required('Setting value is required'),
});

export const billingCounterSchema = yup.object({
  counterName: yup.string().required('Counter name is required'),
  location: yup.string().required('Location is required'),
  status: yup.string().required('Status is required'),
});

export const cashClosingSchema = yup.object({
  counterId: yup.number().typeError('Counter is required').required('Counter is required'),
  openingCash: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  closingCash: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  totalSales: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
});

export const productTaxSchema = yup.object({
  productId: yup.number().typeError('Product is required').required('Product is required'),
  taxName: yup.string().required('Tax name is required'),
  taxPercentage: yup
    .number()
    .typeError('Enter a valid percentage')
    .min(0, 'Cannot be negative')
    .max(100, 'Cannot exceed 100')
    .required('Tax percentage is required'),
});

export const productBarcodeSchema = yup.object({
  productId: yup.number().typeError('Product is required').required('Product is required'),
  barcode: yup.string().matches(barcodeRegex, 'Enter a valid barcode').required('Barcode is required'),
});

export const paymentSchema = yup.object({
  invoiceId: yup.number().typeError('Invoice ID is required').required('Invoice ID is required'),
  paymentMethod: yup.string().required('Payment method is required'),
  transactionReference: yup.string().nullable(),
  amount: yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Amount is required'),
});

export const holdInvoiceSchema = yup.object({
  data: yup.string().required('Details are required'),
});

export const stockMovementSchema = yup.object({
  productId: yup.number().typeError('Product is required').required('Product is required'),
  movementType: yup.string().required('Movement type is required'),
  quantity: yup.number().typeError('Enter a valid quantity').positive('Must be positive').required('Quantity is required'),
  remarks: yup.string().nullable(),
});

export const purchaseSchema = yup.object({
  supplierId: yup.number().typeError('Supplier is required').required('Supplier is required'),
  invoiceNumber: yup.string().required('Invoice number is required'),
  totalAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  tax: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  paymentStatus: yup.string().required('Payment status is required'),
});

export const purchaseItemSchema = yup.object({
  purchaseId: yup.number().typeError('Purchase is required').required('Purchase is required'),
  productId: yup.number().typeError('Product is required').required('Product is required'),
  quantity: yup.number().typeError('Enter a valid quantity').positive('Must be positive').required('Required'),
  purchasePrice: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  taxAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
});

export const purchaseReturnSchema = yup.object({
  purchaseId: yup.number().typeError('Purchase is required').required('Purchase is required'),
  supplierId: yup.number().typeError('Supplier is required').required('Supplier is required'),
  reason: yup.string().required('Reason is required'),
  totalAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  status: yup.string().required('Status is required'),
});

export const purchaseReturnItemSchema = yup.object({
  purchaseReturnId: yup.number().typeError('Purchase return is required').required('Required'),
  productId: yup.number().typeError('Product is required').required('Product is required'),
  quantity: yup.number().typeError('Enter a valid quantity').positive('Must be positive').required('Required'),
  price: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
});

export const salesReturnSchema = yup.object({
  salesItemId: yup.number().typeError('Sales item is required').required('Required'),
  saleId: yup.number().typeError('Sale is required').required('Required'),
  customerId: yup.number().typeError('Customer is required').required('Customer is required'),
  returnQuantity: yup.number().typeError('Enter a valid quantity').positive('Must be positive').required('Required'),
  reason: yup.string().required('Reason is required'),
  totalAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
});

export const salesReturnItemSchema = yup.object({
  salesReturnId: yup.number().typeError('Sales return is required').required('Required'),
  saleId: yup.number().typeError('Sale is required').required('Required'),
  productId: yup.number().typeError('Product is required').required('Product is required'),
  quantity: yup.number().typeError('Enter a valid quantity').positive('Must be positive').required('Required'),
});

export const invoiceSchema = yup.object({
  // Left blank, the backend auto-generates a unique invoice number.
  invoiceNumber: yup.string().nullable(),
  customerId: yup.number().typeError('Customer is required').required('Customer is required'),
  counterId: yup.number().typeError('Counter is required').required('Counter is required'),
  subtotal: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  discountAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  taxAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  grandTotal: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  paidAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  balanceAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  paymentMethod: yup.string().required('Payment method is required'),
  paymentStatus: yup.string().required('Payment status is required'),
});

export const invoiceItemSchema = yup.object({
  invoiceId: yup.number().typeError('Invoice is required').required('Required'),
  productId: yup.number().typeError('Product is required').required('Product is required'),
  barcode: yup.string().required('Barcode is required'),
  quantity: yup.number().typeError('Enter a valid quantity').positive('Must be positive').required('Required'),
  unitPrice: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  discount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  taxPercentage: yup.number().typeError('Enter a valid percentage').min(0).max(100).required('Required'),
  taxAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
  totalAmount: yup.number().typeError('Enter a valid amount').min(0).required('Required'),
});

export const saleSchema = yup.object({
  customerId: yup.number().typeError('Customer is required').required('Customer is required'),
  invoiceNumber: yup.string().nullable(),
  totalAmount: yup.number().typeError('Enter a valid amount').min(0).nullable(),
  paymentStatus: yup.string().nullable(),
});

export const appointmentSchema = yup.object({
  customerId: yup.number().typeError('Customer is required').required('Customer is required'),
  vehicleId: yup.number().typeError('Enter a valid vehicle').nullable(),
  phone: yup.string().nullable(),
  appointmentDate: yup.string().required('Appointment date is required'),
  appointmentTime: yup.string().nullable(),
  requestedService: yup.string().nullable(),
  notes: yup.string().nullable(),
  advisorUserId: yup.number().typeError('Enter a valid advisor').nullable(),
  status: yup.string().required('Status is required'),
});

export const serviceReminderSchema = yup.object({
  vehicleId: yup.number().typeError('Vehicle is required').required('Vehicle is required'),
  dueDate: yup.string().nullable(),
  dueOdometer: yup.number().typeError('Enter a valid odometer reading').min(0).nullable(),
  notes: yup.string().nullable(),
  status: yup.string().nullable(),
});

export const followUpSchema = yup.object({
  customerId: yup.number().typeError('Customer is required').required('Customer is required'),
  vehicleId: yup.number().typeError('Enter a valid vehicle').nullable(),
  reminderDate: yup.string().nullable(),
  customerResponse: yup.string().nullable(),
  status: yup.string().required('Status is required'),
  notes: yup.string().nullable(),
});
