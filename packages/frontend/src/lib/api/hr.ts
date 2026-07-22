import { apiClient } from './client';

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentType: string;
  hireDate: string;
  status: string;
  baseSalary: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string;
  managerNotes?: string;
  createdAt: string;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  bonuses: number;
  overtime: number;
  tax: number;
}

export interface PayrollRun {
  id: string;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  processedAt: string;
  entries: PayrollEntry[];
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentType?: string;
  hireDate?: string;
  baseSalary?: number;
  payFrequency?: string;
}

export interface CreateLeavePayload {
  employeeId: string;
  leaveType?: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export const hrApi = {
  listEmployees: (params?: { department?: string; status?: string }) =>
    apiClient.get('/hr/employees', { params }).then((r) => r.data.data),
  createEmployee: (data: CreateEmployeePayload) =>
    apiClient.post('/hr/employees', data).then((r) => r.data.data),
  listAttendance: (params?: { date?: string; employeeId?: string }) =>
    apiClient.get('/hr/attendance', { params }).then((r) => r.data.data),
  listLeaveRequests: (params?: { status?: string; employeeId?: string }) =>
    apiClient.get('/hr/leave-requests', { params }).then((r) => r.data.data),
  createLeaveRequest: (data: CreateLeavePayload) =>
    apiClient.post('/hr/leave-requests', data).then((r) => r.data.data),
  approveLeave: (id: string, data: { status: string; managerNotes?: string }) =>
    apiClient.put(`/hr/leave-requests/${id}/approve`, data).then((r) => r.data.data),
  listPayroll: () =>
    apiClient.get('/hr/payroll').then((r) => r.data.data),
};
