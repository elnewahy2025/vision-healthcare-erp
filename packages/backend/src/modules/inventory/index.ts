import type { FastifyInstance } from 'fastify';
import { registerInventoryRoutes } from './inventory.routes.js';

export async function registerInventoryModule(app: FastifyInstance) {
  await registerInventoryRoutes(app);
}

export type {
  SupplierRow, WarehouseRow, InventoryItemRow, InventoryTransactionRow,
  PurchaseOrderRow, PurchaseOrderItemRow,
  SupplierResponse, WarehouseResponse, InventoryItemResponse,
  InventoryTransactionResponse, PurchaseOrderResponse, PurchaseOrderItemResponse,
  LowStockAlert, StockValuation,
} from './types.js';
