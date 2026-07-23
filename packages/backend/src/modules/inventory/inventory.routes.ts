import type { FastifyInstance } from 'fastify';
import { authenticate } from '../auth-guard.js';
import {
  listWarehouses, createWarehouse,
  listItems, getItem, createItem, updateStock,
  listTransactions,
  listPurchaseOrders, createPurchaseOrder, receivePurchaseOrder,
} from './inventory.controller.js';

export async function registerInventoryRoutes(app: FastifyInstance) {
  // Warehouses
  app.get('/api/v1/inventory/warehouses', { preHandler: [authenticate] }, listWarehouses);
  app.post('/api/v1/inventory/warehouses', { preHandler: [authenticate] }, createWarehouse);

  // Inventory Items
  app.get('/api/v1/inventory/items', { preHandler: [authenticate] }, listItems);
  app.get('/api/v1/inventory/items/:itemId', { preHandler: [authenticate] }, getItem);
  app.post('/api/v1/inventory/items', { preHandler: [authenticate] }, createItem);
  app.put('/api/v1/inventory/items/:itemId/stock', { preHandler: [authenticate] }, updateStock);

  // Transactions
  app.get('/api/v1/inventory/transactions', { preHandler: [authenticate] }, listTransactions);

  // Purchase Orders
  app.get('/api/v1/inventory/pos', { preHandler: [authenticate] }, listPurchaseOrders);
  app.post('/api/v1/inventory/pos', { preHandler: [authenticate] }, createPurchaseOrder);
  app.put('/api/v1/inventory/pos/:poId/receive', { preHandler: [authenticate] }, receivePurchaseOrder);
}
