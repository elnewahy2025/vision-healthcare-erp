import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Select, Badge, Spinner, Modal } from '../components/ui';
import { PillBottle, AlertTriangle, Search, Plus, RefreshCw, Bell, Package, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Drug interaction database (Egypt market medications)
const DRUG_INTERACTIONS: Record<string, string[]> = {
  'Warfarin': ['Aspirin', 'Ibuprofen', 'Diclofenac', 'Naproxen'],
  'Metformin': ['Alcohol', 'Contrast Dye'],
  'Lisinopril': ['Potassium Supplements', 'NSAIDs', 'Ibuprofen'],
  'Amlodipine': ['Simvastatin', 'Grapefruit'],
  'Atorvastatin': ['Clarithromycin', 'Itraconazole', 'Grapefruit'],
  'Omeprazole': ['Clopidogrel', 'Methotrexate'],
  'Aspirin': ['Warfarin', 'Ibuprofen', 'Methotrexate'],
  'Ibuprofen': ['Warfarin', 'Lithium', 'Methotrexate', 'Lisinopril'],
  'Metoprolol': ['Verapamil', 'Digoxin'],
  'Ciprofloxacin': ['Antacids', 'Iron Supplements', 'Dairy Products'],
  'Azithromycin': ['Warfarin', 'Digoxin'],
  'Diclofenac': ['Warfarin', 'Lithium', 'Methotrexate'],
  'Clopidogrel': ['Omeprazole', 'Esomeprazole'],
};

const COMMON_DRUGS = [
  { name: 'Amoxicillin', category: 'Antibiotic', form: 'Capsule 500mg', price_egp: 45 },
  { name: 'Azithromycin', category: 'Antibiotic', form: 'Tablet 250mg', price_egp: 85 },
  { name: 'Ciprofloxacin', category: 'Antibiotic', form: 'Tablet 500mg', price_egp: 65 },
  { name: 'Metformin', category: 'Antidiabetic', form: 'Tablet 500mg', price_egp: 25 },
  { name: 'Gliclazide', category: 'Antidiabetic', form: 'Tablet 80mg', price_egp: 35 },
  { name: 'Amlodipine', category: 'Antihypertensive', form: 'Tablet 5mg', price_egp: 30 },
  { name: 'Lisinopril', category: 'Antihypertensive', form: 'Tablet 10mg', price_egp: 40 },
  { name: 'Atorvastatin', category: 'Statin', form: 'Tablet 20mg', price_egp: 55 },
  { name: 'Omeprazole', category: 'PPI', form: 'Capsule 20mg', price_egp: 35 },
  { name: 'Pantoprazole', category: 'PPI', form: 'Tablet 40mg', price_egp: 45 },
  { name: 'Ibuprofen', category: 'NSAID', form: 'Tablet 400mg', price_egp: 15 },
  { name: 'Diclofenac', category: 'NSAID', form: 'Tablet 50mg', price_egp: 20 },
  { name: 'Aspirin', category: 'Antiplatelet', form: 'Tablet 81mg', price_egp: 12 },
  { name: 'Clopidogrel', category: 'Antiplatelet', form: 'Tablet 75mg', price_egp: 95 },
  { name: 'Warfarin', category: 'Anticoagulant', form: 'Tablet 5mg', price_egp: 30 },
  { name: 'Levothyroxine', category: 'Thyroid', form: 'Tablet 50mcg', price_egp: 25 },
  { name: 'Cetirizine', category: 'Antihistamine', form: 'Tablet 10mg', price_egp: 18 },
  { name: 'Salbutamol', category: 'Bronchodilator', form: 'Inhaler', price_egp: 65 },
  { name: 'Prednisolone', category: 'Corticosteroid', form: 'Tablet 5mg', price_egp: 15 },
  { name: 'Pantoprazole', category: 'PPI', form: 'Tablet 20mg', price_egp: 35 },
];

export default function PharmacyAdvancedPage() {
  const [tab, setTab] = useState<'interactions' | 'inventory' | 'prescriptions' | 'alerts'>('interactions');
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [interactions, setInteractions] = useState<{ drug1: string; drug2: string; severity: string; description: string }[]>([]);
  const [searchDrug, setSearchDrug] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredDrugs = COMMON_DRUGS.filter(d => d.name.toLowerCase().includes(searchDrug.toLowerCase()));

  const checkInteractions = () => {
    const found: typeof interactions = [];
    for (let i = 0; i < selectedDrugs.length; i++) {
      for (let j = i + 1; j < selectedDrugs.length; j++) {
        const d1 = selectedDrugs[i], d2 = selectedDrugs[j];
        const interacts1 = DRUG_INTERACTIONS[d1]?.includes(d2);
        const interacts2 = DRUG_INTERACTIONS[d2]?.includes(d1);
        if (interacts1 || interacts2) {
          found.push({ drug1: d1, drug2: d2, severity: 'major', description: `${d1} and ${d2} have a known interaction. Consult physician before combining.` });
        }
      }
    }
    // Also check moderate interactions based on categories
    const cats1 = selectedDrugs.map(d => COMMON_DRUGS.find(dd => dd.name === d)?.category);
    if (cats1.includes('NSAID') && cats1.includes('Anticoagulant')) {
      found.push({ drug1: 'NSAID', drug2: 'Anticoagulant', severity: 'critical', description: 'NSAIDs increase bleeding risk when combined with anticoagulants!' });
    }
    if (cats1.filter(c => c === 'Antihypertensive').length > 1) {
      found.push({ drug1: 'Antihypertensive', drug2: 'Antihypertensive', severity: 'moderate', description: 'Multiple antihypertensives may cause hypotension. Monitor blood pressure.' });
    }
    setInteractions(found);
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inventory?category=pharmacy&limit=100');
      const items = data.data?.rows || data.data || [];
      setInventory(items);
      setLowStockAlerts(items.filter((i: any) => (i.quantity || 0) <= (i.reorder_level || 10)));
    } catch { toast.error('Failed to load inventory'); }
    setLoading(false);
  };

  useEffect(() => { fetchInventory(); }, []);

  const toggleDrug = (name: string) => {
    setSelectedDrugs(prev => prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]);
  };

  const tabs = [
    { key: 'interactions', label: 'Drug Interaction Checker', icon: AlertTriangle },
    { key: 'inventory', label: 'Inventory Status', icon: Package },
    { key: 'alerts', label: `Low Stock Alerts (${lowStockAlerts.length})`, icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pharmacy Advanced</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Drug Interaction Checker */}
      {tab === 'interactions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card><CardBody className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Select Medications</h3>
              <Input placeholder="Search drugs..." value={searchDrug} onChange={(e: any) => setSearchDrug(e.target.value)} className="mb-3" />
              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredDrugs.map((d) => (
                  <button key={d.name} onClick={() => toggleDrug(d.name)}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left text-sm ${selectedDrugs.includes(d.name) ? 'bg-primary-100 border border-primary-300' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedDrugs.includes(d.name) ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                      {selectedDrugs.includes(d.name) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.category} — {d.form}</p>
                    </div>
                  </button>
                ))}
              </div>
              {selectedDrugs.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-500 mb-2">{selectedDrugs.length} selected</p>
                  <Button onClick={checkInteractions} className="w-full">Check Interactions</Button>
                </div>
              )}
            </CardBody></Card>
          </div>

          <div className="lg:col-span-2">
            <Card><CardBody className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Interaction Results</h3>
              {interactions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">{selectedDrugs.length > 0 ? 'No interactions found between selected medications' : 'Select medications to check for interactions'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interactions.map((int, i) => (
                    <div key={i} className={`p-4 rounded-lg border-l-4 ${int.severity === 'critical' ? 'bg-red-50 border-red-500' : int.severity === 'major' ? 'bg-orange-50 border-orange-500' : 'bg-yellow-50 border-yellow-500'}`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 ${int.severity === 'critical' ? 'text-red-500' : int.severity === 'major' ? 'text-orange-500' : 'text-yellow-500'}`} />
                        <div>
                          <p className="font-medium text-gray-900">{int.drug1} ↔ {int.drug2}</p>
                          <Badge variant={int.severity === 'critical' ? 'danger' : int.severity === 'major' ? 'warning' : 'info'} className="mt-1">{int.severity.toUpperCase()}</Badge>
                          <p className="text-sm text-gray-600 mt-1">{int.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody></Card>
          </div>
        </div>
      )}

      {/* Inventory Status */}
      {tab === 'inventory' && (
        <Card><CardBody className="p-0">
          {loading ? <Spinner /> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">Medication</th><th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Quantity</th><th className="px-4 py-3 text-left">Price (EGP)</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr></thead>
              <tbody>{inventory.map((item: any, i: number) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{item.name || item.medication_name}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{item.price?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={(item.quantity || 0) <= (item.reorder_level || 10) ? 'danger' : 'success'}>
                      {(item.quantity || 0) <= (item.reorder_level || 10) ? 'Low Stock' : 'In Stock'}
                    </Badge>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardBody></Card>
      )}

      {/* Low Stock Alerts */}
      {tab === 'alerts' && (
        <Card><CardBody className="p-4">
          {lowStockAlerts.length === 0 ? (
            <div className="text-center py-8"><Package className="w-12 h-12 text-green-400 mx-auto mb-3" /><p className="text-gray-500">All medications are adequately stocked</p></div>
          ) : (
            <div className="space-y-3">
              {lowStockAlerts.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name || item.medication_name}</p>
                    <p className="text-sm text-red-600">Only {item.quantity} units remaining (reorder at {item.reorder_level || 10})</p>
                  </div>
                  <Button size="sm" variant="secondary">Reorder</Button>
                </div>
              ))}
            </div>
          )}
        </CardBody></Card>
      )}
    </div>
  );
}
