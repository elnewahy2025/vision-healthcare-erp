import type { FastifyRequest, FastifyReply } from 'fastify';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { sendSuccess } from '../../utils/response.js';
import { ValidationError, NotFoundError } from '@healthcare/shared/errors';
import { logAudit } from '../../services/audit.js';
import * as repo from './inventory.repository.js';
import {
  mapWarehouse, mapInventoryItem, mapInventoryTransaction, mapPurchaseOrder,
} from './inventory.mapper.js';
import {
  createWarehouseSchema, createInventoryItemSchema, updateStockSchema,
  createPurchaseOrderSchema, receivePurchaseOrderSchema,
} from './inventory.schema.js';

// ── Warehouses ──

export async function listWarehouses(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = getTenantId(request);
  const warehouses = await repo.findWarehouses(tenantId);
  return sendSuccess(reply, warehouses.map(mapWarehouse));
}

export async function createWarehouse(request: FastifyRequest, reply: FastifyReply) {
  const body = createWarehouseSchema.parse(request.body);
  const tenantId = getTenantId(request);
  const { userId } = getCtx(request);

  const warehouse = await repo.createWarehouse(tenantId, body);

  await logAudit({ tenantId, userId, action: 'inventory.warehouse.created', entityType: 'warehouse', entityId: warehouse.id });

  return sendSuccess(reply, mapWarehouse(warehouse), 'Warehouse created', 201);
}

// ── Inventory Items ──

export async function listItems(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = getTenantId(request);
  const { category, warehouseId, search } = request.query as Record<string, string | undefined>;

  const items = await repo.findInventoryItems(tenantId, { category, warehouseId, search });
  return sendSuccess(reply, items.map(mapInventoryItem));
}

export async function getItem(request: FastifyRequest, reply: FastifyReply) {
  const { itemId } = request.params as { itemId: string };
  const tenantId = getTenantId(request);

  const item = await repo.findInventoryItemById(itemId, tenantId);
  if (!item) throw new NotFoundError('Inventory item', itemId);

  return sendSuccess(reply, mapInventoryItem(item));
}

export async function createItem(request: FastifyRequest, reply: FastifyReply) {
  const body = createInventoryItemSchema.parse(request.body);
  const tenantId = getTenantId(request);
  const { userId } = getCtx(request);

  const item = await repo.createInventoryItem(tenantId, {
    warehouse_id: body.warehouseId,
    sku: body.sku,
    name: body.name,
    category: body.category || null,
    unit: body.unit,
    quantity: body.quantity,
    reorder_point: body.reorderPoint,
    unit_cost: body.unitCost,
    unit_price: body.unitPrice,
    batch_number: body.batchNumber || null,
    expiry_date: body.expiryDate || null,
    serial_number: body.serialNumber || null,
    manufacturer: body.manufacturer || null,
    supplier: body.supplier || null,
    description: body.description || null,
  });

  if (body.quantity > 0) {
    await repo.insertTransaction({
      tenant_id: tenantId,
      item_id: item.id,
      type: 'receipt',
      quantity: body.quantity,
      quantity_before: 0,
      quantity_after: body.quantity,
      notes: 'Initial stock',
      created_by: userId,
    });
  }

  await logAudit({ tenantId, userId, action: 'inventory.item.created', entityType: 'inventory_item', entityId: item.id });

  return sendSuccess(reply, mapInventoryItem(item), 'Item added', 201);
}

// ── #4: Stock update with race-condition-safe atomic operation ──

export async function updateStock(request: FastifyRequest, reply: FastifyReply) {
  const { itemId } = request.params as { itemId: string };
  const body = updateStockSchema.parse(request.body);
  const tenantId = getTenantId(request);
  const { userId } = getCtx(request);

  const result = await repo.atomicStockUpdate(itemId, tenantId, body.quantity);
  if (!result) {
    throw new ValidationError('Insufficient stock or item not found');
  }

  await repo.insertTransaction({
    tenant_id: tenantId,
    item_id: itemId,
    type: body.type,
    quantity: body.quantity,
    quantity_before: result.before,
    quantity_after: result.after,
    reference_type: body.referenceType || null,
    reference_id: body.referenceId || null,
    notes: body.notes || null,
    created_by: userId,
  });

  await logAudit({ tenantId, userId, action: `inventory.stock.${body.type}`, entityType: 'inventory_item', entityId: itemId,
    metadata: { quantity: body.quantity, before: result.before, after: result.after },
  });

  return sendSuccess(reply, { quantityBefore: result.before, quantityAfter: result.after }, 'Stock updated');
}

// ── Transactions ──

export async function listTransactions(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = getTenantId(request);
  const { itemId, type } = request.query as Record<string, string | undefined>;

  const transactions = await repo.findTransactions(tenantId, { itemId, type });
  return sendSuccess(reply, transactions.map(mapInventoryTransaction));
}

// ── Purchase Orders ──

export async function listPurchaseOrders(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = getTenantId(request);
  const { status } = request.query as { status?: string };

  const pos = await repo.findPurchaseOrders(tenantId, status);
  const posWithItems = await Promise.all(
    pos.map(async (po) => {
      const items = await repo.findPurchaseOrderItems(po.id);
      return mapPurchaseOrder(po, items);
    }),
  );

  return sendSuccess(reply, posWithItems);
}

export async function createPurchaseOrder(request: FastifyRequest, reply: FastifyReply) {
  const body = createPurchaseOrderSchema.parse(request.body);
  const tenantId = getTenantId(request);
  const { userId } = getCtx(request);

  const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

  let totalAmount = 0;
  for (const item of body.items) {
    totalAmount += item.quantityOrdered * item.unitCost;
  }

  const po = await repo.createPurchaseOrder({
    tenant_id: tenantId,
    warehouse_id: body.warehouseId || null,
    po_number: poNumber,
    supplier: body.supplier,
    total_amount: totalAmount,
    order_date: body.orderDate || new Date().toISOString().split('T')[0],
    expected_date: body.expectedDate || null,
    notes: body.notes || null,
    created_by: userId,
  });

  await repo.insertPurchaseOrderItems(
    body.items.map((item) => ({
      po_id: po.id,
      item_id: item.itemId || null,
      item_name: item.itemName,
      sku: item.sku || null,
      quantity_ordered: item.quantityOrdered,
      unit_cost: item.unitCost,
      total_cost: item.quantityOrdered * item.unitCost,
    })),
  );

  await logAudit({ tenantId, userId, action: 'inventory.po.created', entityType: 'purchase_order', entityId: po.id,
    metadata: { poNumber, supplier: body.supplier, totalAmount },
  });

  return sendSuccess(reply, { id: po.id, poNumber: po.po_number }, 'Purchase order created', 201);
}

export async function receivePurchaseOrder(request: FastifyRequest, reply: FastifyReply) {
  const { poId } = request.params as { poId: string };
  const body = receivePurchaseOrderSchema.parse(request.body);
  const tenantId = getTenantId(request);
  const { userId } = getCtx(request);

  for (const received of body.items) {
    await repo.updatePurchaseOrderItem(received.id, {
      quantity_received: received.quantityReceived,
    });

    const poi = await repo.findPurchaseOrderItemById(received.id);
    if (poi?.item_id) {
      const result = await repo.atomicStockUpdate(poi.item_id, tenantId, received.quantityReceived);
      if (result) {
        await repo.insertTransaction({
          tenant_id: tenantId,
          item_id: poi.item_id,
          type: 'receipt',
          quantity: received.quantityReceived,
          quantity_before: result.before,
          quantity_after: result.after,
          reference_type: 'purchase_order',
          reference_id: poId,
          created_by: userId,
        });
      }
    }
  }

  await repo.updatePurchaseOrder(poId, {
    status: 'received',
    received_date: new Date().toISOString().split('T')[0],
    updated_at: new Date(),
  });

  await logAudit({ tenantId, userId, action: 'inventory.po.received', entityType: 'purchase_order', entityId: poId });

  return sendSuccess(reply, null, 'PO received');
}
