import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCtx } from '../../utils/route-helper.js';
import { sendError, sendSuccess } from '../../utils/response.js';
import { generateInvoicePdf, generatePrescriptionPdf, generateLabReportPdf } from '../../services/pdf.js';
import { authenticate } from '../auth-guard.js';

export async function registerPdfModule(app: FastifyInstance) {

  // Generate invoice PDF
  app.get('/api/v1/pdf/invoice/:invoiceId-old', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { invoiceId } = z.object({ invoiceId: z.string().uuid() }).parse(request.params);

    const buffer = await generateInvoicePdf(invoiceId);
    if (!buffer) return sendError(reply, 'Invoice not found or generation failed', 404);

    return reply
      .type('application/pdf')
      .header('Content-Disposition', `inline; filename="invoice-${invoiceId}.pdf"`)
      .header('Cache-Control', 'no-cache')
      .send(buffer);
  });

  // Generate prescription PDF
  app.get('/api/v1/pdf/prescription/:prescriptionId-old', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { prescriptionId } = z.object({ prescriptionId: z.string().uuid() }).parse(request.params);

    const buffer = await generatePrescriptionPdf(prescriptionId);
    if (!buffer) return sendError(reply, 'Prescription not found or generation failed', 404);

    return reply
      .type('application/pdf')
      .header('Content-Disposition', `inline; filename="prescription-${prescriptionId}.pdf"`)
      .send(buffer);
  });

  // Generate lab report PDF
  app.get('/api/v1/pdf/lab-report/:labOrderId-old', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { labOrderId } = z.object({ labOrderId: z.string().uuid() }).parse(request.params);

    const buffer = await generateLabReportPdf(labOrderId);
    if (!buffer) return sendError(reply, 'Lab order not found or generation failed', 404);

    return reply
      .type('application/pdf')
      .header('Content-Disposition', `inline; filename="lab-report-${labOrderId}.pdf"`)
      .send(buffer);
  });

}
