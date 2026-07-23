import { z } from 'zod';

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  type: z.enum(['main', 'pharmacy', 'supplies', 'equipment']).default('main'),
});

export const createInventoryItemSchema = z.object({
  warehouseId: z.string().uuid(),
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  unit: z.string().max(30).default('piece'),
  quantity: z.number().int().min(0).default(0),
  reorderPoint: z.number().int().min(0).default(10),
  unitCost: z.number().min(0).default(0),
  unitPrice: z.number().min(0).default(0),
  batchNumber: z.string().max(100).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  serialNumber: z.string().max(200).optional(),
  manufacturer: z.string().max(200).optional(),
  supplier: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});

export const updateStockSchema = z.object({
  quantity: z.number().int(),
  type: z.enum(['receipt', 'issue', 'adjustment', 'transfer', 'return']).default('receipt'),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

export const createPurchaseOrderSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  supplier: z.string().min(1).max(200),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(z.object({
    itemId: z.string().uuid().optional(),
    itemName: z.string().min(1).max(200),
    sku: z.string().max(50).optional(),
    quantityOrdered: z.number().int().positive(),
    unitCost: z.number().min(0).default(0),
  })).min(1),
});

export const receivePurchaseOrderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    quantityReceived: z.number().int().min(0),
  })).min(1),
});
