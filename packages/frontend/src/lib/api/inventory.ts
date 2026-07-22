import { apiClient } from './client';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  unitPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumber?: string;
  manufacturer?: string;
  supplier?: string;
  warehouseId: string;
  warehouseName?: string;
  status: string;
  lastRestockedAt?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: string;
}

export interface PurchaseOrderItem {
  id: string;
  itemName: string;
  sku?: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
  items: PurchaseOrderItem[];
  createdAt: string;
}

export interface CreateItemPayload {
  warehouseId: string;
  sku: string;
  name: string;
  category: string;
  unit?: string;
  quantity?: number;
  reorderPoint?: number;
  unitCost?: number;
  unitPrice?: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumber?: string;
  manufacturer?: string;
  supplier?: string;
  description?: string;
}

export interface CreateWarehousePayload {
  name: string;
  code: string;
  type?: string;
}

export interface CreatePoPayload {
  warehouseId?: string;
  supplier: string;
  orderDate?: string;
  expectedDate?: string;
  notes?: string;
  items?: { itemName: string; sku?: string; quantityOrdered: number; unitCost?: number }[];
}

export const inventoryApi = {
  listItems: (params?: { category?: string; warehouseId?: string; search?: string }) =>
    apiClient.get('/inventory/items', { params }).then((r) => r.data.data),
  createItem: (data: CreateItemPayload) =>
    apiClient.post('/inventory/items', data).then((r) => r.data.data),
  updateStock: (id: string, data: { quantity: number; type?: string; notes?: string }) =>
    apiClient.put(`/inventory/items/${id}/stock`, data).then((r) => r.data.data),
  listWarehouses: () =>
    apiClient.get('/inventory/warehouses').then((r) => r.data.data),
  createWarehouse: (data: CreateWarehousePayload) =>
    apiClient.post('/inventory/warehouses', data).then((r) => r.data.data),
  listPos: (params?: { status?: string }) =>
    apiClient.get('/inventory/pos', { params }).then((r) => r.data.data),
  createPo: (data: CreatePoPayload) =>
    apiClient.post('/inventory/pos', data).then((r) => r.data.data),
  receivePo: (id: string, items: { id: string; quantityReceived: number }[]) =>
    apiClient.put(`/inventory/pos/${id}/receive`, { items }).then((r) => r.data.data),
};
