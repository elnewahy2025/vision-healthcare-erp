import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { authenticate } from '../auth-guard.js';

export async function registerAutomationModule(app: FastifyInstance) {
  // ── Rules CRUD ──
  app.get('/api/v1/automation/rules', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { category, isActive, triggerType } = request.query as any;
    let q = db('automation_rules').where({ tenant_id: tenantId });
    if (category) q = q.andWhere('category', category);
    if (isActive !== undefined) q = q.andWhere('is_active', isActive === 'true');
    if (triggerType) q = q.andWhere('trigger_type', triggerType);
    const rules = await q.orderBy('priority', 'desc').orderBy('name');
    return sendSuccess(reply, rules.map((r: any) => ({
      id: r.id, name: r.name, slug: r.slug, category: r.category,
      triggerType: r.trigger_type, triggerEvent: r.trigger_event,
      triggerConfig: r.trigger_config, conditions: r.conditions,
      description: r.description, isActive: r.is_active,
      priority: r.priority, maxExecutions: r.max_executions,
      cooldownMinutes: r.cooldown_minutes,
      lastTriggeredAt: r.last_triggered_at,
      createdAt: r.created_at, updatedAt: r.updated_at
    })));
  });

  app.get('/api/v1/automation/rules/:id', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as any;
    const rule = await db('automation_rules').where({ tenant_id: tenantId, id }).first();
    if (!rule) return reply.status(404).send({ success: false, error: 'Rule not found' });
    const actions = await db('automation_rule_actions').where({ rule_id: id }).orderBy('step_order');
    return sendSuccess(reply, {
      ...rule,
      triggerType: rule.trigger_type, triggerEvent: rule.trigger_event,
      triggerConfig: rule.trigger_config, isActive: rule.is_active,
      maxExecutions: rule.max_executions, cooldownMinutes: rule.cooldown_minutes,
      lastTriggeredAt: rule.last_triggered_at,
      createdAt: rule.created_at, updatedAt: rule.updated_at,
      actions: actions.map((a: any) => ({
        id: a.id, stepOrder: a.step_order, actionType: a.action_type,
        actionName: a.action_name, actionConfig: a.action_config,
        conditionOverride: a.condition_override, isActive: a.is_active
      }))
    });
  });

  app.post('/api/v1/automation/rules', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    const body = request.body as any;
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const [rule] = await db('automation_rules').insert({
      tenant_id: tenantId, name: body.name, slug,
      category: body.category || 'general',
      trigger_type: body.triggerType || 'manual',
      trigger_event: body.triggerEvent || null,
      trigger_config: JSON.stringify(body.triggerConfig || {}),
      conditions: JSON.stringify(body.conditions || []),
      description: body.description || null,
      is_active: body.isActive !== false,
      priority: body.priority || 0,
      max_executions: body.maxExecutions || 0,
      cooldown_minutes: body.cooldownMinutes || 0,
      created_by: ctx.userId
    }).returning('*');
    return sendSuccess(reply, { id: rule.id, name: rule.name, slug: rule.slug }, 'Rule created', 201);
  });

  app.put('/api/v1/automation/rules/:id', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    const update: any = { updated_at: new Date() };
    if (body.name) update.name = body.name;
    if (body.category) update.category = body.category;
    if (body.triggerType) update.trigger_type = body.triggerType;
    if (body.triggerEvent !== undefined) update.trigger_event = body.triggerEvent;
    if (body.triggerConfig) update.trigger_config = JSON.stringify(body.triggerConfig);
    if (body.conditions) update.conditions = JSON.stringify(body.conditions);
    if (body.description !== undefined) update.description = body.description;
    if (body.isActive !== undefined) update.is_active = body.isActive;
    if (body.priority !== undefined) update.priority = body.priority;
    if (body.maxExecutions !== undefined) update.max_executions = body.maxExecutions;
    if (body.cooldownMinutes !== undefined) update.cooldown_minutes = body.cooldownMinutes;
    await db('automation_rules').where({ id }).update(update);
    return sendSuccess(reply, null, 'Rule updated');
  });

  app.delete('/api/v1/automation/rules/:id', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    await db('automation_rule_actions').where({ rule_id: id }).del();
    await db('automation_rules').where({ id }).del();
    return sendSuccess(reply, null, 'Rule deleted');
  });

  // ── Rule Actions ──
  app.get('/api/v1/automation/rules/:ruleId/actions', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { ruleId } = request.params as any;
    const actions = await db('automation_rule_actions').where({ rule_id: ruleId }).orderBy('step_order');
    return sendSuccess(reply, actions.map((a: any) => ({
      id: a.id, ruleId: a.rule_id, stepOrder: a.step_order,
      actionType: a.action_type, actionName: a.action_name,
      actionConfig: a.action_config, conditionOverride: a.condition_override,
      isActive: a.is_active
    })));
  });

  app.post('/api/v1/automation/rules/:ruleId/actions', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { ruleId } = request.params as any;
    const body = request.body as any;
    const maxStep = await db('automation_rule_actions').where({ rule_id: ruleId }).max('step_order as max').first();
    const [action] = await db('automation_rule_actions').insert({
      rule_id: ruleId, step_order: body.stepOrder ?? ((maxStep as any)?.max ?? -1) + 1,
      action_type: body.actionType, action_name: body.actionName || null,
      action_config: JSON.stringify(body.actionConfig || {}),
      condition_override: JSON.stringify(body.conditionOverride || {}),
      is_active: body.isActive !== false
    }).returning('*');
    return sendSuccess(reply, { id: action.id, stepOrder: action.step_order }, 'Action added', 201);
  });

  app.put('/api/v1/automation/rules/:ruleId/actions/:id', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    const update: any = {};
    if (body.stepOrder !== undefined) update.step_order = body.stepOrder;
    if (body.actionType) update.action_type = body.actionType;
    if (body.actionName !== undefined) update.action_name = body.actionName;
    if (body.actionConfig) update.action_config = JSON.stringify(body.actionConfig);
    if (body.conditionOverride) update.condition_override = JSON.stringify(body.conditionOverride);
    if (body.isActive !== undefined) update.is_active = body.isActive;
    await db('automation_rule_actions').where({ id }).update(update);
    return sendSuccess(reply, null, 'Action updated');
  });

  app.delete('/api/v1/automation/rules/:ruleId/actions/:id', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    await db('automation_rule_actions').where({ id }).del();
    return sendSuccess(reply, null, 'Action deleted');
  });

  // ── Trigger Rule Execution ──
  app.post('/api/v1/automation/rules/:id/trigger', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    const { id } = request.params as any;
    const { referenceType, referenceId, inputData } = request.body as any;

    const rule = await db('automation_rules').where({ tenant_id: tenantId, id, is_active: true }).first();
    if (!rule) return reply.status(404).send({ success: false, error: 'Active rule not found' });

    // Check max executions
    if (rule.max_executions > 0) {
      const count = await db('automation_execution_logs').where({ rule_id: id }).count('id as c').first();
      if (Number((count as any)?.c || 0) >= rule.max_executions) {
        return reply.status(400).send({ success: false, error: 'Max executions reached for this rule' });
      }
    }

    // Check cooldown
    if (rule.cooldown_minutes > 0 && rule.last_triggered_at) {
      const cooldownEnd = new Date(new Date(rule.last_triggered_at).getTime() + rule.cooldown_minutes * 60000);
      if (cooldownEnd > new Date()) {
        return reply.status(400).send({ success: false, error: 'Rule is in cooldown period' });
      }
    }

    const actions = await db('automation_rule_actions').where({ rule_id: id, is_active: true }).orderBy('step_order');
    const [log] = await db('automation_execution_logs').insert({
      tenant_id: tenantId, rule_id: id,
      trigger_type: rule.trigger_type,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
      status: 'running', input_data: JSON.stringify(inputData || {}),
      started_at: new Date(), created_by: ctx.userId
    }).returning('*');

    // Execute actions (simplified — in production this would use a queue)
    const results: any[] = [];
    let hasError = false;
    for (const action of actions) {
      try {
        const actionConfig = typeof action.action_config === 'string' ? JSON.parse(action.action_config) : action.action_config;
        results.push({ stepOrder: action.step_order, actionType: action.action_type, status: 'completed', config: actionConfig });
      } catch (err: any) {
        results.push({ stepOrder: action.step_order, actionType: action.action_type, status: 'failed', error: err.message });
        hasError = true;
      }
    }

    const endTime = Date.now();
    const duration = endTime - new Date(log.started_at).getTime();

    await db('automation_execution_logs').where({ id: log.id }).update({
      status: hasError ? 'completed_with_errors' : 'completed',
      output_data: JSON.stringify(results),
      duration_ms: duration,
      completed_at: new Date()
    });

    await db('automation_rules').where({ id }).update({ last_triggered_at: new Date(), updated_at: new Date() });

    return sendSuccess(reply, { logId: log.id, results, status: hasError ? 'completed_with_errors' : 'completed' }, 'Rule triggered');
  });

  // ── Execution Logs ──
  app.get('/api/v1/automation/logs', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { ruleId, status, limit, offset } = request.query as any;
    let q = db('automation_execution_logs').where('automation_execution_logs.tenant_id', tenantId);
    if (ruleId) q = q.andWhere('automation_execution_logs.rule_id', ruleId);
    if (status) q = q.andWhere('automation_execution_logs.status', status);
    const totalQuery = q.clone();
    const total = await totalQuery.count('id as c').first();
    const logs = await q.leftJoin('automation_rules', 'automation_execution_logs.rule_id', 'automation_rules.id')
      .select('automation_execution_logs.*', 'automation_rules.name as rule_name')
      .orderBy('created_at', 'desc')
      .limit(Number(limit) || 50)
      .offset(Number(offset) || 0);
    return sendSuccess(reply, {
      logs: logs.map((l: Record<string, unknown>) => ({
        id: l.id, ruleId: l.rule_id, ruleName: l.rule_name,
        triggerType: l.trigger_type, referenceType: l.reference_type,
        referenceId: l.reference_id, status: l.status,
        inputData: l.input_data, outputData: l.output_data,
        errorMessage: l.error_message, durationMs: l.duration_ms,
        startedAt: l.started_at, completedAt: l.completed_at,
        createdAt: l.created_at
      })),
      total: Number((total as any)?.c || 0)
    });
  });

  // ── Get available trigger events ──
  app.get('/api/v1/automation/trigger-events', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (_request, reply) => {
    const events = [
      { id: 'appointment.created', label: 'Appointment Created', category: 'appointment' },
      { id: 'appointment.completed', label: 'Appointment Completed', category: 'appointment' },
      { id: 'appointment.cancelled', label: 'Appointment Cancelled', category: 'appointment' },
      { id: 'appointment.no_show', label: 'Appointment No-Show', category: 'appointment' },
      { id: 'patient.registered', label: 'Patient Registered', category: 'patient' },
      { id: 'patient.updated', label: 'Patient Updated', category: 'patient' },
      { id: 'lab.order_created', label: 'Lab Order Created', category: 'laboratory' },
      { id: 'lab.result_ready', label: 'Lab Results Ready', category: 'laboratory' },
      { id: 'radiology.order_created', label: 'Radiology Order Created', category: 'radiology' },
      { id: 'radiology.report_ready', label: 'Radiology Report Ready', category: 'radiology' },
      { id: 'pharmacy.prescription_created', label: 'Prescription Created', category: 'pharmacy' },
      { id: 'pharmacy.dispensed', label: 'Prescription Dispensed', category: 'pharmacy' },
      { id: 'billing.invoice_created', label: 'Invoice Created', category: 'billing' },
      { id: 'billing.invoice_paid', label: 'Invoice Paid', category: 'billing' },
      { id: 'billing.invoice_overdue', label: 'Invoice Overdue', category: 'billing' },
      { id: 'inventory.low_stock', label: 'Low Stock Alert', category: 'inventory' },
      { id: 'inventory.expiry_soon', label: 'Expiry Soon Alert', category: 'inventory' },
    ];
    return sendSuccess(reply, events);
  });

  // ── Get available action types ──
  app.get('/api/v1/automation/action-types', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (_request, reply) => {
    const actions = [
      { id: 'send_notification', label: 'Send Notification', category: 'communication', fields: ['template', 'recipient', 'channel'] },
      { id: 'send_email', label: 'Send Email', category: 'communication', fields: ['to', 'subject', 'template'] },
      { id: 'send_sms', label: 'Send SMS', category: 'communication', fields: ['phone', 'message'] },
      { id: 'update_record', label: 'Update Record', category: 'data', fields: ['table', 'record_id', 'field', 'value'] },
      { id: 'create_record', label: 'Create Record', category: 'data', fields: ['table', 'data'] },
      { id: 'api_call', label: 'API Call (Webhook)', category: 'integration', fields: ['url', 'method', 'headers', 'body'] },
      { id: 'generate_report', label: 'Generate Report', category: 'analytics', fields: ['report_type', 'format', 'recipients'] },
      { id: 'assign_task', label: 'Assign Task', category: 'workflow', fields: ['assignee', 'title', 'description', 'due'] },
      { id: 'update_inventory', label: 'Update Inventory', category: 'inventory', fields: ['item_id', 'quantity', 'reason'] },
      { id: 'create_invoice', label: 'Create Invoice', category: 'billing', fields: ['patient_id', 'items', 'due_date'] },
    ];
    return sendSuccess(reply, actions);
  });
}
