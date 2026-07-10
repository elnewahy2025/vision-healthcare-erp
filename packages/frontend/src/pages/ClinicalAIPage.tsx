import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Select, Modal, Spinner, EmptyState, Badge } from '../components/ui';
import { Bot, Sparkles, FileText, Stethoscope, Check, AlertTriangle, Info } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface ClinicalNote {
  id: string; patient_id: string; note_type: string; raw_notes: string;
  generated_note: string; summary: string; status: string; created_at: string;
}

interface DiagnosisSuggestion {
  code: string; label: string; icd10_code: string;
  confidence: number; description: string; reasoning: string;
}

export default function ClinicalAIPage() {
  const [tab, setTab] = useState<'notes' | 'diagnosis'>('notes');

  // Clinical Notes state
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ClinicalNote | null>(null);
  const [noteForm, setNoteForm] = useState({ patientId: '', rawNotes: '', noteType: 'consultation' });

  // Diagnosis state
  const [diagForm, setDiagForm] = useState({ patientId: '', symptoms: '' });
  const [diagResults, setDiagResults] = useState<DiagnosisSuggestion[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [lastDiagId, setLastDiagId] = useState('');

  const loadNotes = async () => {
    setNotesLoading(true);
    try {
      const res = await api.get('/ai/clinical-notes/patient/' + (noteForm.patientId || '00000000-0000-0000-0000-000000000000'), { params: { limit: 50 } });
      setNotes(res.data.data || []);
    } catch { setNotes([]); }
    finally { setNotesLoading(false); }
  };

  useEffect(() => { if (tab === 'notes') loadNotes(); }, [tab, noteForm.patientId]);

  const handleGenerate = async () => {
    if (!noteForm.patientId || !noteForm.rawNotes) return toast.error('Patient ID and notes required');
    setGenerating(true);
    try {
      const res = await api.post('/ai/clinical-notes/generate', {
        patientId: noteForm.patientId, rawNotes: noteForm.rawNotes, noteType: noteForm.noteType,
      });
      toast.success('Clinical note generated');
      setNoteForm(f => ({ ...f, rawNotes: '' }));
      setSelectedNote(res.data.data);
      loadNotes();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handleDiagnose = async () => {
    if (!diagForm.patientId || !diagForm.symptoms) return toast.error('Patient ID and symptoms required');
    setDiagLoading(true);
    try {
      const res = await api.post('/ai/diagnosis/suggest', {
        patientId: diagForm.patientId, symptoms: diagForm.symptoms,
      });
      setDiagResults(res.data.data.suggestions || []);
      setLastDiagId(res.data.data.id);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Diagnosis failed'); }
    finally { setDiagLoading(false); }
  };

  const handleFeedback = async (code: string, accepted: boolean) => {
    if (!lastDiagId) return;
    await api.post(`/ai/diagnosis/${lastDiagId}/feedback`, { selectedCode: code, wasAccepted: accepted });
    toast.success(accepted ? 'Diagnosis accepted' : 'Feedback recorded');
  };

  const confBadge = (score: number) => {
    const color = score > 0.7 ? 'bg-green-100 text-green-800' : score > 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{(score * 100).toFixed(0)}%</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg"><Bot className="w-6 h-6 text-indigo-600" /></div>
        <div><h1 className="text-2xl font-bold">AI Clinical Assistant</h1><p className="text-sm text-gray-500">AI-powered clinical notes and diagnosis suggestions</p></div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button onClick={() => setTab('notes')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'notes' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Clinical Notes</button>
        <button onClick={() => setTab('diagnosis')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'diagnosis' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Diagnosis Assistant</button>
      </div>

      {/* CLINICAL NOTES TAB */}
      {tab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generator Form */}
          <Card><CardBody>
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" /> Generate Clinical Note</h3>
            <div className="space-y-3">
              <Input label="Patient ID" placeholder="Paste patient UUID" value={noteForm.patientId} onChange={e => setNoteForm(f => ({ ...f, patientId: e.target.value }))} />
              <Select label="Note Type" value={noteForm.noteType} onChange={e => setNoteForm(f => ({ ...f, noteType: e.target.value }))}
                options={[{ value: 'consultation', label: 'Consultation' }, { value: 'follow_up', label: 'Follow-up' }, { value: 'discharge', label: 'Discharge' }, { value: 'referral', label: 'Referral' }]} />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Doctor's Raw Notes</label>
                <textarea className="w-full border rounded-lg p-3 h-40 text-sm" placeholder="Enter your clinical observations, symptoms, findings..."
                  value={noteForm.rawNotes} onChange={e => setNoteForm(f => ({ ...f, rawNotes: e.target.value }))} /></div>
              <Button onClick={handleGenerate} disabled={generating} icon={<Sparkles className="w-4 h-4" />}>
                {generating ? 'Generating...' : 'Generate AI Note'}
              </Button>
            </div>
          </CardBody></Card>

          {/* Preview / History */}
          <Card><CardBody>
            <h3 className="font-semibold mb-3">Notes History</h3>
            {selectedNote ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge>{selectedNote.note_type}</Badge>
                  <Badge>{selectedNote.status}</Badge>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">{selectedNote.generated_note}</div>
                <Button variant="secondary" size="sm" onClick={() => setSelectedNote(null)}>Close Preview</Button>
              </div>
            ) : notesLoading ? <Spinner /> : notes.length === 0 ? (
              <EmptyState icon={<FileText className="w-10 h-10" />} title="No notes" message="Generate your first AI clinical note" />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notes.map(n => (
                  <button key={n.id} onClick={() => setSelectedNote(n)} className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-indigo-600">{n.note_type}</span>
                      <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{n.summary || n.generated_note?.substring(0, 100)}</p>
                  </button>
                ))}
              </div>
            )}
          </CardBody></Card>
        </div>
      )}

      {/* DIAGNOSIS TAB */}
      {tab === 'diagnosis' && (
        <div className="space-y-6">
          <Card><CardBody>
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-indigo-500" /> AI Diagnosis Assistant</h3>
            <p className="text-sm text-gray-500 mb-4">Enter patient symptoms to receive AI-powered differential diagnosis suggestions with ICD-10 codes.</p>
            <div className="space-y-3">
              <Input label="Patient ID" placeholder="Paste patient UUID" value={diagForm.patientId} onChange={e => setDiagForm(f => ({ ...f, patientId: e.target.value }))} />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
                <textarea className="w-full border rounded-lg p-3 h-28 text-sm" placeholder="Describe patient symptoms, e.g.: severe headache, blurred vision, nausea..."
                  value={diagForm.symptoms} onChange={e => setDiagForm(f => ({ ...f, symptoms: e.target.value }))} /></div>
              <Button onClick={handleDiagnose} disabled={diagLoading} icon={<Stethoscope className="w-4 h-4" />}>
                {diagLoading ? 'Analyzing...' : 'Get Diagnosis Suggestions'}
              </Button>
            </div>
          </CardBody></Card>

          {diagResults.length > 0 && (
            <Card><CardBody>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-4 h-4" /> Suggested Diagnoses</h3>
              <div className="space-y-3">
                {diagResults.map((d, i) => (
                  <div key={i} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-gray-900">{d.label}</span>
                        <span className="ml-2 text-xs text-gray-500 font-mono">{d.icd10_code}</span>
                      </div>
                      {confBadge(d.confidence)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{d.description}</p>
                    <p className="text-xs text-gray-400 mb-2 italic">{d.reasoning}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleFeedback(d.code, true)} icon={<Check className="w-3 h-3" />}>Accept</Button>
                      <Button size="sm" variant="secondary" onClick={() => handleFeedback(d.code, false)}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <p className="text-xs text-yellow-700">AI suggestions are for reference only. Always use professional clinical judgment for final diagnosis.</p>
              </div>
            </CardBody></Card>
          )}
        </div>
      )}
    </div>
  );
}
