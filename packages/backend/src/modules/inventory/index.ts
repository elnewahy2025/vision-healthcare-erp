import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { authenticate } from '../auth-guard.js';

export async function registerInventoryModule(app: FastifyInstance) {
  // Warehouses
  app.get('/api/v1/inventory/warehouses', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const whs = await db('warehouses').where({ tenant_id: tenantId, status: 'active' });
    return sendSuccess(reply, whs.map((w: WarehouseRow) => ({ id: w.id, name: w.name, code: w.code, type: w.type })));
  });

  app.post('/api/v1/inventory/warehouses', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const body = request.body as Record<string, unknown>;
    const [wh] = await db('warehouses').insert({ tenant_id: tenantId, name: body.name, code: body.code, type: body.type || 'main' }).returning('*');
    return sendSuccess(reply, { id: wh.id, name: wh.name }, 'Warehouse created', 201);
  });

  // Inventory Items
  app.get('/api/v1/inventory/items', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const { category, warehouseId, search } = request.query as { category?: string; search?: string; warehouseId?: string };
    let q = db('inventory_items').where('inventory_items.tenant_id', tenantId).whereNull('inventory_items.deleted_at');
    if (category) q = q.andWhere('inventory_items.category', category);
    if (warehouseId) q = q.andWhere('inventory_items.warehouse_id', warehouseId);
    if (search) q = q.andWhere(function() { this.where('name', 'ilike', '%' + search + '%').orWhere('sku', 'ilike', '%' + search + '%'); });
    const items = await q.leftJoin('warehouses', 'inventory_items.warehouse_id', 'warehouses.id')
      .select('inventory_items.*', 'warehouses.name as wh_name').orderBy('name');
    return sendSuccess(reply, items.map((i: InventoryItemRow) => ({ id: i.id, sku: i.sku, name: i.name, category: i.category, unit: i.unit, quantity: i.quantity, reorderPoint: i.reorder_point, unitCost: Number(i.unit_cost), unitPrice: Number(i.unit_price), batchNumber: i.batch_number, expiryDate: i.expiry_date, serialNumber: i.serial_number, manufacturer: i.manufacturer, supplier: i.supplier, warehouseId: i.warehouse_id, warehouseName: i.wh_name, status: i.status, lastRestockedAt: i.last_restocked_at })));
  });

  app.post('/api/v1/inventory/items', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const body = request.body as Record<string, unknown>;
    const [item] = await db('inventory_items').insert({ tenant_id: tenantId, warehouse_id: body.warehouseId, sku: body.sku, name: body.name, category: body.category, unit: body.unit || 'piece', quantity: body.quantity || 0, reorder_point: body.reorderPoint || 10, unit_cost: body.unitCost || 0, unit_price: body.unitPrice || 0, batch_number: body.batchNumber, expiry_date: body.expiryDate, serial_number: body.serialNumber, manufacturer: body.manufacturer, supplier: body.supplier, description: body.description }).returning('*');
    if (body.quantity) await db('inventory_transactions').insert({ tenant_id: tenantId, item_id: item.id, type: 'receipt', quantity: body.quantity, quantity_before: 0, quantity_after: body.quantity, notes: 'Initial stock' });
    return sendSuccess(reply, { id: item.id, sku: item.sku, name: item.name }, 'Item added', 201);
  });

  app.put('/api/v1/inventory/items/:id/stock', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as { id: string }; const body = request.body as Record<string, unknown>;
    const item = await db('inventory_items').where({ id }).first();
    const before = item.quantity;
    const after = before + body.quantity;
    await db('inventory_items').where({ id }).update({ quantity: after, last_restocked_at: new Date(), updated_at: new Date() });
    await db('inventory_transactions').insert({ tenant_id: item.tenant_id, item_id: id, type: body.type || 'receipt', quantity: body.quantity, quantity_before: before, quantity_after: after, reference_type: body.referenceType || null, reference_id: body.referenceId || null, notes: body.notes || null });
    return sendSuccess(reply, { quantityBefore: before, quantityAfter: after }, 'Stock updated');
  });

  // Purchase Orders
  app.get('/api/v1/inventory/pos', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const { status } = request.query as PaginationQuery & { status?: string };
    let q = db('purchase_orders').where('purchase_orders.tenant_id', tenantId).whereNull('purchase_orders.deleted_at');
    if (status) q = q.andWhere('purchase_orders.status', status);
    const pos = await q.orderBy('created_at', 'desc').limit(50);
    return sendSuccess(reply, await Promise.all(pos.map(async (po: Record<string, unknown>) => {
      const items = await db('purchase_order_items').where({ po_id: po.id });
      return { id: po.id, poNumber: po.po_number, supplier: po.supplier, status: po.status, totalAmount: Number(po.total_amount), orderDate: po.order_date, expectedDate: po.expected_date, receivedDate: po.received_date, notes: po.notes, items: items.map((i: PurchaseOrderItemRow) => ({ id: i.id, itemName: i.item_name, sku: i.sku, quantityOrdered: i.quantity_ordered, quantityReceived: i.quantity_received, unitCost: Number(i.unit_cost), totalCost: Number(i.total_cost) })), createdAt: po.created_at };
    })));
  });

  app.post('/api/v1/inventory/pos', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request); const body = request.body as Record<string, unknown>;
    const poNum = "PO-" + Date.now().toString(36).toUpperCase();
    let total = 0;
    if (body.items) { body.items.forEach((i: Record<string, unknown>) => { total += (i.quantityOrdered || 0) * (i.unitCost || 0); }); }
    const [po] = await db('purchase_orders').insert({ tenant_id: tenantId, warehouse_id: body.warehouseId, po_number: poNum, supplier: body.supplier, total_amount: total, order_date: body.orderDate || new Date().toISOString().split('T')[0], expected_date: body.expectedDate, notes: body.notes, created_by: ctx.userId }).returning('*');
    if (body.items) {
      await db('purchase_order_items').insert(body.items.map((i: PurchaseOrderItemRow) => ({ po_id: po.id, item_id: i.itemId || null, item_name: i.itemName, sku: i.sku || null, quantity_ordered: i.quantityOrdered, unit_cost: i.unitCost || 0, total_cost: (i.quantityOrdered || 0) * (i.unitCost || 0) })));
    }
    return sendSuccess(reply, { id: po.id, poNumber: po.po_number }, 'Purchase order created', 201);
  });

  app.put('/api/v1/inventory/pos/:id/receive', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as { id: string }; const { items } = request.body as Record<string, unknown>;
    if (items) {
      for (const it of items) {
        await db('purchase_order_items').where({ id: it.id }).update({ quantity_received: it.quantityReceived });
        const poi = await db('purchase_order_items').where({ id: it.id }).first();
        if (poi.item_id) {
          const inv = await db('inventory_items').where({ id: poi.item_id }).first();
          const before = inv.quantity; const after = before + (it.quantityReceived || 0);
          await db('inventory_items').where({ id: poi.item_id }).update({ quantity: after, last_restocked_at: new Date(), updated_at: new Date() });
          await db('inventory_transactions').insert({ tenant_id: inv.tenant_id, item_id: poi.item_id, type: 'receipt', quantity: it.quantityReceived || 0, quantity_before: before, quantity_after: after, reference_type: 'purchase_order', reference_id: id });
        }
      }
    }
    await db('purchase_orders').where({ id }).update({ status: 'received', received_date: new Date().toISOString().split('T')[0], updated_at: new Date() });
    return sendSuccess(reply, null, 'PO received');
  });
}
