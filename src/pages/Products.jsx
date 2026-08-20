import { useEffect, useMemo, useState } from 'react';
import CrudPage from './CrudPage';
import productsService from '../services/productsService';
import categoriesService from '../services/categoriesService';
import productTaxesService from '../services/productTaxesService';
import { productSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

// GST % lives in the separate product_taxes table (shared with the invoice tax lookup), but the
// spec wants it as a plain field on the Product form — so this wraps productsService to merge it
// in on read and upsert the underlying tax row on write, without touching invoice calculation code.
async function upsertGst(productId, gstPercentage) {
  if (gstPercentage === '' || gstPercentage == null) return;
  const taxes = await productTaxesService.getAll();
  const list = Array.isArray(taxes) ? taxes : taxes?.content || [];
  const existing = list.find((t) => t.productId === productId && t.taxName === 'GST');
  if (existing) {
    await productTaxesService.update(existing.id, { productId, taxName: 'GST', taxPercentage: Number(gstPercentage) });
  } else {
    await productTaxesService.create({ productId, taxName: 'GST', taxPercentage: Number(gstPercentage) });
  }
}

function scopedProductsService() {
  return {
    ...productsService,
    // Server-side filter (not a client-side hide) — Products must never even fetch Service
    // Master's rows. See ProductController's itemType query param.
    getAll: async (params) => {
      const [products, taxes] = await Promise.all([
        productsService.getAll({ ...params, itemType: 'PRODUCT' }),
        productTaxesService.getAll(),
      ]);
      const list = Array.isArray(products) ? products : products?.content || [];
      const taxList = Array.isArray(taxes) ? taxes : taxes?.content || [];
      return list.map((p) => ({
        ...p,
        gstPercentage: taxList.find((t) => t.productId === p.id && t.taxName === 'GST')?.taxPercentage ?? '',
      }));
    },
    create: async (payload) => {
      const { gstPercentage, ...rest } = payload;
      const saved = await productsService.create({ ...rest, itemType: 'PRODUCT' });
      await upsertGst(saved.id, gstPercentage);
      return saved;
    },
    update: async (id, payload) => {
      const { gstPercentage, ...rest } = payload;
      const saved = await productsService.update(id, { ...rest, itemType: 'PRODUCT' });
      await upsertGst(id, gstPercentage);
      return saved;
    },
  };
}

export default function Products() {
  const [categories, setCategories] = useState(null);
  const service = useMemo(scopedProductsService, []);

  useEffect(() => {
    categoriesService.getAll().then((data) => {
      setCategories(Array.isArray(data) ? data : data?.content || []);
    });
  }, []);

  if (!categories) return <Loader label="Loading categories..." />;

  const config = {
    title: 'Products',
    entityName: 'Product',
    service,
    searchKeys: ['productName', 'sku', 'barcode', 'brand'],
    defaultValues: {
      categoryId: '',
      productName: '',
      brand: '',
      sku: '',
      barcode: '',
      purchasePrice: '',
      sellingPrice: '',
      gstPercentage: '',
      stockQuantity: '',
      minimumStock: '',
      unit: 'PCS',
      status: 'ACTIVE',
    },
    schema: productSchema,
    columns: [
      { key: 'productId', label: 'ID', sortable: true },
      { key: 'productName', label: 'Product', sortable: true },
      { key: 'sku', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      {
        key: 'categoryId',
        label: 'Category',
        render: (row) => categories.find((c) => c.id === row.categoryId)?.categoryName || row.categoryId,
      },
      {
        key: 'sellingPrice',
        label: 'Price',
        sortable: true,
        render: (row) => Number(row.sellingPrice ?? 0).toFixed(2),
      },
      {
        key: 'stockQuantity',
        label: 'Stock',
        sortable: true,
        render: (row) => {
          const stock = Number(row.stockQuantity);
          const min = Number(row.minimumStock);
          // Three tiers: out of stock (red) / at-or-below minimum (orange, "low stock") / healthy (green).
          const tier = stock <= 0 ? 'bg-danger' : stock <= min ? 'bg-warning text-dark' : 'bg-success';
          return <span className={`badge ${tier}`}>{row.stockQuantity}</span>;
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <span className={`badge ${String(row.status).toUpperCase() === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
            {row.status}
          </span>
        ),
      },
    ],
    fields: [
      { name: 'productName', label: 'Product Name', required: true },
      { name: 'sku', label: 'SKU', required: true },
      { name: 'barcode', label: 'Barcode', required: true },
      {
        name: 'categoryId',
        label: 'Category',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'categoryName',
        options: categories,
      },
      { name: 'brand', label: 'Brand' },
      {
        name: 'unit',
        label: 'Unit',
        type: 'select',
        required: true,
        options: [
          { value: 'PCS', label: 'Piece' },
          { value: 'KG', label: 'KG' },
          { value: 'L', label: 'Litre' },
          { value: 'BOX', label: 'Box' },
        ],
      },
      { name: 'purchasePrice', label: 'Purchase Price', type: 'number', step: '0.01', required: true },
      { name: 'sellingPrice', label: 'Selling Price', type: 'number', step: '0.01', required: true },
      { name: 'gstPercentage', label: 'GST %', type: 'number', step: '0.01', placeholder: 'e.g. 18' },
      { name: 'stockQuantity', label: 'Opening Stock', type: 'number', required: true },
      { name: 'minimumStock', label: 'Minimum Stock', type: 'number', required: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ],
      },
    ],
  };

  return <CrudPage config={config} />;
}
