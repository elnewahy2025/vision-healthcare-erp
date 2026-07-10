import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Input, Select, Modal, Spinner, EmptyState, Badge } from '../components/ui';
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Users, Calendar, DollarSign, Eye, Search, Filter } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface Branch {
  id: string; name: string; name_ar?: string; code: string; address?: string;
  city?: string; governorate?: string; phone?: string; email?: string;
  manager_name?: string; is_active: boolean; type: string;
  capacity?: number; latitude?: number; longitude?: number;
  patient_count?: number; today_appointments?: number; total_revenue?: number;
}

const governorates = ['Cairo', 'Alexandria', 'Giza', 'Luxor', 'Aswan', 'Port Said', 'Suez', 'Ismailia', 'Mansoura', 'Tanta', 'Zagazig', 'Damanhur', 'Minya', 'Asyut', 'Sohag', 'Qena', 'Hurghada', 'Sharm El Sheikh'];

export default function MultiBranchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({
    name: '', name_ar: '', code: '', address: '', city: '', governorate: '',
    phone: '', email: '', manager_name: '', type: 'branch', capacity: '',
    is_active: true,
  });

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      const { data } = await api.get(`/branches?${params}`);
      setBranches(data.data?.rows || data.data || []);
    } catch { toast.error('Failed to load branches'); }
    setLoading(false);
  };

  useEffect(() => { fetchBranches(); }, [search, filterType]);

  const handleSubmit = async () => {
    try {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : undefined };
      if (editBranch) {
        await api.put(`/branches/${editBranch.id}`, payload);
        toast.success('Branch updated');
      } else {
        await api.post('/branches', payload);
        toast.success('Branch created');
      }
      setShowModal(false); setEditBranch(null);
      setForm({ name: '', name_ar: '', code: '', address: '', city: '', governorate: '', phone: '', email: '', manager_name: '', type: 'branch', capacity: '', is_active: true });
      fetchBranches();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed to save branch'); }
  };

  const handleEdit = (b: Branch) => {
    setEditBranch(b);
    setForm({ name: b.name, name_ar: b.name_ar || '', code: b.code, address: b.address || '', city: b.city || '', governorate: b.governorate || '', phone: b.phone || '', email: b.email || '', manager_name: b.manager_name || '', type: b.type, capacity: b.capacity?.toString() || '', is_active: b.is_active });
    setShowModal(true);
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this branch?')) return;
    try { await api.delete(`/branches/${id}`); toast.success('Branch deactivated'); fetchBranches(); }
    catch { toast.error('Failed to deactivate'); }
  };

  const typeColors: Record<string, string> = { main: 'bg-blue-100 text-blue-700', branch: 'bg-green-100 text-green-700', satellite: 'bg-purple-100 text-purple-700', virtual: 'bg-orange-100 text-orange-700' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.multiBranch') || 'Multi-Branch Management'}</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all clinic locations and branches</p>
        </div>
        <Button onClick={() => { setEditBranch(null); setShowModal(true); }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Branch
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Branches</p><p className="text-xl font-bold">{branches.length}</p></div>
          </div>
        </CardBody></Card>
        <Card><CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Users className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Total Patients</p><p className="text-xl font-bold">{branches.reduce((s, b) => s + (b.patient_count || 0), 0)}</p></div>
          </div>
        </CardBody></Card>
        <Card><CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Calendar className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Today's Appointments</p><p className="text-xl font-bold">{branches.reduce((s, b) => s + (b.today_appointments || 0), 0)}</p></div>
          </div>
        </CardBody></Card>
        <Card><CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><DollarSign className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Total Revenue</p><p className="text-xl font-bold">{branches.reduce((s, b) => s + (b.total_revenue || 0), 0).toLocaleString()} EGP</p></div>
          </div>
        </CardBody></Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input placeholder="Search branches..." value={search} onChange={(e: any) => setSearch(e.target.value)} /></div>
        <Select value={filterType} onChange={(e: any) => setFilterType(e.target.value)} className="w-48" options={[{value: "", label: "All Types"}, {value: "main", label: "Main"}, {value: "branch", label: "Branch"}, {value: "satellite", label: "Satellite"}, {value: "virtual", label: "Virtual"}]} />
      </div>

      {/* Branch Cards */}
      {loading ? <Spinner /> : branches.length === 0 ? (
        <EmptyState title="No branches found" message="Create your first branch to get started" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <CardBody className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg"><Building2 className="w-5 h-5 text-primary-600" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{b.name}</h3>
                      <p className="text-xs text-gray-500">{b.code}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[b.type] || 'bg-gray-100 text-gray-700'}`}>{b.type}</span>
                </div>
                {b.address && <p className="text-sm text-gray-600 flex items-center gap-1 mb-2"><MapPin className="w-3.5 h-3.5" /> {b.address}, {b.city}, {b.governorate}</p>}
                {b.phone && <p className="text-sm text-gray-600 flex items-center gap-1 mb-2"><Phone className="w-3.5 h-3.5" /> {b.phone}</p>}
                {b.manager_name && <p className="text-sm text-gray-600 mb-2">Manager: {b.manager_name}</p>}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                  <div className="text-center"><p className="text-lg font-bold text-blue-600">{b.patient_count || 0}</p><p className="text-xs text-gray-500">Patients</p></div>
                  <div className="text-center"><p className="text-lg font-bold text-green-600">{b.today_appointments || 0}</p><p className="text-xs text-gray-500">Appts Today</p></div>
                  <div className="text-center"><p className="text-lg font-bold text-yellow-600">{(b.total_revenue || 0).toLocaleString()}</p><p className="text-xs text-gray-500">Revenue (EGP)</p></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/branches/${b.id}`)} className="flex-1 flex items-center justify-center gap-1"><Eye className="w-3.5 h-3.5" /> View</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleEdit(b)} className="flex-1 flex items-center justify-center gap-1"><Edit className="w-3.5 h-3.5" /> Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeactivate(b.id)} className="flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditBranch(null); }} title={editBranch ? 'Edit Branch' : 'New Branch'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Branch Name *" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} />
            <Input label="Arabic Name" value={form.name_ar} onChange={(e: any) => setForm({ ...form, name_ar: e.target.value })} />
            <Input label="Branch Code *" value={form.code} onChange={(e: any) => setForm({ ...form, code: e.target.value })} />
            <Select label="Type" value={form.type} onChange={(e: any) => setForm({ ...form, type: e.target.value })} options={[{value: "main", label: "Main"}, {value: "branch", label: "Branch"}, {value: "satellite", label: "Satellite"}, {value: "virtual", label: "Virtual"}]} />
          </div>
          <Input label="Address" value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Governorate" value={form.governorate} onChange={(e: any) => setForm({ ...form, governorate: e.target.value })} options={[{value: "", label: "Select..."}, ...governorates.map(g => ({value: g, label: g}))]} />
            <Input label="City" value={form.city} onChange={(e: any) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Manager Name" value={form.manager_name} onChange={(e: any) => setForm({ ...form, manager_name: e.target.value })} />
            <Input label="Capacity" type="number" value={form.capacity} onChange={(e: any) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setShowModal(false); setEditBranch(null); }}>Cancel</Button>
            <Button onClick={handleSubmit}>{editBranch ? 'Update' : 'Create'} Branch</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
