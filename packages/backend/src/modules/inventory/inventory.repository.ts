import { db } from '../../core/database.js';
import type {
  WarehouseRow, InventoryItemRow, InventoryTransactionRow,
  PurchaseOrderRow, PurchaseOrderItemRow,
} from './types.js';

// ── Warehouses ──

export async function findWarehouses(tenantId: string): Promise<WarehouseRow[]> {
  return db('warehouses')
    .where({ tenant_id: tenantId, status: 'active' })
    .orderBy('name');
}

export async function createWarehouse(
  tenantId: string,
  data: { name: string; code: string; type: string },
): Promise<WarehouseRow> {
  const [wh] = await db('warehouses')
    .insert({ tenant_id: tenantId, ...data })
    .returning('*');
  return wh;
}

// ── Inventory Items ──

export async function findInventoryItems(
  tenantId: string,
  filters: { category?: string; warehouseId?: string; search?: string },
): Promise<(InventoryItemRow & { wh_name?: string })[]> {
  let query = db('inventory_items')
    .where('inventory_items.tenant_id', tenantId)
    .whereNull('inventory_items.deleted_at');

  if (filters.category) {
    query = query.andWhere('inventory_items.category', filters.category);
  }
  if (filters.warehouseId) {
    query = query.andWhere('inventory_items.warehouse_id', filters.warehouseId);
  }
  if (filters.search) {
    const s = filters.search;
    query = query.andWhere(function () {
      this.where('inventory_items.name', 'ilike', `%${s}%`)
        .orWhere('inventory_items.sku', 'ilike', `%${s}%`);
    });
  }

  return query
    .leftJoin('warehouses', 'inventory_items.warehouse_id', 'warehouses.id')
    .select('inventory_items.*', 'warehouses.name as wh_name')
    .orderBy('inventory_items.name');
}

export async function findInventoryItemById(
  itemId: string,
  tenantId: string,
): Promise<InventoryItemRow | undefined> {
  return db('inventory_items')
    .where({ id: itemId, tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();
}

export async function createInventoryItem(
  tenantId: string,
  data: Record<string, unknown>,
): Promise<InventoryItemRow> {
  const [item] = await db('inventory_items')
    .insert({ tenant_id: tenantId, ...data })
    .returning('*');
  return item;
}

// ── #4: Atomic stock update to prevent race condition ──
// Uses UPDATE ... WHERE quantity >= $amount so concurrent requests
// cannot push stock below zero. Returns undefined if insufficient stock.
export async function atomicStockUpdate(
  itemId: string,
  tenantId: string,
  quantityChange: number,
): Promise<{ before: number; after: number } | undefined> {
  if (quantityChange < 0) {
    // Dispense/issue: must have enough stock
    const result = await db('inventory_items')
      .where({ id: itemId, tenant_id: tenantId })
      .where('quantity', '>=', Math.abs(quantityChange))
      .update({
        quantity: db.raw('quantity + ?', [quantityChange]),
        updated_at: new Date(),
      });

    if (result === 0) return undefined;

    const updated = await db('inventory_items')
      .where({ id: itemId, tenant_id: tenantId })
      .first();

    return {
      before: updated.quantity - quantityChange,
      after: updated.quantity,
    };
  } else {
    // Receipt/return/adjustment up: always safe, no stock check needed
    const item = await db('inventory_items')
      .where({ id: itemId, tenant_id: tenantId })
      .first();
    if (!item) return undefined;

    const before = item.quantity;
    const after = before + quantityChange;

    await db('inventory_items')
      .where({ id: itemId, tenant_id: tenantId })
      .update({
        quantity: after,
        last_restocked_at: new Date(),
        updated_at: new Date(),
      });

    return { before, after };
  }
}

// ── Transactions ──

export async function insertTransaction(data: {
  tenant_id: string;
  item_id: string;
  type: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}): Promise<InventoryTransactionRow> {
  const [tx] = await db('inventory_transactions')
    .insert(data)
    .returning('*');
  return tx;
}

export async function findTransactions(
  tenantId: string,
  filters: { itemId?: string; type?: string },
): Promise<(InventoryTransactionRow & { item_name?: string })[]> {
  let query = db('inventory_transactions')
    .where('inventory_transactions.tenant_id', tenantId);

  if (filters.itemId) {
    query = query.andWhere('inventory_transactions.item_id', filters.itemId);
  }
  if (filters.type) {
    query = query.andWhere('inventory_transactions.type', filters.type);
  }

  return query
    .leftJoin('inventory_items', 'inventory_transactions.item_id', 'inventory_items.id')
    .select('inventory_transactions.*', 'inventory_items.name as item_name')
    .orderBy('inventory_transactions.created_at', 'desc')
    .limit(200);
}

// ── Purchase Orders ──

export async function findPurchaseOrders(
  tenantId: string,
  status?: string,
): Promise<PurchaseOrderRow[]> {
  let query = db('purchase_orders')
    .where('purchase_orders.tenant_id', tenantId)
    .whereNull('purchase_orders.deleted_at');

  if (status) {
    query = query.andWhere('purchase_orders.status', status);
  }

  return query.orderBy('created_at', 'desc').limit(50);
}

export async function findPurchaseOrderById(
  poId: string,
): Promise<PurchaseOrderRow | undefined> {
  return db('purchase_orders').where({ id: poId }).first();
}

export async function findPurchaseOrderItems(
  poId: string,
): Promise<PurchaseOrderItemRow[]> {
  return db('purchase_order_items').where({ po_id: poId });
}

export async function createPurchaseOrder(
  data: Record<string, unknown>,
): Promise<PurchaseOrderRow> {
  const [po] = await db('purchase_orders')
    .insert(data)
    .returning('*');
  return po;
}

export async function insertPurchaseOrderItems(
  items: Record<string, unknown>[],
): Promise<void> {
  await db('purchase_order_items').insert(items);
}

export async function updatePurchaseOrderItem(
  itemId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db('purchase_order_items').where({ id: itemId }).update(data);
}

export async function updatePurchaseOrder(
  poId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db('purchase_orders').where({ id: poId }).update(data);
}

export async function findPurchaseOrderItemById(
  poItemId: string,
): Promise<PurchaseOrderItemRow | undefined> {
  return db('purchase_order_items').where({ id: poItemId }).first();
}
