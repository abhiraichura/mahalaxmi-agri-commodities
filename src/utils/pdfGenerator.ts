import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings } from '../types';
import { format } from 'date-fns';

type RGB = [number, number, number];
const c = (r: number, g: number, b: number): RGB => [r, g, b];

export const generateContractPDF = (
  contract: Contract,
  settings: CompanySettings,
  type: 'buyer_copy' | 'seller_copy' | 'broker_copy',
  includeTotalValue: boolean = true
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

  const BLACK = c(0, 0, 0);
  const DARK = c(33, 37, 41);
  const GRAY = c(100, 100, 100);
  const RED = c(180, 30, 60);
  const LIGHT = c(250, 250, 250);
  const BORDER = c(220, 220, 220);
  const WHITE = c(255, 255, 255);

  let y = M;

  // === LETTERHEAD AREA (blank space for pre-printed letterhead) ===
  // Leave top 45mm blank for physical letterhead
  y = 52;

  // Copy type badge
  const copyLabels: Record<string, string> = {
    buyer_copy: 'BUYER COPY',
    seller_copy: 'SELLER COPY',
    broker_copy: 'BROKER COPY'
  };

  doc.setFillColor(...RED);
  doc.roundedRect(M, y - 6, 35, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(copyLabels[type], M + 17.5, y - 2, { align: 'center' });

  // Contract title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...RED);
  doc.text('CONTRACT NOTE', PW / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(`No. ${contract.contractNo} / ${contract.year}`, PW / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Date: ${format(new Date(contract.date), 'dd MMMM yyyy')}`, PW / 2, y, { align: 'center' });
  y += 10;

  // === PARTIES ===
  const firstParty = type === 'buyer_copy' ? contract.buyer : contract.seller;
  const secondParty = type === 'buyer_copy' ? contract.seller : contract.buyer;
  const firstLabel = type === 'buyer_copy' ? 'BUYER' : 'SELLER';
  const secondLabel = type === 'buyer_copy' ? 'SELLER' : 'BUYER';

  const partyH = 36;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W, partyH, 'FD');

  // Left party
  let py = y + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text(`${firstLabel}:`, M + 4, py);
  py += 5;
  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.text(firstParty.legalName, M + 4, py);
  py += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const addr1 = firstParty.address.length > 55 ? firstParty.address.substring(0, 55) + '...' : firstParty.address;
  doc.text(addr1, M + 4, py);
  py += 3.5;
  doc.text(`${firstParty.city}, ${firstParty.state} - ${firstParty.pincode}`, M + 4, py);
  py += 3.5;
  if (firstParty.gstin) {
    doc.text(`GSTIN: ${firstParty.gstin}`, M + 4, py);
    py += 3.5;
  }
  doc.text(`Phone: ${firstParty.phone || 'N/A'}`, M + 4, py);

  // Right party
  const rx = M + W / 2 + 2;
  py = y + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text(`${secondLabel}:`, rx, py);
  py += 5;
  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.text(secondParty.legalName, rx, py);
  py += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const addr2 = secondParty.address.length > 55 ? secondParty.address.substring(0, 55) + '...' : secondParty.address;
  doc.text(addr2, rx, py);
  py += 3.5;
  doc.text(`${secondParty.city}, ${secondParty.state} - ${secondParty.pincode}`, rx, py);
  py += 3.5;
  if (secondParty.gstin) {
    doc.text(`GSTIN: ${secondParty.gstin}`, rx, py);
    py += 3.5;
  }
  doc.text(`Phone: ${secondParty.phone || 'N/A'}`, rx, py);

  y += partyH + 8;

  // === PRODUCT ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...RED);
  doc.text('PRODUCT', M, y);
  y += 5;

  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(contract.product.name.toUpperCase(), M + 4, y + 5.5);
  y += 10;

  if (contract.product.specs && contract.product.specs.length > 0) {
    const specRows = contract.product.specs
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(spec => [spec.label, `${spec.value} ${spec.unit || ''}`]);

    autoTable(doc, {
      startY: y,
      head: [['Specification', 'Standard / Value']],
      body: specRows,
      theme: 'plain',
      headStyles: {
        fillColor: [248, 248, 248],
        textColor: [180, 30, 60],
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

  // === COMMERCIAL TERMS ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...RED);
  doc.text('COMMERCIAL TERMS', M, y);
  y += 5;

  const totalValue = contract.quantity * contract.price;

  const commRows: [string, string][] = [
    ['Quantity', `${contract.quantity} ${contract.quantityUnit}`],
    ['Price', `Rs. ${contract.price.toLocaleString('en-IN')} per ${contract.priceUnit}`],
    ['Packing', contract.packing],
    ['Delivery At', contract.deliveryLocation],
    ['Delivery Address', contract.deliveryAddress || 'Will be provided by buyer at time of delivery'],
    ['Loading Condition', contract.loadingCondition],
    ['Payment Terms', contract.paymentTerms],
    ['GST', `${contract.gstPercent}% Extra as per Government Rules`]
  ];

  if (includeTotalValue) {
    commRows.splice(2, 0, ['Total Value', `Rs. ${totalValue.toLocaleString('en-IN')}`]);
  }

  if (contract.otherTerms) {
    commRows.push(['Other Terms', contract.otherTerms]);
  }

  if (contract.loadingDeadline) {
    commRows.push(['Loading Deadline', format(new Date(contract.loadingDeadline), 'dd MMMM yyyy')]);
  }

  autoTable(doc, {
    startY: y,
    body: commRows,
    theme: 'plain',
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
  y = (doc as any).lastAutoTable.finalY + 8;

  // === TERMS & CONDITIONS ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
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
  doc.setFontSize(8);
  doc.setTextColor(...DARK);

  terms.forEach((term, index) => {
    const num = `${index + 1}. `;
    const text = num + term;
    const splitText = doc.splitTextToSize(text, W - 6);
    doc.text(splitText, M + 2, y);
    y += (splitText.length * 3.5) + 1;
  });

  y += 6;

  // === FOOTER ===
  if (y > PH - 40) {
    doc.addPage();
    y = M;
  }

  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.line(M, y, PW - M, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text(settings.legalName, M, y);

  if (settings.signature) {
    try {
      doc.addImage(settings.signature, 'PNG', PW - M - 45, y - 6, 40, 16);
    } catch (e) {
      // skip
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Authorized Signature', PW - M, y, { align: 'right' });
  y += 5;
  doc.text(`For, ${settings.name}`, M, y);

  // Page border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.rect(M - 2, 48, W + 4, PH - 50, 'D');

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

  const RED: RGB = [180, 30, 60];
  const GRAY: RGB = [100, 100, 100];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...RED);
  doc.text(settings.name, 105, y, { align: 'center' });
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text('Brokerage Bill', 105, y, { align: 'center' });
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Period: ${bill.month}/${bill.year}`, M, y);
  doc.text(`Generated: ${format(new Date(bill.generatedAt?.toDate ? bill.generatedAt.toDate() : bill.generatedAt), 'dd/MM/yyyy')}`, 198, y, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Party: ${bill.party.legalName}`, M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  if (bill.party.gstin) doc.text(`GSTIN: ${bill.party.gstin}`, M, y);
  y += 8;

  const tableData = (bill.contracts || []).map((c: any) => [
    c.contractNo,
    format(new Date(c.date), 'dd/MM/yyyy'),
    c.product?.name || '',
    `${c.quantity} ${c.quantityUnit}`,
    `Rs.${c.price.toLocaleString('en-IN')}`,
    `Rs.${(c.brokerageAmount || 0).toLocaleString('en-IN')}`
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
