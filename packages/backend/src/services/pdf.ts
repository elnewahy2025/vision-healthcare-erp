import { db } from '../core/database.js';

let pdfMake: any = null;

async function getPdfMake(): Promise<any> {
  if (pdfMake) return pdfMake;
  const printerModule = require('pdfmake/build/pdfmake');
  const vfsFonts = require('pdfmake/build/vfs_fonts');
  pdfMake = printerModule.createPdfPrinter({
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  });
  pdfMake.vfs = pdfMake.vfs || vfsFonts.pdfMake.vfs;
  return pdfMake;
}

export async function generateInvoicePdf(invoiceId: string): Promise<Buffer | null> {
  try {
    const pm = await getPdfMake();
    const invoice = await db('invoices')
      .join('patients', 'invoices.patient_id', 'patients.id')
      .where('invoices.id', invoiceId)
      .select('invoices.*', 'patients.first_name', 'patients.last_name', 'patients.phone', 'patients.email', 'patients.national_id')
      .first();
    if (!invoice) return null;
    const tenant = await db('tenants').where({ id: invoice.tenant_id }).first();
    const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);

    const content: any[] = [
      { columns: [{ text: tenant?.name || 'Vision Healthcare', style: 'title', width: '*' }, { text: invoice.invoice_number, style: 'invoiceNumber', width: 'auto', alignment: 'right' }] },
      { text: '', margin: [0, 10] },
      { columns: [
        { width: '*', text: [{ text: 'Patient: ', bold: true }, `${invoice.first_name} ${invoice.last_name}\n`, { text: 'Phone: ', bold: true }, `${invoice.phone || 'N/A'}\n`, { text: 'National ID: ', bold: true }, `${invoice.national_id || 'N/A'}\n`] },
        { width: '*', text: [{ text: 'Date: ', bold: true }, `${new Date(invoice.created_at).toLocaleDateString('en-EG')}\n`, { text: 'Due: ', bold: true }, `${invoice.due_date || 'N/A'}\n`, { text: 'Status: ', bold: true }, { text: invoice.status.toUpperCase(), color: invoice.status === 'paid' ? 'green' : 'orange' }], alignment: 'right' },
      ]},
      { text: '', margin: [0, 15] },
      { table: { headerRows: 1, widths: [25, '*', 40, 80, 80], body: [
        [{ text: '#', style: 'tableHeader' }, { text: 'Description', style: 'tableHeader' }, { text: 'Qty', style: 'tableHeader', alignment: 'center' }, { text: 'Price', style: 'tableHeader', alignment: 'right' }, { text: 'Total', style: 'tableHeader', alignment: 'right' }],
        ...items.map((item: any, i: number) => [String(i + 1), `${item.description || ''} ${item.code ? '(' + item.code + ')' : ''}`, String(item.quantity), `${Number(item.unitPrice || 0).toFixed(2)} EGP`, `${(Number(item.quantity || 1) * Number(item.unitPrice || 0)).toFixed(2)} EGP`]),
      ]}, layout: 'lightHorizontalLines' },
      { text: '', margin: [0, 10] },
      { columns: [{ width: '*', text: '' }, { width: 250, table: { widths: [120, 130], body: [
        ['Subtotal:', `${Number(invoice.total || 0).toFixed(2)} EGP`],
        ...(invoice.discount > 0 ? [['Discount:', `-${Number(invoice.discount).toFixed(2)} EGP`]] : []),
        ...(invoice.tax > 0 ? [['Tax:', `${Number(invoice.tax).toFixed(2)} EGP`]] : []),
        [{ text: 'Total:', bold: true }, { text: `${Number(invoice.total).toFixed(2)} EGP`, bold: true }],
        [{ text: 'Paid:', color: 'green', bold: true }, { text: `${Number(invoice.paid || 0).toFixed(2)} EGP`, color: 'green', bold: true }],
        [{ text: 'Due:', color: 'red', bold: true }, { text: `${Number(invoice.due || 0).toFixed(2)} EGP`, color: 'red', bold: true }],
      ]}, layout: 'noBorders' }] },
      { text: '', margin: [0, 20] },
      { text: [{ text: 'Thank you for your visit!\n', bold: true, alignment: 'center' }, { text: `${tenant?.name || 'Vision Healthcare'}`, alignment: 'center', fontSize: 9, color: 'gray' }] },
    ];

    const docDefinition = { content, defaultStyle: { fontSize: 10, font: 'Roboto' }, styles: { title: { fontSize: 18, bold: true, color: '#2563eb' }, invoiceNumber: { fontSize: 14, bold: true }, tableHeader: { bold: true, fontSize: 9, color: 'white', fillColor: '#2563eb', margin: [4, 4] } }, pageMargins: [40, 40, 40, 40] };

    return new Promise((resolve) => {
      const pdfDoc = pm.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer: Buffer) => resolve(buffer));
    });
  } catch (error: any) {
    console.error('PDF generation failed:', error.message);
    return null;
  }
}

export async function generatePrescriptionPdf(prescriptionId: string): Promise<Buffer | null> {
  try {
    const pm = await getPdfMake();
    const rx = await db('pharmacy_prescriptions')
      .join('patients', 'prescriptions.patient_id', 'patients.id')
      .where('prescriptions.id', prescriptionId)
      .select('prescriptions.*', 'patients.first_name', 'patients.last_name', 'patients.age', 'patients.gender', 'patients.phone')
      .first();
    if (!rx) return null;
    const tenant = await db('tenants').where({ id: rx.tenant_id }).first();
    const medications = typeof rx.medications === 'string' ? JSON.parse(rx.medications) : (rx.medications || []);

    const content: any[] = [
      { columns: [{ text: tenant?.name || 'Vision Healthcare', style: 'title', width: '*' }, { text: 'PRESCRIPTION', width: 'auto', alignment: 'right', style: 'title' }] },
      { text: '', margin: [0, 10] },
      { text: [{ text: 'Patient: ', bold: true }, `${rx.first_name} ${rx.last_name}`, '  ', { text: 'Age/Gender: ', bold: true }, `${rx.age || 'N/A'} / ${rx.gender || 'N/A'}`, '  ', { text: 'Date: ', bold: true }, new Date(rx.created_at).toLocaleDateString('en-EG')] },
      { text: '', margin: [0, 10] },
      ...medications.map((med: any, i: number) => ({ text: [{ text: `${i + 1}. ${med.medication_name || med.name || 'Unknown'}\n`, bold: true }, `   ${med.dosage || ''} ${med.frequency || ''} ${med.duration || ''}\n`, `   ${med.instructions || med.notes || ''}\n`] })),
      ...(medications.length ? [] : [{ text: 'No medications prescribed.', italics: true, color: 'gray' }]),
      { text: '', margin: [0, 15] },
      { text: rx.notes || 'No additional notes.' },
      { text: '', margin: [0, 50] },
      { canvas: [{ type: 'line', x1: 300, y1: 0, x2: 450, y2: 0, lineWidth: 1, lineColor: 'gray' }] },
      { text: 'Doctor\'s Signature', fontSize: 9, color: 'gray', alignment: 'right' },
    ];

    const docDefinition = { content, defaultStyle: { fontSize: 10, font: 'Roboto' }, styles: { title: { fontSize: 16, bold: true, color: '#2563eb' } }, pageMargins: [40, 40, 40, 40] };
    return new Promise((resolve) => { pm.createPdf(docDefinition).getBuffer((buffer: Buffer) => resolve(buffer)); });
  } catch (error: any) {
    console.error('Prescription PDF failed:', error.message);
    return null;
  }
}

export async function generateLabReportPdf(labOrderId: string): Promise<Buffer | null> {
  try {
    const pm = await getPdfMake();
    const order = await db('lab_orders')
      .join('patients', 'lab_orders.patient_id', 'patients.id')
      .where('lab_orders.id', labOrderId)
      .select('lab_orders.*', 'patients.first_name', 'patients.last_name', 'patients.age', 'patients.gender')
      .first();
    if (!order) return null;
    const tenant = await db('tenants').where({ id: order.tenant_id }).first();
    const results = typeof order.results === 'string' ? JSON.parse(order.results) : (order.results || []);

    const tableRows: any[] = results.length ? [[
      { text: 'Test', style: 'tableHeader' }, { text: 'Result', style: 'tableHeader' }, { text: 'Range', style: 'tableHeader' }, { text: 'Flag', style: 'tableHeader' },
    ], ...results.map((r: any) => [r.test_name || r.name || '', `${r.result || r.value || ''} ${r.unit || ''}`, r.reference_range || r.range || '', { text: r.flag || '-', color: r.flag && r.flag !== 'normal' ? 'red' : 'black', bold: r.flag && r.flag !== 'normal' }])] : [];

    const content: any[] = [
      { columns: [{ text: tenant?.name || 'Vision Healthcare', style: 'title', width: '*' }, { text: 'LABORATORY REPORT', width: 'auto', alignment: 'right' }] },
      { text: '', margin: [0, 10] },
      { text: [{ text: 'Patient: ', bold: true }, `${order.first_name} ${order.last_name}`, '  ', { text: 'Test: ', bold: true }, order.test_name || 'N/A', '  ', { text: 'Date: ', bold: true }, new Date(order.created_at).toLocaleDateString('en-EG')] },
      { text: '', margin: [0, 10] },
      ...(tableRows.length ? [{ table: { headerRows: 1, widths: ['*', 100, 100, 50], body: tableRows }, layout: 'lightHorizontalLines' }] : []),
      { text: order.notes || '', italics: true, margin: [0, 10] },
    ];

    const docDefinition = { content, defaultStyle: { fontSize: 10, font: 'Roboto' }, styles: { title: { fontSize: 16, bold: true, color: '#2563eb' }, tableHeader: { bold: true, fontSize: 9, color: 'white', fillColor: '#2563eb', margin: [4, 4] } }, pageMargins: [40, 40, 40, 40] };
    return new Promise((resolve) => { pm.createPdf(docDefinition).getBuffer((buffer: Buffer) => resolve(buffer)); });
  } catch (error: any) {
    console.error('Lab report PDF failed:', error.message);
    return null;
  }
}
