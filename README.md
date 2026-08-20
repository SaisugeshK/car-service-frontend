# Supermarket ERP — React + Vite Frontend

A production-style React 19 + Vite frontend wired directly to your existing
Spring Boot REST API (from `erp_supermarket_collection` Postman export). No
backend code was generated or modified — this only consumes your endpoints.

## Stack

React 19 · Vite · Axios · React Router DOM v7 · React Hook Form + Yup ·
Bootstrap 5 · react-hot-toast · react-icons · Day.js · Context API (auth).

## Getting started

```bash
cd erp-frontend
npm install
npm run dev
```

The app expects the backend at the URL in `.env`:

```
VITE_API_BASE_URL=http://localhost:8080/api
```

Change this if your Spring Boot app runs on a different host/port, then
restart `npm run dev` (Vite only reads `.env` at startup).

## What was built from your Postman collection

Every module maps 1:1 to the endpoints found in your collection:

| Module | Base path |
|---|---|
| Auth | `/auth/login`, `/auth/register` |
| Roles / Users | `/roles`, `/users` |
| Suppliers / Categories / Customers | `/suppliers`, `/categories`, `/customers` |
| Products / Units / Product Taxes / Barcodes | `/products`, `/units`, `/product-taxes`, `/product-barcodes` (+ `/product-barcodes/scan/{code}`) |
| Purchases / Purchase Items / Purchase Returns / Purchase Return Items | `/purchases`, `/purchase-items`, `/purchase-returns`, `/purchase-return-items` |
| Sales / Sales Items / Sales Returns / Sales Return Items | `/sales`, `/sales-items`, `/sales-returns`, `/sales-return-items` |
| Invoices / Invoice Items | `/invoices`, `/invoice-items` |
| Hold Invoices / Payments / Billing Counters / Cash Closing | `/hold-invoices`, `/payments`, `/billing-counters`, `/cash-closing` |
| Stock Movements | `/stock-movements` (list, create, and `/stock-movements/{productId}`) |

**Point of Sale (`/pos`)** is the real-time billing screen from your spec:
select a customer, scan or search a product, quantities validate against live
stock, GST/discount/grand total/paid/balance calculate live, and the whole
sale posts in **one request** to `POST /api/sales` (the endpoint in your
collection that accepts a customer + item list in a single call). The
**Invoices** module is kept as a separate CRUD screen since your collection's
`/invoices` and `/invoice-items` endpoints are managed independently from
`/sales` on the backend.

## A few things worth knowing

- **No `GET /api/invoices` (list) call was in your Postman collection** — only
  get-by-id, create, update. The Dashboard/Reports/Invoices pages call
  `GET /invoices` assuming a standard list endpoint exists; if it doesn't yet,
  add it on the backend and everything else here needs no changes.
- **Refresh tokens**: `src/api/axios.js` already queues requests and calls
  `POST /api/auth/refresh` on a 401, but that endpoint wasn't in your
  collection. It's dormant until you add it — until then, a 401 just logs the
  user out and redirects to `/login`, which is safe.
- **JWT response shape**: the login handler in `AuthContext.jsx` accepts
  `token`, `accessToken`, or `jwt` as the field name in the login response.
  Adjust `src/context/AuthContext.jsx` → `login()` if your backend uses a
  different key.
- All 20+ modules share one generic CRUD engine (`src/pages/CrudPage.jsx` +
  `src/hooks/useCrud.js`) so list/search/paginate/validate/toast logic isn't
  duplicated — Purchases and Point of Sale are the two screens with fully
  custom real-time logic per your spec.

## Project structure

```
src/
  api/axios.js          — Axios instance, interceptors, token/refresh handling
  services/              — one file per resource (thin wrappers over axios)
  hooks/                 — useCrud, useGlobalLoading
  context/AuthContext.jsx
  routes/                — ProtectedRoute, AppRoutes
  layouts/               — Sidebar, Navbar, MainLayout
  components/            — DataTable, Modal, ConfirmDialog, FormInput,
                            FormSelect, SearchBar, Pagination, Loader, etc.
  pages/                 — one page per module + CrudPage engine
  utils/validationSchemas.js — all Yup schemas
```

## Login

Point this at your existing `/api/auth/login` — no test users are seeded
here since this only talks to your backend.
