import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';

export async function registerBarcodesModule(app: FastifyInstance) {
  // ── Barcode Templates CRUD ──
  app.get('/api/v1/barcodes/templates', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { category, isActive } = request.query as any;
    let q = db('barcode_templates').where({ tenant_id: tenantId });
    if (category) q = q.andWhere('category', category);
    if (isActive !== undefined) q = q.andWhere('is_active', isActive === 'true');
    const templates = await q.orderBy('name');
    return sendSuccess(reply, templates.map((t: any) => ({
      id: t.id, name: t.name, code: t.code, category: t.category,
      symbology: t.symbology, fields: t.fields,
      labelTemplate: t.label_template, labelConfig: t.label_config,
      format: t.format, includeHumanReadable: t.include_human_readable,
      isActive: t.is_active, isDefault: t.is_default,
      createdAt: t.created_at, updatedAt: t.updated_at
    })));
  });

  app.get('/api/v1/barcodes/templates/:code', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { code } = request.params as any;
    const t = await db('barcode_templates').where({ tenant_id: tenantId, code }).first();
    if (!t) return reply.status(404).send({ success: false, error: 'Template not found' });
    return sendSuccess(reply, {
      id: t.id, name: t.name, code: t.code, category: t.category,
      symbology: t.symbology, fields: t.fields,
      labelTemplate: t.label_template, labelConfig: t.label_config,
      format: t.format, includeHumanReadable: t.include_human_readable,
      isActive: t.is_active, isDefault: t.is_default
    });
  });

  app.post('/api/v1/barcodes/templates', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    const body = request.body as any;
    const code = body.code || body.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const [template] = await db('barcode_templates').insert({
      tenant_id: tenantId, name: body.name, code,
      category: body.category || 'patient',
      symbology: body.symbology || 'code128',
      fields: JSON.stringify(body.fields || []),
      label_template: body.labelTemplate || null,
      label_config: JSON.stringify(body.labelConfig || { width: 50, height: 25, unit: 'mm' }),
      format: body.format || 'png',
      include_human_readable: body.includeHumanReadable !== false,
      is_active: body.isActive !== false,
      is_default: body.isDefault || false,
      created_by: ctx.userId
    }).returning('*');
    return sendSuccess(reply, { id: template.id, code: template.code }, 'Template created', 201);
  });

  app.put('/api/v1/barcodes/templates/:id', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    const update: any = { updated_at: new Date() };
    if (body.name) update.name = body.name;
    if (body.category) update.category = body.category;
    if (body.symbology) update.symbology = body.symbology;
    if (body.fields) update.fields = JSON.stringify(body.fields);
    if (body.labelTemplate !== undefined) update.label_template = body.labelTemplate;
    if (body.labelConfig) update.label_config = JSON.stringify(body.labelConfig);
    if (body.format) update.format = body.format;
    if (body.includeHumanReadable !== undefined) update.include_human_readable = body.includeHumanReadable;
    if (body.isActive !== undefined) update.is_active = body.isActive;
    if (body.isDefault !== undefined) update.is_default = body.isDefault;
    await db('barcode_templates').where({ id }).update(update);
    return sendSuccess(reply, null, 'Template updated');
  });

  app.delete('/api/v1/barcodes/templates/:id', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    await db('barcode_templates').where({ id }).del();
    return sendSuccess(reply, null, 'Template deleted');
  });

  // ── Generate Barcode ──
  app.post('/api/v1/barcodes/generate', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    const body = request.body as any;

    const template = await db('barcode_templates').where({ tenant_id: tenantId, code: body.templateCode }).first();
    if (!template) return reply.status(404).send({ success: false, error: 'Template not found' });

    // Generate barcode data based on template fields
    let barcodeData = body.customData || '';
    if (!barcodeData && body.referenceType && body.referenceId) {
      barcodeData = `${body.referenceType}:${body.referenceId}:${Date.now()}`;
    }
    if (!barcodeData) {
      barcodeData = crypto.randomBytes(16).toString('hex').toUpperCase();
    }

    const [label] = await db('barcode_labels').insert({
      tenant_id: tenantId, template_id: template.id,
      reference_type: body.referenceType || null,
      reference_id: body.referenceId || null,
      barcode_data: barcodeData,
      format: template.format,
      status: 'active',
      expires_at: body.expiresAt || null,
      created_by: ctx.userId
    }).returning('*');

    return sendSuccess(reply, {
      id: label.id, barcodeData: label.barcode_data,
      format: label.format, templateCode: template.code,
      symbology: template.symbology,
      createdAt: label.created_at
    }, 'Barcode generated', 201);
  });

  // ── List generated barcodes ──
  app.get('/api/v1/barcodes/labels', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { referenceType, referenceId, status, limit } = request.query as any;
    let q = db('barcode_labels').where('barcode_labels.tenant_id', tenantId);
    if (referenceType) q = q.andWhere('barcode_labels.reference_type', referenceType);
    if (referenceId) q = q.andWhere('barcode_labels.reference_id', referenceId);
    if (status) q = q.andWhere('barcode_labels.status', status);
    const labels = await q.leftJoin('barcode_templates', 'barcode_labels.template_id', 'barcode_templates.id')
      .select('barcode_labels.*', 'barcode_templates.name as template_name', 'barcode_templates.symbology')
      .orderBy('created_at', 'desc')
      .limit(Number(limit) || 100);
    return sendSuccess(reply, labels.map((l: any) => ({
      id: l.id, templateId: l.template_id, templateName: l.template_name,
      symbology: l.symbology, referenceType: l.reference_type,
      referenceId: l.reference_id, barcodeData: l.barcode_data,
      format: l.format, status: l.status,
      printCount: l.print_count, printedAt: l.printed_at,
      expiresAt: l.expires_at, createdAt: l.created_at
    })));
  });

  // ── Log a scan ──
  app.post('/api/v1/barcodes/scan', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    const body = request.body as any;

    let labelId = null;
    if (body.barcodeData) {
      const label = await db('barcode_labels').where({ tenant_id: tenantId, barcode_data: body.barcodeData }).first();
      if (label) labelId = label.id;
    }

    const [log] = await db('barcode_scan_logs').insert({
      tenant_id: tenantId, label_id: labelId,
      barcode_data: body.barcodeData || 'unknown',
      scanner_id: body.scannerId || null,
      location: body.location || null,
      action: body.action || 'scan',
      metadata: JSON.stringify(body.metadata || {}),
      status: body.status || 'success',
      notes: body.notes || null,
      scanned_by: ctx.userId
    }).returning('*');

    return sendSuccess(reply, {
      id: log.id, barcodeData: log.barcode_data,
      action: log.action, status: log.status,
      scannedAt: log.scanned_at
    }, 'Scan logged', 201);
  });

  // ── Scan logs ──
  app.get('/api/v1/barcodes/scan-logs', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { action, status, limit } = request.query as any;
    let q = db('barcode_scan_logs').where('barcode_scan_logs.tenant_id', tenantId);
    if (action) q = q.andWhere('barcode_scan_logs.action', action);
    if (status) q = q.andWhere('barcode_scan_logs.status', status);
    const logs = await q.leftJoin('barcode_labels', 'barcode_scan_logs.label_id', 'barcode_labels.id')
      .select('barcode_scan_logs.*', 'barcode_labels.reference_type', 'barcode_labels.reference_id')
      .orderBy('scanned_at', 'desc')
      .limit(Number(limit) || 100);
    return sendSuccess(reply, logs.map((l: any) => ({
      id: l.id, labelId: l.label_id,
      barcodeData: l.barcode_data, scannerId: l.scanner_id,
      location: l.location, action: l.action,
      metadata: l.metadata, status: l.status,
      notes: l.notes, referenceType: l.reference_type,
      referenceId: l.reference_id,
      scannedBy: l.scanned_by, scannedAt: l.scanned_at
    })));
  });

  // ── Print count increment ──
  app.post('/api/v1/barcodes/labels/:id/print', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    await db('barcode_labels').where({ id }).increment('print_count', 1).update({ printed_at: new Date(), status: 'printed' });
    return sendSuccess(reply, null, 'Print registered');
  });
}
