import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { UsersRound, Plus, Search, CalendarCheck, Banknote } from 'lucide-react';
import api from '../lib/api';

export default function HrPage() {
  const [tab, setTab] = useState<'employees' | 'leave' | 'payroll'>('employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/hr/employees').then(r => setEmployees(r.data.data)).catch(() => []),
      api.get('/hr/leave-requests').then(r => setLeaves(r.data.data)).catch(() => []),
      api.get('/hr/payroll').then(r => setPayrolls(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const filteredEmployees = employees.filter((e: any) =>
    !search || e.firstName?.toLowerCase().includes(search.toLowerCase()) || e.lastName?.toLowerCase().includes(search.toLowerCase()) || e.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Human Resources</h1><p className="text-gray-500 mt-1">{employees.length} employees</p></div>
        <Button><Plus className="w-4 h-4" /> Add Employee</Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'employees' ? 'primary' : 'secondary'} onClick={() => setTab('employees')}><UsersRound className="w-4 h-4" /> Employees ({employees.length})</Button>
        <Button variant={tab === 'leave' ? 'primary' : 'secondary'} onClick={() => setTab('leave')}><CalendarCheck className="w-4 h-4" /> Leave ({leaves.length})</Button>
        <Button variant={tab === 'payroll' ? 'primary' : 'secondary'} onClick={() => setTab('payroll')}><Banknote className="w-4 h-4" /> Payroll ({payrolls.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'employees' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Position</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {filteredEmployees.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No employees</td></tr> :
                filteredEmployees.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs">{e.employeeCode}</td>
                    <td className="font-medium">{e.firstName} {e.lastName}</td>
                    <td>{e.department}</td>
                    <td className="text-xs">{e.position}</td>
                    <td><Badge>{e.employmentType}</Badge></td>
                    <td><Badge variant={e.status === 'active' ? 'success' : 'warning'}>{e.status}</Badge></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'leave' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Employee</th><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th></tr></thead>
            <tbody>
              {leaves.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No leave requests</td></tr> :
                leaves.map((l: any) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="font-medium">{l.employeeName}</td>
                    <td><Badge>{l.leaveType}</Badge></td>
                    <td className="text-xs">{l.startDate}</td>
                    <td className="text-xs">{l.endDate}</td>
                    <td>{l.totalDays}</td>
                    <td><Badge variant={l.status === 'approved' ? 'success' : l.status === 'pending' ? 'warning' : 'danger'}>{l.status}</Badge></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Period</th><th>Start</th><th>End</th><th>Gross</th><th>Net</th><th>Employees</th><th>Status</th></tr></thead>
            <tbody>
              {payrolls.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No payroll runs</td></tr> :
                payrolls.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="font-medium">{p.periodName}</td>
                    <td className="text-xs">{p.periodStart}</td>
                    <td className="text-xs">{p.periodEnd}</td>
                    <td>{p.totalGross?.toFixed(2)} SAR</td>
                    <td>{p.totalNet?.toFixed(2)} SAR</td>
                    <td>{p.employeeCount}</td>
                    <td><Badge>{p.status}</Badge></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
