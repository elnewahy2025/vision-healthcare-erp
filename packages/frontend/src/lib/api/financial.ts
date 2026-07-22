import { apiClient } from './client';

export interface RevenueSummary {
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  revenueByCategory: { category: string; total: number }[];
}

export interface AgingBucket {
  range: string;
  count: number;
  total: number;
}

export interface TopPatient {
  id: string;
  name: string;
  total: number;
  invoiceCount: number;
}

export interface PlRevenue {
  total: number;
  collected: number;
  outstanding: number;
}

export interface PlExpenseCategory {
  category: string;
  type: string;
  total: number;
}

export interface PlExpenses {
  total: number;
  byCategory: PlExpenseCategory[];
}

export interface PlMonthData {
  month: string;
  revenue: number;
  collected: number;
}

export interface PlExpenseMonthData {
  month: string;
  total: number;
}

export interface PlReport {
  period: { from: string; to: string };
  revenue: PlRevenue;
  expenses: PlExpenses;
  grossProfit: number;
  profitMargin: number;
  revenueByMonth: PlMonthData[];
  expenseByMonth: PlExpenseMonthData[];
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  categoryName?: string;
  categoryCode?: string;
  expenseDate: string;
  description?: string;
  paymentMethod: string;
  status: string;
  vendorName?: string;
  taxType?: string;
  taxAmount: number;
  expenseNumber: string;
  createdAt: string;
}

export interface BudgetPlan {
  id: string;
  name: string;
  period: string;
  startDate: string;
  endDate: string;
  projectedRevenue: number;
  projectedExpenses: number;
  createdAt: string;
}

export interface CreateExpensePayload {
  title: string;
  amount: number;
  categoryId?: string;
  branchId?: string;
  expenseDate?: string;
  description?: string;
  paymentMethod?: string;
  vendorName?: string;
  vendorTaxId?: string;
  taxType?: string;
  taxAmount?: number;
}

export interface CreateBudgetPlanPayload {
  name: string;
  period: string;
  startDate: string;
  endDate: string;
  projectedRevenue?: number;
  projectedExpenses?: number;
}

export const financialApi = {
  revenue: (params?: { period?: string }) =>
    apiClient.get('/billing/revenue', { params }).then((r) => r.data.data as RevenueSummary),
  revenueByMonth: (year?: number) =>
    apiClient.get('/billing/revenue/monthly', { params: { year } }).then((r) => r.data.data as PlMonthData[]),
  aging: () =>
    apiClient.get('/billing/reports/aging').then((r) => r.data.data as AgingBucket[]),
  topPatients: () =>
    apiClient.get('/billing/reports/top-patients').then((r) => r.data.data as TopPatient[]),
  plReport: (params: { from: string; to: string }) =>
    apiClient.get('/financial/pl-report', { params }).then((r) => r.data.data as PlReport),
  listExpenses: (params?: { page?: number; limit?: number; status?: string; categoryId?: string; fromDate?: string; toDate?: string }) =>
    apiClient.get('/expenses', { params }).then((r) => r.data),
  createExpense: (data: CreateExpensePayload) =>
    apiClient.post('/expenses', data).then((r) => r.data.data as ExpenseItem),
  updateExpense: (id: string, data: Partial<CreateExpensePayload>) =>
    apiClient.put(`/expenses/${id}`, data).then((r) => r.data.data),
  approveExpense: (id: string) =>
    apiClient.put(`/expenses/${id}/approve`, {}).then((r) => r.data.data),
  listBudgetPlans: () =>
    apiClient.get('/budget-plans').then((r) => r.data.data as BudgetPlan[]),
  createBudgetPlan: (data: CreateBudgetPlanPayload) =>
    apiClient.post('/budget-plans', data).then((r) => r.data.data as BudgetPlan),
};
