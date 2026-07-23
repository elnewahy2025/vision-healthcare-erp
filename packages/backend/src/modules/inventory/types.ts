// ── Database Row Types ──

export interface WarehouseRow {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  type: string;
  address: Record<string, unknown> | null;
  phone: string | null;
  status: string;
  created_at: string;
}

export interface InventoryItemRow {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
  reorder_point: number;
  unit_cost: number;
  unit_price: number;
  batch_number: string | null;
  expiry_date: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  supplier: string | null;
  description: string | null;
  status: string;
  last_restocked_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransactionRow {
  id: string;
  tenant_id: string;
  item_id: string;
  type: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PurchaseOrderRow {
  id: string;
  tenant_id: string;
  warehouse_id: string | null;
  po_number: string;
  supplier: string;
  status: string;
  total_amount: number;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItemRow {
  id: string;
  po_id: string;
  item_id: string | null;
  item_name: string;
  sku: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
}

// ── API Response Types ──

export interface WarehouseResponse {
  id: string;
  name: string;
  code: string;
  type: string;
}

export interface InventoryItemResponse {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  unitPrice: number;
  batchNumber: string | null;
  expiryDate: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  supplier: string | null;
  warehouseId: string;
  warehouseName: string | null;
  status: string;
  lastRestockedAt: string | null;
}

export interface InventoryTransactionResponse {
  id: string;
  itemId: string;
  itemName?: string;
  type: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseOrderItemResponse {
  id: string;
  itemName: string;
  sku: string | null;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrderResponse {
  id: string;
  poNumber: string;
  supplier: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  items: PurchaseOrderItemResponse[];
  createdAt: string;
}
