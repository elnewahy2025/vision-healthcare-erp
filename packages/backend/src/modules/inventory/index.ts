import type { FastifyInstance } from 'fastify';
import { registerInventoryRoutes } from './inventory.routes.js';

export async function registerInventoryModule(app: FastifyInstance) {
  await registerInventoryRoutes(app);
}

export type {
  WarehouseRow, InventoryItemRow, InventoryTransactionRow,
  PurchaseOrderRow, PurchaseOrderItemRow,
  WarehouseResponse, InventoryItemResponse, InventoryTransactionResponse,
  PurchaseOrderResponse, PurchaseOrderItemResponse,
} from './types.js';
