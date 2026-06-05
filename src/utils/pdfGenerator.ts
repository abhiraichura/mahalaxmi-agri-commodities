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

// Convert quantity to KG for calculations
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
  const M = 15;
  const W = PW - M * 2;

  let y = 50; // Letterhead spacer

  // CONTRACT TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...RED);
  doc.text('CONTRACT NOTE', PW / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`No. ${contract.contractNo} / ${contract.financialYear || contract.year}`, PW / 2, y, { align: 'center' });
  y += 4.5;
  doc.text(`Date: ${format(new Date(contract.date), 'dd/MM/yyyy')}`, PW / 2, y, { align: 'center' });
  y += 10;

  // PARTIES BOX
  const partyH = 36;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W, partyH, 'FD');

  const colW = (W - 4) / 2;

  const firstParty = type === 'buyer_copy' ? contract.buyer : contract.seller;
  const secondParty = type === 'buyer_copy' ? contract.seller : contract.buyer;
  const firstLabel = type === 'buyer_copy' ? 'BUYER' : 'SELLER';
  const secondLabel = type === 'buyer_copy' ? 'SELLER' : 'BUYER';

  // First party (left)
  let py = y + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text(`${firstLabel}:`, M + 3, py);
  py += 5;
  doc.setTextColor(...BLACK);
  doc.setFontSize(9.5);
  doc.text(firstParty.legalName, M + 3, py);
  py += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const addr1 = wrapText(doc, firstParty.address, colW - 6);
  addr1.forEach(line => {
    doc.text(line, M + 3, py);
    py += 3.5;
  });
  doc.text(`${firstParty.city}, ${firstParty.state} - ${firstParty.pincode}`, M + 3, py);
  py += 3.5;
  if (firstParty.gstin) {
    doc.text(`GSTIN: ${firstParty.gstin}`, M + 3, py);
    py += 3.5;
  }
  if (firstParty.phone) {
    doc.text(`Phone: ${firstParty.phone}`, M + 3, py);
  }

  // Second party (right)
  const rx = M + colW + 2;
  py = y + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text(`${secondLabel}:`, rx, py);
  py += 5;
  doc.setTextColor(...BLACK);
  doc.setFontSize(9.5);
  doc.text(secondParty.legalName, rx, py);
  py += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const addr2 = wrapText(doc, secondParty.address, colW - 6);
  addr2.forEach(line => {
    doc.text(line, rx, py);
    py += 3.5;
  });
  doc.text(`${secondParty.city}, ${secondParty.state} - ${secondParty.pincode}`, rx, py);
  py += 3.5;
  if (secondParty.gstin) {
    doc.text(`GSTIN: ${secondParty.gstin}`, rx, py);
    py += 3.5;
  }
  if (secondParty.phone) {
    doc.text(`Phone: ${secondParty.phone}`, rx, py);
  }

  y += partyH + 8;

  // PRODUCT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...RED);
  doc.text('PRODUCT', M, y);
  y += 5;

  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text(contract.product.name.toUpperCase(), M + 3, y + 5);
  y += 9;

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
        fontSize: 8,
        lineWidth: 0.3,
        lineColor: [220, 220, 220]
      },
      bodyStyles: {
        fontSize: 8,
        lineWidth: 0.2,
        lineColor: [220, 220, 220]
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      margin: { left: M, right: M },
      tableWidth: W
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // COMMERCIAL TERMS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...RED);
  doc.text('COMMERCIAL TERMS', M, y);
  y += 5;

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

  if (contract.otherTerms) {
    commRows.push(['Other Terms', contract.otherTerms]);
  }

  autoTable(doc, {
    startY: y,
    body: commRows,
    theme: 'grid',
    bodyStyles: {
      fontSize: 8,
      lineWidth: 0.2,
      lineColor: [220, 220, 220]
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', fillColor: [248, 248, 248] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: M, right: M },
    tableWidth: W
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // TERMS & CONDITIONS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...RED);
  doc.text('TERMS & CONDITIONS', M, y);
  y += 5;

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
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK);

  terms.forEach((term, index) => {
    const num = `${index + 1}. `;
    const text = num + term;
    const splitText = wrapText(doc, text, W - 5);
    doc.text(splitText, M + 2, y);
    y += (splitText.length * 3.5) + 1;
  });

  y += 4;

  // FOOTER
  if (y > PH - 40) {
    doc.addPage();
    y = M;
    y = 50;
  }

  // Separator
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.4);
  doc.line(M, y, PW - M, y);
  y += 7;

  // Broker info left, signature right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(settings.legalName, M, y);

  if (settings.signature) {
    try {
      doc.addImage(settings.signature, 'PNG', PW - M - 40, y - 5, 35, 15);
    } catch (e) {
      // skip
    }
  }

  doc.text('Authorized Signature', PW - M, y, { align: 'right' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(`For, ${settings.name}`, M, y);

  // Page border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.rect(M - 2, M - 2, W + 4, PH - M * 2 + 4, 'D');

  // Copy label at bottom right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...RED);
  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.text(copyLabel, PW - M, PH - M + 2, { align: 'right' });

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

  // Show date range if available, otherwise month/year
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

  // Payment status summary
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

  // Payment history in PDF
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
