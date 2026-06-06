import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings, BrokerageBill, BillPayment } from '../types';
import { format } from 'date-fns';

type RGB = [number, number, number];
const c = (r: number, g: number, b: number): RGB => [r, g, b];

const BLACK = c(0, 0, 0);
const DARK = c(30, 30, 30);
const GRAY = c(100, 100, 100);
const RED = c(160, 30, 50);
const LIGHT = c(250, 250, 250);
const BORDER = c(220, 220, 220);

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

const toKg = (quantity: number, unit: string): number => {
  if (unit === 'MT') return quantity * 1000;
  return quantity;
};

export const generateContractPDF = (
  contract: Contract,
  settings: CompanySettings,
  type: 'buyer_copy' | 'seller_copy' | 'broker_copy',
  options: { showTotalValue?: boolean } = {}
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const PW = 210;
  const PH = 297;
  const M = 10; // Slightly tighter margins
  const W = PW - M * 2;

  // LETTERHEAD SPACER: Leave blank space for pre-printed letterhead
  // Your letterhead is approximately 55mm tall
  let y = 58;

  // ─── HEADER ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...RED);
  doc.text('CONTRACT NOTE', PW / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text(`No. ${contract.contractNo} / ${contract.financialYear || contract.year}`, PW / 2, y, { align: 'center' });
  y += 3.5;
  doc.text(`Date: ${format(new Date(contract.date), 'dd/MM/yyyy')}`, PW / 2, y, { align: 'center' });
  y += 5.5;

  // ─── PARTIES ─── (Compact 2-column layout)
  const partyH = 26;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W, partyH, 'FD');

  const colW = (W - 4) / 2;

  const firstParty = type === 'buyer_copy' ? contract.buyer : contract.seller;
  const secondParty = type === 'buyer_copy' ? contract.seller : contract.buyer;
  const firstLabel = type === 'buyer_copy' ? 'BUYER' : 'SELLER';
  const secondLabel = type === 'buyer_copy' ? 'SELLER' : 'BUYER';

  // Left party
  let py = y + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...RED);
  doc.text(`${firstLabel}:`, M + 2, py);
  py += 3.5;
  doc.setTextColor(...BLACK);
  doc.setFontSize(8.5);
  doc.text(firstParty.legalName, M + 2, py);
  py += 3.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  const addr1 = wrapText(doc, firstParty.address, colW - 4);
  addr1.forEach(line => {
    doc.text(line, M + 2, py);
    py += 2.6;
  });
  doc.text(`${firstParty.city}, ${firstParty.state} - ${firstParty.pincode}`, M + 2, py);
  py += 2.6;
  if (firstParty.gstin) {
    doc.text(`GSTIN: ${firstParty.gstin}`, M + 2, py);
    py += 2.6;
  }
  if (firstParty.phone) {
    doc.text(`Phone: ${firstParty.phone}`, M + 2, py);
  }

  // Right party
  const rx = M + colW + 2;
  py = y + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...RED);
  doc.text(`${secondLabel}:`, rx, py);
  py += 3.5;
  doc.setTextColor(...BLACK);
  doc.setFontSize(8.5);
  doc.text(secondParty.legalName, rx, py);
  py += 3.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  const addr2 = wrapText(doc, secondParty.address, colW - 4);
  addr2.forEach(line => {
    doc.text(line, rx, py);
    py += 2.6;
  });
  doc.text(`${secondParty.city}, ${secondParty.state} - ${secondParty.pincode}`, rx, py);
  py += 2.6;
  if (secondParty.gstin) {
    doc.text(`GSTIN: ${secondParty.gstin}`, rx, py);
    py += 2.6;
  }
  if (secondParty.phone) {
    doc.text(`Phone: ${secondParty.phone}`, rx, py);
  }

  y += partyH + 4;

  // ─── PRODUCT ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...RED);
  doc.text('PRODUCT', M, y);
  y += 3.5;

  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W, 5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(contract.product.name.toUpperCase(), M + 2, y + 3.5);
  y += 6;

  // Specs table
  if (contract.product.specs && contract.product.specs.length > 0) {
    const specRows = contract.product.specs
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(spec => [spec.label, `${spec.value} ${spec.unit}`]);

    autoTable(doc, {
      startY: y,
      head: [['Specification', 'Standard / Value']],
      body: specRows,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [160, 30, 50],
        fontStyle: 'bold',
        fontSize: 7,
        lineWidth: 0.2,
        lineColor: [220, 220, 220],
        cellPadding: 1.2
      },
      bodyStyles: {
        fontSize: 7,
        lineWidth: 0.15,
        lineColor: [220, 220, 220],
        cellPadding: 1.2
      },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      margin: { left: M, right: M },
      tableWidth: W
    });

    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // ─── COMMERCIAL TERMS ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...RED);
  doc.text('COMMERCIAL TERMS', M, y);
  y += 3.5;

  const quantityKg = toKg(contract.quantity, contract.quantityUnit);
  const totalValue = quantityKg * contract.price;
  const showTotal = options.showTotalValue || type === 'broker_copy';

  const commRows: any[] = [
    ['Quantity', `${contract.quantity} ${contract.quantityUnit}${contract.quantityUnit === 'MT' ? ` (${quantityKg} KG)` : ''}`],
    ['Price', `Rs. ${contract.price.toLocaleString('en-IN')} per ${contract.priceUnit}`],
    ['Packing', contract.packing],
    ['Delivery At', contract.deliveryLocation],
    ['Delivery Address', contract.deliveryAddress || 'Will be provided by buyer at time of delivery'],
    ['Loading Condition', contract.loadingCondition],
    ['Payment Terms', contract.paymentTerms],
    ['GST', `${contract.gstPercent}% Extra as per Government Rules`]
  ];

  if (showTotal) {
    commRows.splice(2, 0, ['Total Value', `Rs. ${totalValue.toLocaleString('en-IN')}`]);
  }

  if (contract.loadingDeadline) {
    commRows.push(['Loading Deadline', format(new Date(contract.loadingDeadline), 'dd MMM yyyy')]);
  }

  if (contract.otherTerms) {
    commRows.push(['Other Terms', contract.otherTerms]);
  }

  autoTable(doc, {
    startY: y,
    body: commRows,
    theme: 'grid',
    bodyStyles: {
      fontSize: 7,
      lineWidth: 0.15,
      lineColor: [220, 220, 220],
      cellPadding: 1.2
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold', fillColor: [248, 248, 248] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: M, right: M },
    tableWidth: W
  });

  y = (doc as any).lastAutoTable.finalY + 3;

  // ─── TERMS & CONDITIONS ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...RED);
  doc.text('TERMS & CONDITIONS', M, y);
  y += 3.5;

  const terms = settings.termsAndConditions.length > 0
    ? settings.termsAndConditions
    : [
        'Goods to be loaded within stipulated time as per contract.',
        'After dispatching of goods, intimation must be given to us.',
        'If any bargain cancelled due to time limit, loading condition or Govt. restriction, our brokerage will be charged as usual.',
        'This contract is subject to responsibility of both parties and effected as a broker of both parties without any liabilities.',
        'We have full power to settle all claims amicably which will bind both buyer and seller equally.'
      ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...DARK);

  const footerReserve = 22; // Space reserved for footer
  const maxY = PH - M - footerReserve;

  terms.forEach((term, index) => {
    const text = `${index + 1}. ${term}`;
    const splitText = wrapText(doc, text, W - 4);
    const lineHeight = 2.5;
    const termHeight = splitText.length * lineHeight;

    // Dynamic font size reduction if running out of space
    if (y + termHeight > maxY && doc.getFontSize() > 6) {
      doc.setFontSize(6);
    }

    doc.text(splitText, M + 2, y);
    y += termHeight + 0.3;
  });

  // ─── FOOTER ─── (Fixed at bottom, never overflows)
  const footerY = PH - M - 16;

  // Separator line
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.3);
  doc.line(M, footerY, PW - M, footerY);

  // Broker name left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text(settings.legalName, M, footerY + 4);

  // Signature right
  if (settings.signature) {
    try {
      doc.addImage(settings.signature, 'PNG', PW - M - 30, footerY + 1, 25, 10);
    } catch (e) {
      // skip
    }
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text('Authorized Signature', PW - M, footerY + 4, { align: 'right' });

  doc.setFontSize(6.5);
  doc.text(`For, ${settings.name}`, M, footerY + 7.5);

  // Page border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(M - 1.5, M - 1.5, W + 3, PH - M * 2 + 3, 'D');

  // Copy label bottom right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...RED);
  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.text(copyLabel, PW - M, PH - M + 0.5, { align: 'right' });

  return doc;
};

export const generateBrokerageBillPDF = (
  bill: any,
  settings: CompanySettings
): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 15;
  const W = 210 - M * 2;
  let y = M;

  const RED: RGB = [160, 30, 50];
  const GRAY: RGB = [100, 100, 100];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...RED);
  doc.text(settings.name, 105, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text('Brokerage Bill', 105, y, { align: 'center' });
  y += 10;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  if (bill.month && bill.month > 0) {
    doc.text(`Period: ${bill.month}/${bill.year}`, M, y);
  } else if (bill.fromDate && bill.toDate) {
    doc.text(`Period: ${format(new Date(bill.fromDate), 'dd/MM/yyyy')} - ${format(new Date(bill.toDate), 'dd/MM/yyyy')}`, M, y);
  } else {
    doc.text(`Period: ${bill.year}`, M, y);
  }

  doc.text(`Generated: ${format(new Date(bill.generatedAt?.toDate ? bill.generatedAt.toDate() : bill.generatedAt), 'dd/MM/yyyy')}`, 198, y, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Party: ${bill.party.legalName}`, M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  if (bill.party.gstin) {
    doc.text(`GSTIN: ${bill.party.gstin}`, M, y);
    y += 4;
  }
  if (bill.party.address) {
    doc.text(`${bill.party.address}, ${bill.party.city}, ${bill.party.state}`, M, y);
    y += 4;
  }
  y += 4;

  if (bill.status || bill.paidAmount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...RED);
    const statusText = bill.status === 'paid' ? 'PAID' : bill.status === 'partial' ? 'PARTIALLY PAID' : 'PENDING';
    doc.text(`Payment Status: ${statusText}`, M, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Brokerage: Rs. ${bill.totalBrokerage.toLocaleString('en-IN')}`, M, y);
    if (bill.paidAmount > 0) {
      doc.text(`Paid: Rs. ${bill.paidAmount.toLocaleString('en-IN')}`, 105, y, { align: 'center' });
    }
    if (bill.balanceAmount > 0) {
      doc.text(`Balance: Rs. ${bill.balanceAmount.toLocaleString('en-IN')}`, 198, y, { align: 'right' });
    }
    y += 8;
  }

  const tableData = (bill.contracts || []).map((c: any) => [
    c.contractNo,
    format(new Date(c.date), 'dd/MM/yyyy'),
    c.product?.name || '',
    `${c.quantity} ${c.quantityUnit}`,
    `Rs.${c.price.toLocaleString('en-IN')}`,
    `Rs.${c.brokerageAmount.toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Contract No', 'Date', 'Product', 'Quantity', 'Price', 'Brokerage']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: RED,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: { fontSize: 8 },
    margin: { left: M, right: M },
    tableWidth: W
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text(`Total Brokerage: Rs.${bill.totalBrokerage.toLocaleString('en-IN')}`, 198, finalY, { align: 'right' });

  if (bill.payments && bill.payments.length > 0) {
    let payY = finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...RED);
    doc.text('Payment History', M, payY);
    payY += 8;

    const paymentRows = bill.payments.map((p: BillPayment) => [
      format(new Date(p.date), 'dd/MM/yyyy'),
      p.mode.replace('_', ' ').toUpperCase(),
      p.reference || '-',
      `Rs. ${p.amount.toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: payY,
      head: [['Date', 'Mode', 'Reference', 'Amount']],
      body: paymentRows,
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: { fontSize: 8 },
      margin: { left: M, right: M },
      tableWidth: W
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('This is a computer generated bill.', 105, 285, { align: 'center' });

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const getPDFBlob = (doc: jsPDF): Blob => {
  return doc.output('blob');
};
