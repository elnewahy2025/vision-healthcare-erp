import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { authenticate } from '../auth-guard.js';

export async function registerHrModule(app: FastifyInstance) {
  app.get('/api/v1/hr/employees', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const { department, status } = request.query as { department?: string; status?: string };
    let q = db('employees').where('employees.tenant_id', tenantId).whereNull('employees.deleted_at');
    if (department) q = q.andWhere('department', department);
    if (status) q = q.andWhere('employees.status', status);
    const emps = await q.orderBy('first_name');
    return sendSuccess(reply, emps.map((e: EmployeeRow) => ({ id: e.id, employeeCode: e.employee_code, firstName: e.first_name, lastName: e.last_name, email: e.email, phone: e.phone, department: e.department, position: e.position, employmentType: e.employment_type, hireDate: e.hire_date, status: e.status, baseSalary: Number(e.base_salary) })));
  });

  app.post('/api/v1/hr/employees', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request); const body = request.body as Record<string, unknown>;
    const empCode = "EMP-" + String(Date.now()).slice(-6);
    const [emp] = await db('employees').insert({ tenant_id: tenantId, employee_code: body.employeeCode || empCode, first_name: body.firstName, last_name: body.lastName, email: body.email, phone: body.phone, department: body.department, position: body.position, employment_type: body.employmentType || 'full_time', hire_date: body.hireDate, base_salary: body.baseSalary || 0, pay_frequency: body.payFrequency || 'monthly', created_by: ctx.userId }).returning('*');
    return sendSuccess(reply, { id: emp.id, employeeCode: emp.employee_code }, 'Employee added', 201);
  });

  app.get('/api/v1/hr/attendance', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const { date, employeeId } = request.query as { date?: string; employeeId?: string };
    let q = db('attendance').where('attendance.tenant_id', tenantId);
    if (date) q = q.andWhere('date', date); if (employeeId) q = q.andWhere('employee_id', employeeId);
    const rows = await q.leftJoin('employees', 'attendance.employee_id', 'employees.id').select('attendance.*', 'employees.first_name as ef', 'employees.last_name as el').orderBy('date', 'desc').limit(50);
    return sendSuccess(reply, rows.map((r: AttendanceRow) => ({ id: r.id, employeeId: r.employee_id, employeeName: r.ef + ' ' + r.el, date: r.date, clockIn: r.clock_in, clockOut: r.clock_out, status: r.status, notes: r.notes })));
  });

  app.get('/api/v1/hr/leave-requests', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const { status, employeeId } = request.query as { employeeId?: string; status?: string };
    let q = db('leave_requests').where('leave_requests.tenant_id', tenantId);
    if (status) q = q.andWhere('leave_requests.status', status); if (employeeId) q = q.andWhere('leave_requests.employee_id', employeeId);
    const rows = await q.leftJoin('employees', 'leave_requests.employee_id', 'employees.id').select('leave_requests.*', 'employees.first_name as ef', 'employees.last_name as el').orderBy('created_at', 'desc').limit(50);
    return sendSuccess(reply, rows.map((r: LeaveRequestRow) => ({ id: r.id, employeeId: r.employee_id, employeeName: r.ef + ' ' + r.el, leaveType: r.leave_type, startDate: r.start_date, endDate: r.end_date, totalDays: r.total_days, status: r.status, reason: r.reason, managerNotes: r.manager_notes, createdAt: r.created_at })));
  });

  app.post('/api/v1/hr/leave-requests', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request); const body = request.body as Record<string, unknown>;
    const start = new Date(body.startDate); const end = new Date(body.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1;
    const [lr] = await db('leave_requests').insert({ tenant_id: tenantId, employee_id: body.employeeId, leave_type: body.leaveType || 'annual', start_date: body.startDate, end_date: body.endDate, total_days: days, reason: body.reason, created_by: ctx.userId }).returning('*');
    return sendSuccess(reply, { id: lr.id }, 'Leave request created', 201);
  });

  app.put('/api/v1/hr/leave-requests/:id/approve', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as { id: string }; const ctx = getCtx(request); const { status, managerNotes } = request.body as Record<string, unknown>;
    await db('leave_requests').where({ id }).update({ status: status || 'approved', manager_notes: managerNotes || null, approved_by: ctx.userId, approved_at: new Date(), updated_at: new Date() });
    return sendSuccess(reply, null, 'Leave ' + status);
  });

  app.get('/api/v1/hr/payroll', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const runs = await db('payroll_runs').where({ tenant_id: tenantId }).orderBy('created_at', 'desc').limit(20);
    return sendSuccess(reply, await Promise.all(runs.map(async (run: Record<string, unknown>) => {
      const entries = await db('payroll_entries').where({ payroll_run_id: run.id });
      return { id: run.id, periodName: run.period_name, periodStart: run.period_start, periodEnd: run.period_end, paymentDate: run.payment_date, status: run.status, totalGross: Number(run.total_gross), totalDeductions: Number(run.total_deductions), totalNet: Number(run.total_net), employeeCount: entries.length, processedAt: run.processed_at, entries: entries.map((e: PayrollEntryRow) => ({ id: e.id, employeeId: e.employee_id, grossPay: Number(e.gross_pay), deductions: Number(e.deductions), netPay: Number(e.net_pay), bonuses: Number(e.bonuses), overtime: Number(e.overtime), tax: Number(e.tax) })) };
    })));
  });
}
