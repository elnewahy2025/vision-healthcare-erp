import type {
  WarehouseRow, InventoryItemRow, InventoryTransactionRow,
  PurchaseOrderRow, PurchaseOrderItemRow,
  WarehouseResponse, InventoryItemResponse, InventoryTransactionResponse,
  PurchaseOrderResponse, PurchaseOrderItemResponse,
} from './types.js';

export function mapWarehouse(w: WarehouseRow): WarehouseResponse {
  return {
    id: w.id,
    name: w.name,
    code: w.code,
    type: w.type,
  };
}

export function mapInventoryItem(item: InventoryItemRow & { wh_name?: string }): InventoryItemResponse {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity,
    reorderPoint: item.reorder_point,
    unitCost: Number(item.unit_cost),
    unitPrice: Number(item.unit_price),
    batchNumber: item.batch_number,
    expiryDate: item.expiry_date,
    serialNumber: item.serial_number,
    manufacturer: item.manufacturer,
    supplier: item.supplier,
    warehouseId: item.warehouse_id,
    warehouseName: item.wh_name || null,
    status: item.status,
    lastRestockedAt: item.last_restocked_at,
  };
}

export function mapInventoryTransaction(
  tx: InventoryTransactionRow & { item_name?: string },
): InventoryTransactionResponse {
  return {
    id: tx.id,
    itemId: tx.item_id,
    itemName: tx.item_name,
    type: tx.type,
    quantity: tx.quantity,
    quantityBefore: tx.quantity_before,
    quantityAfter: tx.quantity_after,
    referenceType: tx.reference_type,
    referenceId: tx.reference_id,
    notes: tx.notes,
    createdAt: tx.created_at,
  };
}

export function mapPurchaseOrderItem(i: PurchaseOrderItemRow): PurchaseOrderItemResponse {
  return {
    id: i.id,
    itemName: i.item_name,
    sku: i.sku,
    quantityOrdered: i.quantity_ordered,
    quantityReceived: i.quantity_received,
    unitCost: Number(i.unit_cost),
    totalCost: Number(i.total_cost),
  };
}

export function mapPurchaseOrder(po: PurchaseOrderRow, items: PurchaseOrderItemRow[]): PurchaseOrderResponse {
  return {
    id: po.id,
    poNumber: po.po_number,
    supplier: po.supplier,
    status: po.status,
    totalAmount: Number(po.total_amount),
    orderDate: po.order_date,
    expectedDate: po.expected_date,
    receivedDate: po.received_date,
    notes: po.notes,
    items: items.map(mapPurchaseOrderItem),
    createdAt: po.created_at,
  };
}
