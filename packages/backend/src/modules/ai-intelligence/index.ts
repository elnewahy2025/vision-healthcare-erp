import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../core/database.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { sendSuccess, sendPaginated, sendError } from '../../utils/response.js';
import { logAudit } from '../../services/audit.js';
import { authenticate } from '../auth-guard.js';

// ==================== AI CLINICAL NOTES ====================

export async function registerAiIntelligenceModule(app: FastifyInstance) {

  // Generate AI clinical note from raw notes
  app.post('/api/v1/ai/clinical-notes/generate', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId, userId } = getCtx(request);
    const body = z.object({
      patientId: z.string().uuid(), appointmentId: z.string().uuid().optional(),
      rawNotes: z.string().min(5), noteType: z.string().optional().default('consultation'),
      language: z.string().optional().default('en'),
    }).parse(request.body);

    // Fetch patient context for better generation
    const patient = await db('patients').where({ id: body.patientId }).first();
    const allergies = await db('patient_allergies').where({ patient_id: body.patientId }).select('allergen', 'severity');
    const medications = await db('patient_medications').where({ patient_id: body.patientId }).where({ is_active: true }).select('medication_name', 'dosage', 'frequency').limit(10);

    // AI note generation (simulated — in production, call OpenAI/Claude API)
    const generatedNote = generateClinicalNoteFromRaw(body.rawNotes, body.noteType, patient, allergies, medications, body.language);
    const structuredData = extractStructuredData(body.rawNotes);
    const summary = generateBriefSummary(generatedNote, body.noteType);

    const [note] = await db('ai_clinical_notes').insert({
      tenant_id: tenantId, patient_id: body.patientId,
      appointment_id: body.appointmentId || null, doctor_id: userId,
      note_type: body.noteType, raw_notes: body.rawNotes,
      generated_note: generatedNote, summary,
      structured_data: JSON.stringify(structuredData),
      status: 'draft', ai_model_used: 'vision-clinical-v1',
    }).returning('*');

    await logAudit({ tenantId, userId, action: 'ai.clinical_note.generate', entityType: 'ai_clinical_notes', entityId: note.id });
    return sendSuccess(reply, note, 'Clinical note generated', 201);
  });

  // List clinical notes for a patient
  app.get('/api/v1/ai/clinical-notes/patient/:patientId', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const { patientId } = z.object({ patientId: z.string().uuid() }).parse(request.params);
    const query = z.object({ page: z.coerce.number().optional().default(1), limit: z.coerce.number().optional().default(20) }).parse(request.query);

    const total = await db('ai_clinical_notes').where({ tenant_id: tenantId, patient_id: patientId }).count('id as count').first();
    const data = await db('ai_clinical_notes').where({ tenant_id: tenantId, patient_id: patientId })
      .orderBy('created_at', 'desc').limit(query.limit).offset((query.page - 1) * query.limit);
    return sendPaginated(reply, data, Number(total?.count || 0), query.page, query.limit);
  });

  // Update/finalize a clinical note
  app.put('/api/v1/ai/clinical-notes/:id', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({
      status: z.string().optional(), doctorCorrections: z.string().optional(),
      generatedNote: z.string().optional(),
    }).parse(request.body);

    const existing = await db('ai_clinical_notes').where({ id, tenant_id: tenantId }).first();
    if (!existing) return sendError(reply, 'Note not found', 404);

    const updates: any = {};
    if (body.status) updates.status = body.status;
    if (body.doctorCorrections !== undefined) updates.doctor_corrections = body.doctorCorrections;
    if (body.generatedNote) updates.generated_note = body.generatedNote;
    updates.updated_at = db.fn.now();

    await db('ai_clinical_notes').where({ id }).update(updates);
    return sendSuccess(reply, { id }, 'Note updated');
  });

  // ==================== AI DIAGNOSIS ASSISTANT ====================

  app.post('/api/v1/ai/diagnosis/suggest', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId, userId } = getCtx(request);
    const body = z.object({
      patientId: z.string().uuid(), appointmentId: z.string().uuid().optional(),
      symptoms: z.string().min(3), age: z.number().optional(),
      gender: z.string().optional(), medicalHistory: z.string().optional(),
    }).parse(request.body);

    const patient = await db('patients').where({ id: body.patientId }).first();
    const allergies = await db('patient_allergies').where({ patient_id: body.patientId }).select('allergen');
    const encounters = await db('ai_clinical_notes').where({ patient_id: body.patientId }).orderBy('created_at', 'desc').limit(5).select('generated_note', 'note_type');

    // Rule-based diagnosis suggestions (simulated AI — in production call LLM)
    const suggestions = generateDiagnosisSuggestions(
      body.symptoms, body.age || patient?.age, body.gender || patient?.gender,
      body.medicalHistory, allergies, encounters
    );

    const [record] = await db('ai_diagnosis_suggestions').insert({
      tenant_id: tenantId, patient_id: body.patientId,
      appointment_id: body.appointmentId || null, doctor_id: userId,
      symptoms: body.symptoms, suggestions: JSON.stringify(suggestions),
      ai_model_used: 'vision-diagnosis-v1',
    }).returning('*');

    return sendSuccess(reply, { ...record, suggestions });
  });

  app.post('/api/v1/ai/diagnosis/:id/feedback', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ selectedCode: z.string(), wasAccepted: z.boolean(), feedback: z.string().optional() }).parse(request.body);

    await db('ai_diagnosis_suggestions').where({ id, tenant_id: tenantId }).update({
      selected_code: body.selectedCode, was_accepted: body.wasAccepted,
      doctor_feedback: body.feedback || null,
    });
    return sendSuccess(reply, null, 'Feedback recorded');
  });

  // ==================== PREDICTIVE ANALYTICS ====================

  // Predict appointment no-shows
  app.post('/api/v1/ai/predictions/no-show', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const body = z.object({ date: z.string() }).parse(request.body);

    const appointments = await db('appointments')
      .join('patients', 'appointments.patient_id', 'patients.id')
      .where('appointments.tenant_id', tenantId)
      .whereRaw("DATE(appointments.scheduled_date) = ?", [body.date])
      .where('appointments.status', 'scheduled')
      .select('appointments.*', 'patients.first_name', 'patients.last_name');

    const predictions = appointments.map((apt: any) => {
      const risk = predictNoShow(apt);
      return { appointmentId: apt.id, patient: `${apt.first_name} ${apt.last_name}`, time: apt.scheduled_date, riskScore: risk.score, riskLevel: risk.level, factors: risk.factors };
    });

    // Store predictions
    for (const p of predictions) {
      await db('ai_predictions').insert({
        tenant_id: tenantId, prediction_type: 'no_show',
        related_id: p.appointmentId, related_type: 'appointment',
        result: JSON.stringify(p), confidence: p.riskScore,
        prediction_date: db.fn.now(), target_date: body.date,
      }).catch(() => {});
    }

    return sendSuccess(reply, predictions);
  });

  // Revenue forecast
  app.get('/api/v1/ai/predictions/revenue', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const query = z.object({ months: z.coerce.number().optional().default(3) }).parse(request.query);

    // Get historical monthly revenue
    const historical = await db('invoices')
      .where({ tenant_id: tenantId }).where('status', '!=', 'cancelled')
      .select(db.raw("to_char(created_at, 'YYYY-MM') as month, sum(total) as revenue, count(*) as invoice_count"))
      .groupByRaw("to_char(created_at, 'YYYY-MM')")
      .orderBy('month', 'desc').limit(12);

    const revenueHistory = historical.map((h: any) => ({ month: h.month, revenue: Number(h.revenue), count: Number(h.invoice_count) }));

    // Simple moving average forecast
    const forecast = generateRevenueForecast(revenueHistory, query.months);

    return sendSuccess(reply, { historical: revenueHistory, forecast });
  });

  // Patient risk assessment
  app.get('/api/v1/ai/predictions/patient-risk/:patientId', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const { patientId } = z.object({ patientId: z.string().uuid() }).parse(request.params);

    const patient = await db('patients').where({ id: patientId }).first();
    if (!patient) return sendError(reply, 'Patient not found', 404);

    const visits = await db('appointments').where({ patient_id: patientId, status: 'completed' }).count('id as count').first();
    const allergies = await db('patient_allergies').where({ patient_id: patientId }).count('id as count').first();
    const medications = await db('patient_medications').where({ patient_id: patientId, is_active: true }).count('id as count').first();
    const lastVisit = await db('appointments').where({ patient_id: patientId, status: 'completed' }).orderBy('scheduled_date', 'desc').first();

    const risks = assessPatientRisks(patient, Number(visits?.count || 0), Number(allergies?.count || 0), Number(medications?.count || 0), lastVisit);

    // Store
    for (const risk of risks) {
      await db('patient_risk_scores').insert({
        tenant_id: tenantId, patient_id: patientId,
        risk_type: risk.type, risk_score: risk.score,
        risk_level: risk.level, factors: JSON.stringify(risk.factors),
        recommendation: risk.recommendation, calculated_date: new Date().toISOString().split('T')[0],
      }).catch(() => {});
    }

    return sendSuccess(reply, risks);
  });

  // ==================== SMART SCHEDULING ====================

  app.post('/api/v1/ai/schedule/optimize', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const body = z.object({ date: z.string(), branchId: z.string().uuid().optional() }).parse(request.body);

    // Get available doctors and their schedules
    const doctors = await db('users').where({ tenant_id: tenantId, role: 'doctor', is_active: true }).select('id', 'first_name', 'last_name');
    const existingAppointments = await db('appointments')
      .where('tenant_id', tenantId)
      .whereRaw("DATE(scheduled_date) = ?", [body.date])
      .where('status', '!=', 'cancelled')
      .select('doctor_id', 'scheduled_date', 'end_time', 'type', 'status');

    const slots = optimizeSchedule(doctors, existingAppointments, body.date);
    const utilization = calculateUtilization(slots);
    const expectedRevenue = estimateDayRevenue(slots);

    const [schedule] = await db('ai_smart_schedules').insert({
      tenant_id: tenantId, schedule_date: body.date,
      optimized_slots: JSON.stringify(slots),
      expected_utilization: utilization, expected_revenue: expectedRevenue,
    }).returning('*');

    return sendSuccess(reply, { schedule, slots, utilization, expectedRevenue });
  });

  app.get('/api/v1/ai/schedule/:date', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const { date } = z.object({ date: z.string() }).parse(request.params);
    const schedule = await db('ai_smart_schedules').where({ tenant_id: tenantId, schedule_date: date }).first();
    return sendSuccess(reply, schedule || null);
  });

  app.post('/api/v1/ai/schedule/:id/apply', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await db('ai_smart_schedules').where({ id, tenant_id: tenantId }).update({ is_applied: true, applied_at: db.fn.now() });
    return sendSuccess(reply, null, 'Schedule applied');
  });

  // ==================== AI DASHBOARD STATS ====================

  app.get('/api/v1/ai/intelligence/stats', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const totalNotes = await db('ai_clinical_notes').where({ tenant_id: tenantId }).count('id as count').first();
    const totalDiagnoses = await db('ai_diagnosis_suggestions').where({ tenant_id: tenantId }).count('id as count').first();
    const acceptanceRate = await db('ai_diagnosis_suggestions').where({ tenant_id: tenantId }).where('was_accepted', true).count('id as count').first();
    const totalDiagAll = await db('ai_diagnosis_suggestions').where({ tenant_id: tenantId }).count('id as count').first();
    const totalPredictions = await db('ai_predictions').where({ tenant_id: tenantId }).count('id as count').first();
    const totalSchedules = await db('ai_smart_schedules').where({ tenant_id: tenantId }).count('id as count').first();

    const diagCount = Number(totalDiagAll?.count || 0);
    const acceptCount = Number(acceptanceRate?.count || 0);

    return sendSuccess(reply, {
      totalNotes: Number(totalNotes?.count || 0),
      totalDiagnoses: diagCount,
      acceptanceRate: diagCount > 0 ? ((acceptCount / diagCount) * 100).toFixed(1) : '0',
      totalPredictions: Number(totalPredictions?.count || 0),
      totalSchedules: Number(totalSchedules?.count || 0),
    });
  });

  console.log('✓ AI Intelligence module loaded (Clinical Notes, Diagnosis, Predictions, Smart Scheduling)');
}

// ==================== HELPER FUNCTIONS ====================

function generateClinicalNoteFromRaw(raw: string, noteType: string, patient: any, allergies: any[], medications: any[], lang: string): string {
  const lines: string[] = [];
  const now = new Date();

  lines.push(`CLINICAL NOTE — ${noteType.toUpperCase()}`);
  lines.push(`Date: ${now.toISOString().split('T')[0]}`);
  if (patient) lines.push(`Patient: ${patient.first_name} ${patient.last_name}, Age: ${patient.age || 'Unknown'}, Gender: ${patient.gender || 'Unknown'}`);
  if (allergies.length) lines.push(`Allergies: ${allergies.map((a: any) => a.allergen).join(', ')}`);
  if (medications.length) lines.push(`Current Medications: ${medications.map((m: Record<string, unknown>) => `${m.medication_name} ${m.dosage} ${m.frequency}`).join('; ')}`);
  lines.push('');
  lines.push('--- SUBMITTED NOTES ---');
  lines.push(raw);
  lines.push('');
  lines.push('--- AI-GENERATED CLINICAL NOTE ---');
  lines.push(`CHIEF COMPLAINT: Patient presents with symptoms as described in the notes above.`);
  lines.push(`HISTORY OF PRESENT ILLNESS: ${raw.substring(0, 200)}...`);
  lines.push(`ASSESSMENT: Based on the clinical presentation, the patient's symptoms warrant further evaluation.`);
  lines.push(`PLAN: Continue monitoring and follow-up as appropriate.`);
  if (allergies.length) lines.push(`⚠ ALLERGY ALERT: Patient has documented allergies: ${allergies.map((a: any) => `${a.allergen} (${a.severity})`).join(', ')}`);
  return lines.join('\n');
}

function extractStructuredData(raw: string): any {
  return {
    keywords: raw.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 10),
    wordCount: raw.split(/\s+/).length,
    hasVitalSigns: /blood pressure|temperature|heart rate|pulse|bmi/i.test(raw),
    hasPainScale: /pain|pain level|pain scale|\d\/10/i.test(raw),
  };
}

function generateBriefSummary(note: string, noteType: string): string {
  return `[${noteType.toUpperCase()}] Clinical note generated from raw input. ${note.split('\n').length} lines, auto-generated assessment included.`;
}

function generateDiagnosisSuggestions(symptoms: string, age: number | undefined, gender: string | undefined, history: string | undefined, allergies: any[], encounters: any[]): any[] {
  const suggestions: any[] = [];
  const symLower = symptoms.toLowerCase();

  const diagnosisMap: Array<{ keywords: string[]; label: string; icd10: string; description: string }> = [
    { keywords: ['headache', 'head pain', 'head ache'], label: 'Headache (R51.9)', icd10: 'R51.9', description: 'Primary headache disorder' },
    { keywords: ['fever', 'temperature', 'feverish'], label: 'Fever (R50.9)', icd10: 'R50.9', description: 'Pyrexia of unspecified origin' },
    { keywords: ['cough', 'coughing'], label: 'Cough (R05.9)', icd10: 'R05.9', description: 'Cough, unspecified' },
    { keywords: ['chest pain', 'chest'], label: 'Chest Pain (R07.9)', icd10: 'R07.9', description: 'Chest pain, unspecified' },
    { keywords: ['abdominal', 'stomach', 'belly', 'abdominal pain'], label: 'Abdominal Pain (R10.9)', icd10: 'R10.9', description: 'Abdominal pain, unspecified' },
    { keywords: ['shortness of breath', 'dyspnea', 'breathing difficulty', 'breathlessness'], label: 'Dyspnea (R06.02)', icd10: 'R06.02', description: 'Shortness of breath' },
    { keywords: ['nausea', 'vomiting', 'throwing up'], label: 'Nausea and Vomiting (R11.2)', icd10: 'R11.2', description: 'Nausea with vomiting' },
    { keywords: ['dizziness', 'dizzy', 'vertigo', 'lightheaded'], label: 'Dizziness (R42)', icd10: 'R42', description: 'Dizziness and giddiness' },
    { keywords: ['fatigue', 'tired', 'exhaustion', 'weakness'], label: 'Fatigue (R53.1)', icd10: 'R53.1', description: 'Weakness' },
    { keywords: ['back pain', 'backache'], label: 'Low Back Pain (M54.5)', icd10: 'M54.5', description: 'Low back pain' },
    { keywords: ['sore throat', 'throat pain'], label: 'Pharyngitis (J02.9)', icd10: 'J02.9', description: 'Acute pharyngitis, unspecified' },
    { keywords: ['joint pain', 'arthritis', 'joint swelling'], label: 'Joint Pain (M25.5)', icd10: 'M25.5', description: 'Pain in joint' },
    { keywords: ['skin rash', 'rash', 'skin'], label: 'Skin Rash (R21)', icd10: 'R21', description: 'Rash and other nonspecific skin eruption' },
    { keywords: ['diarrhea', 'loose stool'], label: 'Diarrhea (K59.1)', icd10: 'K59.1', description: 'Functional diarrhea' },
    { keywords: ['insomnia', 'sleeplessness', 'can\'t sleep'], label: 'Insomnia (G47.00)', icd10: 'G47.00', description: 'Insomnia, unspecified' },
    { keywords: ['anxiety', 'anxious', 'worry', 'nervous'], label: 'Anxiety (F41.9)', icd10: 'F41.9', description: 'Anxiety disorder, unspecified' },
    { keywords: ['hypertension', 'high blood pressure', 'bp'], label: 'Hypertension (I10)', icd10: 'I10', description: 'Essential (primary) hypertension' },
    { keywords: ['diabetes', 'blood sugar', 'glucose'], label: 'Diabetes Mellitus (E11.9)', icd10: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  ];

  let matchCount = 0;
  for (const diag of diagnosisMap) {
    const matched = diag.keywords.some(k => symLower.includes(k));
    if (matched && matchCount < 5) {
      const confidence = 0.6 + Math.random() * 0.35;
      suggestions.push({
        code: diag.icd10, label: diag.label, icd10_code: diag.icd10,
        confidence: Number(confidence.toFixed(2)), description: diag.description,
        reasoning: `Based on symptoms: ${symptoms.substring(0, 100)}`,
      });
      matchCount++;
    }
  }

  // Fallback
  if (suggestions.length === 0) {
    suggestions.push({
      code: 'R69', label: 'General symptoms (R69)', icd10_code: 'R69',
      confidence: 0.3, description: 'Ill-defined symptoms',
      reasoning: 'Symptoms require further clinical evaluation',
    });
  }

  return suggestions.sort((a: any, b: any) => b.confidence - a.confidence);
}

function predictNoShow(apt: any): { score: number; level: string; factors: string[] } {
  const factors: string[] = [];
  let score = 0.2; // base risk

  // Previous no-shows (simulated from metadata)
  score += 0.15;
  factors.push('Patient history factor');

  // Time of day
  const hour = new Date(apt.scheduled_date).getHours();
  if (hour < 8 || hour > 17) { score += 0.1; factors.push('Off-hours appointment'); }

  // Weekend
  const dow = new Date(apt.scheduled_date).getDay();
  if (dow === 0 || dow === 6) { score += 0.1; factors.push('Weekend appointment'); }

  // Appointment type
  if (apt.type === 'follow_up') { score += 0.05; factors.push('Follow-up appointment'); }

  score = Math.min(score, 0.99);
  const level = score > 0.7 ? 'high' : score > 0.4 ? 'moderate' : 'low';
  return { score: Number(score.toFixed(2)), level, factors };
}

function generateRevenueForecast(history: any[], months: number): any[] {
  if (history.length === 0) return [];
  const avgRevenue = history.reduce((a: number, h: any) => a + h.revenue, 0) / history.length;
  const trend = history.length > 1 ? (history[0].revenue - history[history.length - 1].revenue) / history.length : 0;

  const forecast = [];
  for (let i = 1; i <= months; i++) {
    const predicted = avgRevenue + (trend * i);
    forecast.push({
      month: `Month +${i}`, predicted: Math.round(predicted),
      low: Math.round(predicted * 0.8), high: Math.round(predicted * 1.2),
      confidence: 0.75 - (i * 0.05),
    });
  }
  return forecast;
}

function assessPatientRisks(patient: any, visits: number, allergies: number, medications: number, lastVisit: any): any[] {
  const risks: any[] = [];
  const daysSinceLastVisit = lastVisit ? Math.floor((Date.now() - new Date(lastVisit.scheduled_date).getTime()) / 86400000) : 365;

  // Readmission risk
  if (visits > 3) {
    const score = Math.min(0.9, 0.3 + (visits / 20));
    risks.push({ type: 'readmission', score: Number(score.toFixed(2)), level: score > 0.7 ? 'high' : score > 0.4 ? 'moderate' : 'low',
      factors: [`${visits} previous visits`, `${allergies} known allergies`],
      recommendation: 'Schedule regular follow-up appointments' });
  }

  // Chronic decompensation risk
  if (medications > 3) {
    const score = Math.min(0.85, 0.25 + (medications / 15));
    risks.push({ type: 'chronic_decompensation', score: Number(score.toFixed(2)), level: score > 0.6 ? 'high' : 'moderate',
      factors: [`${medications} active medications`, 'Polypharmacy risk'],
      recommendation: 'Review medication regimen for interactions' });
  }

  // No-show risk
  if (daysSinceLastVisit > 180) {
    const score = Math.min(0.8, 0.3 + (daysSinceLastVisit / 700));
    risks.push({ type: 'no_show', score: Number(score.toFixed(2)), level: score > 0.5 ? 'moderate' : 'low',
      factors: [`${daysSinceLastVisit} days since last visit`, 'Lapsed patient'],
      recommendation: 'Send reminder and outreach' });
  }

  return risks;
}

function optimizeSchedule(doctors: any[], existingAppointments: any[], date: string): any[] {
  const slots: any[] = [];
  const workStart = 9; // 9 AM
  const workEnd = 17; // 5 PM

  for (const doctor of doctors) {
    const doctorAppts = existingAppointments.filter((a: any) => a.doctor_id === doctor.id);
    const bookedHours = doctorAppts.length * 0.5; // 30min per appointment

    for (let hour = workStart; hour < workEnd; hour++) {
      const isBooked = doctorAppts.some((a: any) => {
        const aptHour = new Date(a.scheduled_date).getHours();
        return aptHour === hour;
      });

      slots.push({
        start: `${date}T${String(hour).padStart(2, '0')}:00:00`,
        end: `${date}T${String(hour).padStart(2, '0')}:30:00`,
        doctor_id: doctor.id, doctor_name: `${doctor.first_name} ${doctor.last_name}`,
        priority: isBooked ? 'booked' : 'available',
        estimated_duration: 30,
      });
    }
  }
  return slots;
}

function calculateUtilization(slots: any[]): number {
  const booked = slots.filter((s: any) => s.priority === 'booked').length;
  return slots.length > 0 ? Number(((booked / slots.length) * 100).toFixed(1)) : 0;
}

function estimateDayRevenue(slots: any[]): number {
  const booked = slots.filter((s: any) => s.priority === 'booked').length;
  return booked * 500; // Estimated 500 EGP per consultation
}
