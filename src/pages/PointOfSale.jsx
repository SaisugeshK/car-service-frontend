import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { FiSearch, FiTrash2, FiPrinter, FiDownload, FiShoppingCart, FiPlus, FiPause } from 'react-icons/fi';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import serviceMasterService from '../services/serviceMasterService';
import productsService from '../services/productsService';
import productBarcodesService from '../services/productBarcodesService';
import productTaxesService from '../services/productTaxesService';
import invoicesService from '../services/invoicesService';
import holdInvoicesService from '../services/holdInvoicesService';
import settingsService from '../services/settingsService';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';
import Modal from '../components/Modal';

const emptyVehicleForm = () => ({
  vehicleModel: '',
  registrationNumber: '',
  odometer: '',
  vehicleType: '',
  fuelType: '',
  year: '',
});

export default function PointOfSale() {
  const location = useLocation();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState(null);
  const [vehicles, setVehicles] = useState(null);
  const [services, setServices] = useState(null);
  const [products, setProducts] = useState(null);
  const [productTaxes, setProductTaxes] = useState([]);
  const [company, setCompany] = useState({ name: 'AutoCare ERP', address: '', phone: '', email: '', gstin: '' });
  const [loadError, setLoadError] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm());

  const [serviceQuery, setServiceQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [scanValue, setScanValue] = useState('');

  // cart line: { key, itemType, refId, itemName, unitPrice, quantity, discount, taxPercentage, stockQuantity, barcode }
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [resumingHoldId, setResumingHoldId] = useState(null);

  const scanInputRef = useRef(null);

  const loadAll = () => {
    setLoadError(false);
    Promise.all([
      customersService.getAll(),
      vehiclesService.getAll(),
      serviceMasterService.getAll(),
      productsService.getAll({ itemType: 'PRODUCT' }),
      settingsService.getAll(),
      productTaxesService.getAll(),
    ]).then(([c, v, s, p, settings, taxes]) => {
      setCustomers(Array.isArray(c) ? c : c?.content || []);
      setVehicles(Array.isArray(v) ? v : v?.content || []);
      setServices((Array.isArray(s) ? s : s?.content || []).filter((x) => (x.status || 'active').toLowerCase() === 'active'));
      setProducts(Array.isArray(p) ? p : p?.content || []);
      setProductTaxes(Array.isArray(taxes) ? taxes : taxes?.content || []);

      const list = Array.isArray(settings) ? settings : settings?.content || [];
      const get = (key, fallback) => list.find((s2) => s2.settingKey === key)?.settingValue || fallback;
      setCompany({
        name: get('company_name', 'AutoCare ERP'),
        address: get('company_address', ''),
        phone: get('company_phone', ''),
        email: get('company_email', ''),
        gstin: get('company_gstin', ''),
      });
    }).catch(() => setLoadError(true));
  };

  useEffect(loadAll, []);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  // Resume a held bill navigated here with { state: { resumeHoldId } }.
  useEffect(() => {
    const holdId = location.state?.resumeHoldId;
    if (!holdId || !customers || !vehicles || !services || !products) return;

    holdInvoicesService.getById(holdId).then((hold) => {
      try {
        const snapshot = JSON.parse(hold.data);
        setCustomerId(snapshot.customerId || '');
        setVehicleId(snapshot.vehicleId || '');
        setOdometerReading(snapshot.odometerReading || '');
        setCart(snapshot.cart || []);
        setDiscountAmount(snapshot.discountAmount || 0);
        setPaymentMethod(snapshot.paymentMethod || 'CASH');
        setPaidAmount(snapshot.paidAmount || 0);
        setResumingHoldId(holdId);
        toast.success('Held bill restored');
      } catch {
        toast.error('Could not restore this held bill');
      }
    });
  }, [location.state, customers, vehicles, services, products]);

  const customerVehicles = useMemo(
    () => (vehicles || []).filter((v) => String(v.customerId) === String(customerId)),
    [vehicles, customerId]
  );

  useEffect(() => {
    const selected = customerVehicles.find((v) => String(v.id) === String(vehicleId));
    if (selected && !odometerReading) {
      setOdometerReading(selected.odometer || '');
    }
  }, [vehicleId, customerVehicles, odometerReading]);

  const addServiceToCart = (service) => {
    setCart((prev) => {
      const key = `service-${service.id}`;
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          itemType: 'SERVICE',
          refId: service.id,
          itemName: service.serviceName,
          unitPrice: Number(service.defaultPrice || 0),
          quantity: 1,
          discount: 0,
          taxPercentage: Number(service.gstPercentage || 0),
        },
      ];
    });
  };

  const addProductToCart = (product) => {
    if (Number(product.stockQuantity) <= 0) {
      toast.error(`${product.productName} is out of stock`);
      return;
    }
    setCart((prev) => {
      const key = `product-${product.id}`;
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        if (existing.quantity + 1 > product.stockQuantity) {
          toast.error(`Only ${product.stockQuantity} units of ${product.productName} available`);
          return prev;
        }
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          itemType: 'PRODUCT',
          refId: product.id,
          itemName: product.productName,
          unitPrice: Number(product.sellingPrice || 0),
          quantity: 1,
          discount: 0,
          // Live preview only — the server re-resolves ProductTax authoritatively at completion.
          taxPercentage: Number(productTaxes.find((t) => t.productId === product.id)?.taxPercentage ?? 0),
          stockQuantity: product.stockQuantity,
          barcode: product.barcode,
        },
      ];
    });
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const code = scanValue.trim();
    if (!code) return;
    try {
      const found = await productBarcodesService.scan(code);
      const productId = found?.productId ?? found?.id;
      const product = products.find((p) => p.id === productId || p.barcode === code);
      if (!product) {
        toast.error('Product not found for this barcode');
      } else {
        addProductToCart(product);
        toast.success(`${product.productName} added`);
      }
    } catch {
      const product = products.find((p) => p.barcode === code);
      if (product) {
        addProductToCart(product);
        toast.success(`${product.productName} added`);
      } else {
        toast.error('Barcode not recognized');
      }
    } finally {
      setScanValue('');
    }
  };

  const serviceResults = useMemo(() => {
    if (!serviceQuery.trim() || !services) return [];
    const q = serviceQuery.toLowerCase();
    return services
      .filter((s) => s.serviceName?.toLowerCase().includes(q) || s.serviceCode?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [serviceQuery, services]);

  const productResults = useMemo(() => {
    if (!productQuery.trim() || !products) return [];
    const q = productQuery.toLowerCase();
    return products
      .filter(
        (p) =>
          p.productName?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q)
      )
      .slice(0, 8);
  }, [productQuery, products]);

  const updateQuantity = (key, quantity) => {
    const qty = Number(quantity);
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.key !== key));
      return;
    }
    const line = cart.find((l) => l.key === key);
    if (line?.itemType === 'PRODUCT') {
      const product = products.find((p) => p.id === line.refId);
      if (product && qty > product.stockQuantity) {
        toast.error(`Only ${product.stockQuantity} units of ${product.productName} available`);
        return;
      }
    }
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: qty } : l)));
  };

  const updateLineDiscount = (key, discount) => {
    const value = Math.max(0, Number(discount) || 0);
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, discount: value } : l)));
  };

  const removeLine = (key) => setCart((prev) => prev.filter((l) => l.key !== key));

  const totals = useMemo(() => calculateInvoiceTotals(cart, discountAmount), [cart, discountAmount]);

  const serviceLines = cart.filter((l) => l.itemType === 'SERVICE');
  const productLines = cart.filter((l) => l.itemType === 'PRODUCT');

  const resetSale = () => {
    setCart([]);
    setCustomerId('');
    setVehicleId('');
    setOdometerReading('');
    setDiscountAmount(0);
    setPaidAmount(0);
    setResumingHoldId(null);
    setShowAddVehicle(false);
    setVehicleForm(emptyVehicleForm());
  };

  const handleAddVehicle = async () => {
    if (!customerId) return toast.error('Select a customer first');
    if (!vehicleForm.vehicleModel) return toast.error('Vehicle model is required');
    try {
      const created = await vehiclesService.create({
        customerId: Number(customerId),
        vehicleModel: vehicleForm.vehicleModel,
        registrationNumber: vehicleForm.registrationNumber || null,
        odometer: vehicleForm.odometer ? Number(vehicleForm.odometer) : null,
        vehicleType: vehicleForm.vehicleType || null,
        fuelType: vehicleForm.fuelType || null,
        year: vehicleForm.year ? Number(vehicleForm.year) : null,
      });
      setVehicles((prev) => [...prev, created]);
      setVehicleId(String(created.id));
      setOdometerReading(created.odometer || '');
      setShowAddVehicle(false);
      setVehicleForm(emptyVehicleForm());
      toast.success('Vehicle added');
    } catch {
      // Global toast already shown by the axios interceptor.
    }
  };

  const buildInvoicePayload = () => ({
    customerId: Number(customerId),
    vehicleId: vehicleId ? Number(vehicleId) : null,
    odometerReading: odometerReading ? Number(odometerReading) : null,
    paymentMethod,
    paidAmount: Number(paidAmount || 0),
    discountAmount: Number(discountAmount || 0),
    items: cart.map((l) => ({
      itemType: l.itemType,
      serviceId: l.itemType === 'SERVICE' ? l.refId : null,
      productId: l.itemType === 'PRODUCT' ? l.refId : null,
      quantity: l.quantity,
      discount: Number(l.discount) || 0,
    })),
  });

  const handleHoldBill = async () => {
    if (!customerId) return toast.error('Please select a customer');
    if (cart.length === 0) return toast.error('Cart is empty');

    setIsHolding(true);
    try {
      const snapshot = { customerId, vehicleId, odometerReading, cart, discountAmount, paymentMethod, paidAmount };
      await holdInvoicesService.create({
        customerId: Number(customerId),
        vehicleId: vehicleId ? Number(vehicleId) : null,
        status: 'HELD',
        data: JSON.stringify(snapshot),
      });
      // If this was a resumed hold being re-held, remove the old one so it isn't duplicated.
      if (resumingHoldId) {
        await holdInvoicesService.remove(resumingHoldId).catch(() => {});
      }
      toast.success('Bill held');
      resetSale();
    } catch {
      // Global toast already shown.
    } finally {
      setIsHolding(false);
    }
  };

  const handleCompleteSale = async () => {
    if (!customerId) return toast.error('Please select a customer');
    if (cart.length === 0) return toast.error('Add at least one service or product');

    setIsSubmitting(true);
    try {
      const result = await invoicesService.create(buildInvoicePayload());

      toast.success(`Bill completed – Invoice ${result.invoiceNumber}`);
      setReceipt({ ...result, customer: customers.find((c) => c.id === Number(customerId)), timestamp: dayjs().format('DD MMM YYYY, HH:mm') });

      if (resumingHoldId) {
        await holdInvoicesService.remove(resumingHoldId).catch(() => {});
      }

      const [refreshedProducts, refreshedVehicles] = await Promise.all([
        productsService.getAll({ itemType: 'PRODUCT' }),
        vehiclesService.getAll(),
      ]);
      setProducts(Array.isArray(refreshedProducts) ? refreshedProducts : refreshedProducts?.content || []);
      setVehicles(Array.isArray(refreshedVehicles) ? refreshedVehicles : refreshedVehicles?.content || []);
      resetSale();
    } catch {
      // Global toast already shown by the axios interceptor (real 400 messages, e.g.
      // insufficient stock or validation errors).
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) return <ErrorPage message="Could not load POS. Check your connection and try again." onRetry={loadAll} />;
  if (!customers || !vehicles || !services || !products) return <Loader label="Loading POS..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Point of Sale</h1>
        <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" onClick={() => navigate('/hold-invoices')}>
          <FiPause /> Held Bills
        </button>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          {/* Customer & Vehicle */}
          <div className="erp-card p-3 mb-3">
            <h6 className="mb-2">Customer & Vehicle</h6>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Customer *</label>
                <select
                  className="form-select"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setVehicleId('');
                    setOdometerReading('');
                  }}
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerName} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Vehicle</label>
                <div className="d-flex gap-2">
                  <select
                    className="form-select"
                    value={vehicleId}
                    onChange={(e) => {
                      setVehicleId(e.target.value);
                      setOdometerReading('');
                    }}
                    disabled={!customerId}
                  >
                    <option value="">Select vehicle...</option>
                    {customerVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleModel} {v.registrationNumber ? `— ${v.registrationNumber}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline-primary flex-shrink-0"
                    disabled={!customerId}
                    onClick={() => setShowAddVehicle((s) => !s)}
                    title="Add vehicle"
                  >
                    <FiPlus />
                  </button>
                </div>
              </div>
            </div>

            {showAddVehicle && (
              <div className="row g-2 mt-1 p-2 pos-vehicle-form">
                <div className="col-md-4">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Vehicle Model *"
                    value={vehicleForm.vehicleModel}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, vehicleModel: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Registration No."
                    value={vehicleForm.registrationNumber}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="Odometer (km)"
                    value={vehicleForm.odometer}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, odometer: e.target.value }))}
                  />
                </div>
                <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowAddVehicle(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={handleAddVehicle}>
                    Save Vehicle
                  </button>
                </div>
              </div>
            )}

            <div className="row g-2 mt-1">
              <div className="col-md-4">
                <label className="form-label small mb-1">Odometer (km)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control form-control-sm"
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="erp-card p-3 mb-3 position-relative">
            <h6 className="mb-2">Services</h6>
            <label className="form-label d-flex align-items-center gap-2">
              <FiSearch /> Search Service
            </label>
            <input
              className="form-control"
              placeholder="Search by service name or code..."
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
            />
            {serviceResults.length > 0 && (
              <div className="list-group mt-2">
                {serviceResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="list-group-item list-group-item-action d-flex justify-content-between"
                    onClick={() => {
                      addServiceToCart(s);
                      setServiceQuery('');
                    }}
                  >
                    <span>
                      {s.serviceName} <small className="text-muted">{s.serviceCode} · GST {s.gstPercentage}%</small>
                    </span>
                    <strong>{Number(s.defaultPrice).toFixed(2)}</strong>
                  </button>
                ))}
              </div>
            )}

            {serviceLines.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table pos-cart-table mb-0">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th style={{ width: 90 }}>Qty</th>
                      <th>Rate</th>
                      <th style={{ width: 100 }}>Discount</th>
                      <th>Amount</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {serviceLines.map((l) => (
                      <tr key={l.key}>
                        <td>{l.itemName}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            value={l.quantity}
                            onChange={(e) => updateQuantity(l.key, e.target.value)}
                          />
                        </td>
                        <td>{l.unitPrice.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={l.discount}
                            onChange={(e) => updateLineDiscount(l.key, e.target.value)}
                          />
                        </td>
                        <td>{(l.unitPrice * l.quantity - l.discount).toFixed(2)}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeLine(l.key)}>
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="erp-card p-3 mb-3 position-relative">
            <h6 className="mb-2">Products / Spare Parts</h6>
            <div className="row g-2">
              <div className="col-md-5">
                <label className="form-label">Scan Barcode</label>
                <form onSubmit={handleScanSubmit}>
                  <input
                    ref={scanInputRef}
                    className="form-control pos-scan-input"
                    placeholder="Scan or type barcode, then press Enter"
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                  />
                </form>
              </div>
              <div className="col-md-7">
                <label className="form-label d-flex align-items-center gap-2">
                  <FiSearch /> Search Product
                </label>
                <input
                  className="form-control"
                  placeholder="Search by name, SKU or barcode..."
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                />
              </div>
            </div>
            {productResults.length > 0 && (
              <div className="list-group mt-2">
                {productResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="list-group-item list-group-item-action d-flex justify-content-between"
                    onClick={() => {
                      addProductToCart(p);
                      setProductQuery('');
                    }}
                  >
                    <span>
                      {p.productName} <small className="text-muted">{p.sku}</small>
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <span className={`badge ${p.stockQuantity > 0 ? 'bg-success' : 'bg-danger'}`}>
                        Stock: {p.stockQuantity}
                      </span>
                      <strong>{Number(p.sellingPrice).toFixed(2)}</strong>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="table-responsive mt-3">
              <table className="table pos-cart-table mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ width: 90 }}>Qty</th>
                    <th>Rate</th>
                    <th style={{ width: 100 }}>Discount</th>
                    <th>Amount</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {productLines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        <FiShoppingCart className="mb-2" size={22} />
                        <div>No products added yet.</div>
                      </td>
                    </tr>
                  )}
                  {productLines.map((l) => (
                    <tr key={l.key}>
                      <td>
                        {l.itemName}
                        <div className="small text-muted">{l.barcode}</div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={l.quantity}
                          onChange={(e) => updateQuantity(l.key, e.target.value)}
                        />
                      </td>
                      <td>{l.unitPrice.toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control form-control-sm"
                          value={l.discount}
                          onChange={(e) => updateLineDiscount(l.key, e.target.value)}
                        />
                      </td>
                      <td>{(l.unitPrice * l.quantity - l.discount).toFixed(2)}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeLine(l.key)}>
                          <FiTrash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Order Summary + Payment */}
        <div className="col-lg-4">
          <div className="erp-card p-3 pos-summary">
            <h6 className="mb-3">Order Summary</h6>
            <div className="d-flex justify-content-between mb-1">
              <span>Service Subtotal</span>
              <span>{totals.serviceSubtotal.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span>Product Subtotal</span>
              <span>{totals.productSubtotal.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <strong>Subtotal</strong>
              <strong>{totals.subtotal.toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span>Line Discounts</span>
              <span>{totals.lineDiscountTotal.toFixed(2)}</span>
            </div>
            <div className="mb-2">
              <label className="form-label small mb-1">Additional Discount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control form-control-sm"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span>GST (CGST + SGST)</span>
              <span>{totals.taxAmount.toFixed(2)}</span>
            </div>
            <hr />
            <div className="d-flex justify-content-between mb-2">
              <strong>Grand Total</strong>
              <strong>{totals.grandTotal.toFixed(2)}</strong>
            </div>

            <div className="mb-2">
              <label className="form-label small mb-1">Payment Method</label>
              <select className="form-select form-select-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="form-label small mb-1">Paid Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control form-control-sm"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
            <div className="d-flex justify-content-between mb-3">
              <span>Balance</span>
              <strong className={totals.grandTotal - Number(paidAmount || 0) > 0 ? 'text-danger' : 'text-success'}>
                {(totals.grandTotal - Number(paidAmount || 0)).toFixed(2)}
              </strong>
            </div>

            <div className="d-flex flex-column gap-2">
              <button className="btn btn-primary" onClick={handleCompleteSale} disabled={isSubmitting || cart.length === 0}>
                {isSubmitting ? 'Processing...' : 'Complete Bill'}
              </button>
              <button
                className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-1"
                onClick={handleHoldBill}
                disabled={isHolding || cart.length === 0}
              >
                <FiPause /> {isHolding ? 'Holding...' : 'Hold Bill'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={Boolean(receipt)}
        title="Bill Completed"
        size="modal-lg"
        onClose={() => setReceipt(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReceipt(null)}>
              Close
            </button>
            <button className="btn btn-outline-primary d-flex align-items-center gap-1" onClick={() => downloadInvoicePdf(receipt)}>
              <FiDownload /> Download PDF
            </button>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => window.print()}>
              <FiPrinter /> Print Invoice
            </button>
          </>
        }
      >
        {receipt && (
          <div id="receipt-print">
            <h5 className="mb-3">{company.name} — Tax Invoice</h5>
            <div className="row g-2 mb-3 small">
              <div className="col-md-6"><strong>Invoice No.:</strong> {receipt.invoiceNumber}</div>
              <div className="col-md-6"><strong>Date:</strong> {receipt.timestamp}</div>
              <div className="col-md-6"><strong>Customer:</strong> {receipt.customer?.customerName || '-'}</div>
              <div className="col-md-6"><strong>Mobile:</strong> {receipt.customer?.phone || '-'}</div>
              <div className="col-md-6"><strong>Vehicle:</strong> {receipt.vehicleModel || '-'}</div>
              <div className="col-md-6"><strong>Registration:</strong> {receipt.registrationNumber || '-'}</div>
              <div className="col-md-6"><strong>Odometer:</strong> {receipt.odometer ? `${receipt.odometer} km` : '-'}</div>
              <div className="col-md-6"><strong>Payment:</strong> {receipt.paymentMethod}</div>
            </div>

            {(receipt.items || []).filter((l) => l.itemType === 'SERVICE').length > 0 && (
              <>
                <h6 className="small text-uppercase text-muted">Services</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th></tr></thead>
                    <tbody>
                      {(receipt.items || []).filter((l) => l.itemType === 'SERVICE').map((l) => (
                        <tr key={l.invoiceItemId}>
                          <td>{l.description || l.itemName}</td>
                          <td>{l.quantity}</td>
                          <td>{Number(l.unitPrice).toFixed(2)}</td>
                          <td>{Number(l.taxPercentage ?? 0)}%</td>
                          <td>{Number(l.totalAmount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {(receipt.items || []).filter((l) => l.itemType !== 'SERVICE').length > 0 && (
              <>
                <h6 className="small text-uppercase text-muted">Products / Spare Parts</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th></tr></thead>
                    <tbody>
                      {(receipt.items || []).filter((l) => l.itemType !== 'SERVICE').map((l) => (
                        <tr key={l.invoiceItemId}>
                          <td>{l.description || l.itemName}</td>
                          <td>{l.quantity}</td>
                          <td>{Number(l.unitPrice).toFixed(2)}</td>
                          <td>{Number(l.taxPercentage ?? 0)}%</td>
                          <td>{Number(l.totalAmount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="d-flex justify-content-between"><span>Service Subtotal</span><span>{Number(receipt.serviceSubtotal ?? 0).toFixed(2)}</span></div>
            <div className="d-flex justify-content-between"><span>Product Subtotal</span><span>{Number(receipt.productSubtotal ?? 0).toFixed(2)}</span></div>
            {Number(receipt.discountAmount ?? 0) > 0 && (
              <div className="d-flex justify-content-between"><span>Discount</span><span>{Number(receipt.discountAmount).toFixed(2)}</span></div>
            )}
            <div className="d-flex justify-content-between"><span>CGST</span><span>{Number(receipt.cgstAmount ?? 0).toFixed(2)}</span></div>
            <div className="d-flex justify-content-between"><span>SGST</span><span>{Number(receipt.sgstAmount ?? 0).toFixed(2)}</span></div>
            <div className="d-flex justify-content-between"><strong>Grand Total</strong><strong>{Number(receipt.grandTotal ?? 0).toFixed(2)}</strong></div>
            <div className="d-flex justify-content-between"><span>Paid ({receipt.paymentMethod})</span><strong>{Number(receipt.paidAmount ?? 0).toFixed(2)}</strong></div>
            <div className="d-flex justify-content-between"><span>Balance</span><strong>{Number(receipt.balanceAmount ?? 0).toFixed(2)}</strong></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
