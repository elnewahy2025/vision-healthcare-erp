import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Password reset tokens
  if (!(await knex.schema.hasTable('password_resets'))) {
    await knex.schema.createTable('password_resets', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('token', 255).notNullable().index();
      table.string('type', 20).notNullable().defaultTo('password_reset'); // password_reset | mfa_recovery
      table.timestamp('expires_at').notNullable();
      table.timestamp('used_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // One-time passwords for verification
  if (!(await knex.schema.hasTable('otp_codes'))) {
    await knex.schema.createTable('otp_codes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('identifier', 255).notNullable(); // email or phone
      table.string('code', 6).notNullable();
      table.string('purpose', 50).notNullable(); // login | verify_email | verify_phone | password_reset
      table.timestamp('expires_at').notNullable();
      table.integer('attempts').defaultTo(0);
      table.timestamp('verified_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['identifier', 'purpose']);
    });
  }

  // Audit log
  if (!(await knex.schema.hasTable('audit_logs'))) {
    await knex.schema.createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').nullable();
      table.string('action', 100).notNullable(); // patient.created, user.login, etc.
      table.string('entity_type', 50).nullable(); // patient, appointment, invoice
      table.uuid('entity_id').nullable();
      table.jsonb('metadata').nullable(); // changed fields, old/new values
      table.string('ip_address', 45).nullable();
      table.string('user_agent', 500).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).index();
    });
  }

  // Notification templates
  if (!(await knex.schema.hasTable('notification_templates'))) {
    await knex.schema.createTable('notification_templates', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('key', 100).notNullable(); // appointment.reminder, invoice.paid, etc.
      table.string('channel', 20).notNullable(); // email | sms | both
      table.string('locale', 2).notNullable().defaultTo('en');
      table.string('subject', 255).nullable(); // email subject
      table.text('body').notNullable(); // template body with {{variables}}
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'key', 'channel', 'locale']);
    });
  }

  // Notification logs
  if (!(await knex.schema.hasTable('notification_logs'))) {
    await knex.schema.createTable('notification_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').nullable();
      table.string('channel', 20).notNullable(); // email | sms
      table.string('recipient', 255).notNullable();
      table.string('template_key', 100).nullable();
      table.string('subject', 255).nullable();
      table.text('body').nullable();
      table.string('status', 20).notNullable().defaultTo('pending'); // pending | sent | failed
      table.text('error_message').nullable();
      table.timestamp('sent_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Seed default notification templates
  const templates = [
    { key: 'password.reset', channel: 'email', subject_en: 'Reset Your Password', subject_ar: 'إعادة تعيين كلمة المرور', body_en: 'Click the link to reset your password: {{resetLink}}', body_ar: 'اضغط على الرابط لإعادة تعيين كلمة المرور: {{resetLink}}' },
    { key: 'appointment.reminder', channel: 'sms', subject_en: '', subject_ar: '', body_en: 'Reminder: You have an appointment on {{date}} at {{time}}. {{clinicName}}', body_ar: 'تذكير: لديك موعد في {{date}} الساعة {{time}}. {{clinicName}}' },
    { key: 'appointment.reminder', channel: 'email', subject_en: 'Appointment Reminder', subject_ar: 'تذكير بالموعد', body_en: 'Dear {{patientName}}, this is a reminder for your appointment on {{date}} at {{time}}.', body_ar: 'عزيزي {{patientName}}، هذا تذكير بموعدك في {{date}} الساعة {{time}}.' },
    { key: 'otp.login', channel: 'sms', subject_en: '', subject_ar: '', body_en: 'Your verification code is: {{otpCode}}. It expires in 5 minutes.', body_ar: 'رمز التحقق الخاص بك هو: {{otpCode}}. ينتهي الصلاحية بعد 5 دقائق.' },
    { key: 'invoice.paid', channel: 'email', subject_en: 'Payment Confirmed', subject_ar: 'تأكيد الدفع', body_en: 'Your payment of {{amount}} has been received. Invoice: {{invoiceNumber}}', body_ar: 'تم استلام دفعتك بقيمة {{amount}}. الفاتورة: {{invoiceNumber}}' },
  ];

  for (const t of templates) {
    await knex('notification_templates').insert({
      id: knex.raw('gen_random_uuid()'),
      tenant_id: null, // global templates
      key: t.key,
      channel: t.channel,
      locale: 'en',
      subject: t.subject_en,
      body: t.body_en,
      is_active: true,
    });
    if (t.subject_ar || t.body_ar) {
      await knex('notification_templates').insert({
        id: knex.raw('gen_random_uuid()'),
        tenant_id: null,
        key: t.key,
        channel: t.channel,
        locale: 'ar',
        subject: t.subject_ar,
        body: t.body_ar,
        is_active: true,
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_logs');
  await knex.schema.dropTableIfExists('notification_templates');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('otp_codes');
  await knex.schema.dropTableIfExists('password_resets');
}
