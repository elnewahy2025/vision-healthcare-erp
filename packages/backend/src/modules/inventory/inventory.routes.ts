import type { FastifyInstance } from 'fastify';
import { authenticate } from '../auth-guard.js';
import {
  listSuppliers, getSupplier, createSupplier, updateSupplier,
  listWarehouses, createWarehouse,
  listItems, getItem, getItemByBarcode, createItem, updateStock,
  listTransactions,
  createAdjustment, transferStock, dispenseStock, bulkStockReceipt,
  getLowStockAlerts, getExpiredItems, getControlledSubstances, getStockValuation,
  listPurchaseOrders, getPurchaseOrder, createPurchaseOrder, receivePurchaseOrder,
} from './inventory.controller.js';

export async function registerInventoryRoutes(app: FastifyInstance) {
  // ── #7: Suppliers ──
  app.get('/api/v1/inventory/suppliers', { preHandler: [authenticate] }, listSuppliers);
  app.get('/api/v1/inventory/suppliers/:supplierId', { preHandler: [authenticate] }, getSupplier);
  app.post('/api/v1/inventory/suppliers', { preHandler: [authenticate] }, createSupplier);
  app.put('/api/v1/inventory/suppliers/:supplierId', { preHandler: [authenticate] }, updateSupplier);

  // Warehouses
  app.get('/api/v1/inventory/warehouses', { preHandler: [authenticate] }, listWarehouses);
  app.post('/api/v1/inventory/warehouses', { preHandler: [authenticate] }, createWarehouse);

  // Inventory Items
  app.get('/api/v1/inventory/items', { preHandler: [authenticate] }, listItems);
  app.get('/api/v1/inventory/items/:itemId', { preHandler: [authenticate] }, getItem);
  app.get('/api/v1/inventory/barcode/:barcode', { preHandler: [authenticate] }, getItemByBarcode);
  app.post('/api/v1/inventory/items', { preHandler: [authenticate] }, createItem);
  app.put('/api/v1/inventory/items/:itemId/stock', { preHandler: [authenticate] }, updateStock);

  // ── #6: Dispensing ──
  app.post('/api/v1/inventory/dispense', { preHandler: [authenticate] }, dispenseStock);

  // ── #13: Adjustments ──
  app.post('/api/v1/inventory/adjustments', { preHandler: [authenticate] }, createAdjustment);

  // ── #10: Transfers ──
  app.post('/api/v1/inventory/transfers', { preHandler: [authenticate] }, transferStock);

  // ── #16: Bulk receipt ──
  app.post('/api/v1/inventory/bulk-receipt', { preHandler: [authenticate] }, bulkStockReceipt);

  // ── #5: Alerts & Reports ──
  app.get('/api/v1/inventory/alerts/low-stock', { preHandler: [authenticate] }, getLowStockAlerts);
  app.get('/api/v1/inventory/alerts/expired', { preHandler: [authenticate] }, getExpiredItems);
  app.get('/api/v1/inventory/reports/controlled-substances', { preHandler: [authenticate] }, getControlledSubstances);
  app.get('/api/v1/inventory/reports/valuation', { preHandler: [authenticate] }, getStockValuation);

  // Transactions
  app.get('/api/v1/inventory/transactions', { preHandler: [authenticate] }, listTransactions);

  // Purchase Orders
  app.get('/api/v1/inventory/pos', { preHandler: [authenticate] }, listPurchaseOrders);
  app.get('/api/v1/inventory/pos/:poId', { preHandler: [authenticate] }, getPurchaseOrder);
  app.post('/api/v1/inventory/pos', { preHandler: [authenticate] }, createPurchaseOrder);
  app.put('/api/v1/inventory/pos/:poId/receive', { preHandler: [authenticate] }, receivePurchaseOrder);
}
