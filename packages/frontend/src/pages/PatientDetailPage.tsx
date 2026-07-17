import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientsApi, emrApi, billingApi } from '../lib/api';
import { ArrowLeft, User, Phone, Calendar, Droplets, Activity, FileText, Receipt, Loader2 } from 'lucide-react';

export default function PatientDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    patientsApi.get(id)
      .then(setPatient)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
  );
  if (!patient) return <div className="text-center py-12 text-gray-500">Patient not found</div>;

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || '-'}</span>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link to="/patients" className="btn-ghost btn-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{patient.firstName} {patient.lastName}</h1>
              <span className="badge-success">{patient.status}</span>
            </div>
            <p className="text-sm text-gray-500 font-mono">{patient.medicalRecordNumber}</p>
          </div>
        </div>
        <Link to={`/appointments?patientId=${patient.id}`} className="btn-primary">
          <Calendar className="w-4 h-4" /> New Appointment
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold">{t('patient.details')}</h2></div>
          <div className="card-body">
            <InfoRow label="MRN" value={patient.medicalRecordNumber} />
            <InfoRow label={t('patient.dob')} value={patient.dateOfBirth} />
            <InfoRow label={t('patient.gender')} value={patient.gender} />
            <InfoRow label={t('patient.phone')} value={patient.phone} />
            <InfoRow label={t('patient.email')} value={patient.email} />
            <InfoRow label={t('patient.bloodType')} value={patient.bloodType} />
            <InfoRow label={t('patient.nationality')} value={patient.nationality} />
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold">Recent Appointments</h2></div>
          <div className="card-body">
            {patient.recentAppointments?.length > 0 ? (
              <div className="space-y-3">
                {patient.recentAppointments.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.type}</p>
                      <p className="text-xs text-gray-500">{a.appointment_date} {a.start_time}</p>
                    </div>
                    <span className={`badge ${
                      a.status === 'completed' ? 'badge-success' :
                      a.status === 'cancelled' ? 'badge-danger' : 'badge-warning'
                    }`}>{a.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">{t('common.noData')}</p>}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold">Recent Invoices</h2></div>
          <div className="card-body">
            {patient.recentInvoices?.length > 0 ? (
              <div className="space-y-3">
                {patient.recentInvoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Receipt className="w-8 h-8 text-purple-500 bg-purple-50 p-1.5 rounded-lg" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500">{inv.total} EGP</p>
                    </div>
                    <span className={`badge ${
                      inv.status === 'paid' ? 'badge-success' :
                      inv.status === 'overdue' ? 'badge-danger' : 'badge-warning'
                    }`}>{inv.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">{t('common.noData')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
