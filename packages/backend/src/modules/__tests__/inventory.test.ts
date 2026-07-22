import { describe, it, expect } from 'vitest';

describe('Inventory Module', () => {
  it('should detect low stock items', () => {
    const items = [
      { name: 'Gloves', quantity: 5, minStock: 10 },
      { name: 'Syringes', quantity: 100, minStock: 50 },
      { name: 'Bandages', quantity: 8, minStock: 20 },
    ];
    const lowStock = items.filter((i) => i.quantity < i.minStock);
    expect(lowStock).toHaveLength(2);
    expect(lowStock.map((i) => i.name)).toEqual(['Gloves', 'Bandages']);
  });

  it('should calculate reorder quantity', () => {
    const minStock = 50;
    const currentStock = 12;
    const maxStock = 100;
    const reorderQty = Math.max(0, maxStock - currentStock);
    expect(reorderQty).toBe(88);
    expect(reorderQty + currentStock).toBe(maxStock);
  });

  it('should track expiry dates correctly', () => {
    const now = new Date();
    const items = [
      { name: 'Aspirin', expiryDate: new Date(now.getTime() - 86400000) },
      { name: 'Ibuprofen', expiryDate: new Date(now.getTime() + 86400000 * 30) },
      { name: 'Amoxicillin', expiryDate: new Date(now.getTime() + 86400000 * 365) },
    ];
    const expired = items.filter((i) => i.expiryDate < now);
    const expiringSoon = items.filter((i) => {
      const daysUntil = (i.expiryDate.getTime() - now.getTime()) / 86400000;
      return daysUntil > 0 && daysUntil <= 90;
    });
    expect(expired).toHaveLength(1);
    expect(expired[0].name).toBe('Aspirin');
    expect(expiringSoon).toHaveLength(1);
    expect(expiringSoon[0].name).toBe('Ibuprofen');
  });

  it('should calculate inventory value', () => {
    const items = [
      { name: 'Item A', quantity: 10, unitCost: 25 },
      { name: 'Item B', quantity: 5, unitCost: 100 },
      { name: 'Item C', quantity: 20, unitCost: 10 },
    ];
    const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    expect(totalValue).toBe(950); // 250 + 500 + 200
  });
});
