import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { authenticate } from '../auth-guard.js';

export async function registerPharmacyModule(app: FastifyInstance) {
  // Inventory
  app.get('/api/v1/pharmacy/inventory', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { search, status } = request.query as any;
    let q = db('pharmacy_inventory').where({ tenant_id: tenantId });
    if (status) q = q.andWhere('status', status);
    if (search) q = q.andWhere(function() { this.where('drug_name', 'ilike', '%'+search+'%').orWhere('generic_name', 'ilike', '%'+search+'%'); });
    const items = await q.orderBy('drug_name');
    return sendSuccess(reply, items.map(mapDrug));
  });

  app.post('/api/v1/pharmacy/inventory', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const body = request.body as any;
    const [item] = await db('pharmacy_inventory').insert({
      tenant_id: tenantId, drug_name: body.drugName, generic_name: body.genericName,
      brand_name: body.brandName, dosage_form: body.dosageForm, strength: body.strength,
      stock_quantity: body.stockQuantity || 0, reorder_level: body.reorderLevel || 10,
      unit_price: body.unitPrice || 0, batch_number: body.batchNumber,
      expiry_date: body.expiryDate, manufacturer: body.manufacturer,
      requires_prescription: body.requiresPrescription !== false,
    }).returning('*');
    return sendSuccess(reply, mapDrug(item), 'Drug added', 201);
  });

  app.put('/api/v1/pharmacy/inventory/:id/stock', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any; const { quantity } = request.body as any;
    await db('pharmacy_inventory').where({ id }).increment('stock_quantity', quantity).update({ updated_at: new Date() });
    return sendSuccess(reply, null, 'Stock updated');
  });

  // Prescriptions
  app.get('/api/v1/pharmacy/prescriptions', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { status, patientId } = request.query as any;
    let q = db('pharmacy_prescriptions').where('pharmacy_prescriptions.tenant_id', tenantId).whereNull('pharmacy_prescriptions.deleted_at');
    if (status) q = q.andWhere('pharmacy_prescriptions.status', status);
    if (patientId) q = q.andWhere('pharmacy_prescriptions.patient_id', patientId);
    const rows = await q.join('patients', 'pharmacy_prescriptions.patient_id', 'patients.id')
      .select('pharmacy_prescriptions.*', 'patients.first_name as p_first', 'patients.last_name as p_last')
      .orderBy('created_at', 'desc').limit(50);
    return sendSuccess(reply, await Promise.all(rows.map(async (r: any) => {
      const items = await db('pharmacy_prescription_items').where({ prescription_id: r.id });
      return { id: r.id, prescriptionNumber: r.prescription_number, patientId: r.patient_id,
        patientName: r.p_first + ' ' + r.p_last, status: r.status, notes: r.notes,
        items: items.map((i: any) => ({ id: i.id, drugName: i.drug_name, dosage: i.dosage,
          route: i.route, frequency: i.frequency, duration: i.duration, quantity: i.quantity,
          quantityDispensed: i.quantity_dispensed, refills: i.refills, instructions: i.instructions,
          status: i.status })), createdAt: r.created_at };
    })));
  });

  app.post('/api/v1/pharmacy/prescriptions', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request); const body = request.body as any;
    const prescNum = "RX-" + Date.now().toString(36).toUpperCase();
    const [presc] = await db('pharmacy_prescriptions').insert({
      tenant_id: tenantId, patient_id: body.patientId, doctor_id: ctx.userId,
      emr_record_id: body.emrRecordId || null, prescription_number: prescNum,
      notes: body.notes, created_by: ctx.userId,
    }).returning('*');
    if (body.items?.length) {
      await db('pharmacy_prescription_items').insert(body.items.map((i: any) => ({
        prescription_id: presc.id, drug_name: i.drugName, dosage: i.dosage,
        route: i.route, frequency: i.frequency, duration: i.duration,
        quantity: i.quantity, refills: i.refills || 0, instructions: i.instructions,
      })));
    }
    return sendSuccess(reply, { id: presc.id, prescriptionNumber: presc.prescription_number }, 'Prescription created', 201);
  });

  app.post('/api/v1/pharmacy/prescriptions/:id/dispense', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any; const { items } = request.body as any;
    if (items?.length) {
      for (const it of items) {
        await db('pharmacy_prescription_items').where({ id: it.id }).update({ quantity_dispensed: it.quantityDispensed, status: it.status || 'dispensed' });
        if (it.drugName) {
          await db('pharmacy_inventory').where({ drug_name: it.drugName, tenant_id: getTenantId(request) }).decrement('stock_quantity', it.quantityDispensed || 0);
        }
      }
    }
    await db('pharmacy_prescriptions').where({ id }).update({ status: 'dispensed', updated_at: new Date() });
    return sendSuccess(reply, null, 'Prescription dispensed');
  });
}

function mapDrug(d: any) { return {
  id: d.id, drugName: d.drug_name, genericName: d.generic_name, brandName: d.brand_name,
  dosageForm: d.dosage_form, strength: d.strength, stockQuantity: d.stock_quantity,
  reorderLevel: d.reorder_level, unitPrice: Number(d.unit_price), batchNumber: d.batch_number,
  expiryDate: d.expiry_date, manufacturer: d.manufacturer, requiresPrescription: d.requires_prescription,
  status: d.status,
};}
