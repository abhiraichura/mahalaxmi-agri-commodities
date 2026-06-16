import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings, BrokerageBill, BillPayment } from '../types';
import { format } from 'date-fns';

type RGB = [number, number, number];
const c = (r: number, g: number, b: number): RGB => [r, g, b];

// Professional Color Palette
const BLACK = c(20, 20, 20);
const DARK = c(60, 60, 60);
const GRAY = c(120, 120, 120);
const BRAND = c(160, 30, 50); // Professional deep maroon for accents
const LIGHT = c(248, 249, 250); // Very soft gray for table backgrounds
const BORDER = c(225, 230, 235); // Subtle border lines

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

const toKg = (quantity: number, unit: string): number => {
  if (unit === 'MT') return quantity * 1000;
  return quantity;
};

// Reusable Section Header Style
const renderSectionHeader = (doc: jsPDF, title: string, x: number, y: number, w: number): number => {
  doc.setFillColor(...LIGHT);
  doc.rect(x, y, w, 8, 'F');
  
  // Left Accent Line
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.8);
  doc.line(x, y, x, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(title.toUpperCase(), x + 4, y + 5.5);
  
  return y + 12;
};

export const generateContractPDF = (
  contract: Contract,
  settings: CompanySettings,
  type: 'buyer_copy' | 'seller_copy' | 'broker_copy',
  options: { showTotalValue?: boolean; isDownload?: boolean } = {}
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const PW = 210;
  const PH = 297;
  const M = 15; // Clean, wide margins
  const W = PW - M * 2;

  // Render Letterhead ONLY if downloading
  if (options.isDownload && (settings as any).letterhead) {
    try {
      const lh = (settings as any).letterhead;
      const imgFormat = lh.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(lh, imgFormat, 0, 0, 210, 50);
    } catch (e) {
      console.error('Failed to add letterhead', e);
    }
  }

  // LETTERHEAD GAP: Leave 55mm blank for the pre-printed design
  let y = 55; 

  // ─── DOCUMENT TITLE & META ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  doc.text('CONTRACT NOTE', PW / 2, y, { align: 'center' });
  
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  
  const contractNo = `${contract.contractNo} / ${contract.financialYear || contract.year}`;
  const contractDate = format(new Date(contract.date), 'dd/MM/yyyy');
  
  doc.text(`No: `, PW / 2 - 20, y, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(contractNo, PW / 2 - 18, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`Date: `, PW / 2 + 10, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(contractDate, PW / 2 + 20, y);
  
  y += 8;

  // ─── PARTIES SECTION ───
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(M, y, PW - M, y); // Top framing line
  y += 5;

  const colW = (W / 2) - 5;
  const midX = PW / 2;

  const renderParty = (party: any, label: string, startX: number, startY: number) => {
    let cy = startY;
    
    // Role Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND);
    doc.text(label.toUpperCase(), startX, cy);
    cy += 5;

    // Company Name
    doc.setTextColor(...BLACK);
    doc.setFontSize(11);
    doc.text(party.legalName, startX, cy);
    cy += 4.5;

    // Address & Info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    
    const addrLines = wrapText(doc, party.address, colW);
    addrLines.forEach(line => {
      doc.text(line, startX, cy);
      cy += 4;
    });
    
    doc.text(`${party.city}, ${party.state} - ${party.pincode}`, startX, cy);
    cy += 5;

    // Identifiers
    doc.setFontSize(8);
    if (party.gstin) {
      doc.setTextColor(...GRAY);
      doc.text(`GSTIN: `, startX, cy);
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      doc.text(party.gstin, startX + 11, cy);
      doc.setFont('helvetica', 'normal');
      cy += 4;
    }
    if (party.phone) {
      doc.setTextColor(...GRAY);
      doc.text(`Phone: `, startX, cy);
      doc.setTextColor(...DARK);
      doc.text(party.phone, startX + 11, cy);
      cy += 4;
    }
    return cy;
  };

  const leftParty = type === 'buyer_copy' ? contract.buyer : contract.seller;
  const rightParty = type === 'buyer_copy' ? contract.seller : contract.buyer;
  const leftLabel = type === 'buyer_copy' ? 'Buyer' : 'Seller';
  const rightLabel = type === 'buyer_copy' ? 'Seller' : 'Buyer';

  const leftY = renderParty(leftParty, leftLabel, M, y);
  const rightY = renderParty(rightParty, rightLabel, midX + 5, y);

  y = Math.max(leftY, rightY) + 4;
  
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(M, y, PW - M, y); // Bottom framing line
  y += 6;

  // ─── PRODUCT & SPECS ───
  y = renderSectionHeader(doc, `PRODUCT: ${contract.product.name}`, M, y, W);

  if (contract.product.specs && contract.product.specs.length > 0) {
    const specRows = contract.product.specs
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(spec => [spec.label, `${spec.value} ${spec.unit || ''}`.trim()]);

    autoTable(doc, {
      startY: y - 2,
      body: specRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: DARK,
        lineColor: BORDER,
        lineWidth: 0.1,
        cellPadding: { top: 2, right: 3, bottom: 2, left: 3 }
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', textColor: GRAY, fillColor: [252, 253, 254] },
        1: { cellWidth: 'auto' }
      },
      margin: { left: M, right: M },
      tableWidth: W
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── COMMERCIAL TERMS ───
  y = renderSectionHeader(doc, 'COMMERCIAL TERMS', M, y, W);

  const quantityKg = toKg(contract.quantity, contract.quantityUnit);
  const totalValue = quantityKg * contract.price;
  const showTotal = options.showTotalValue || type === 'broker_copy';

  const commRows: any[] = [
    ['Quantity', `${contract.quantity} ${contract.quantityUnit}${contract.quantityUnit === 'MT' ? ` (${quantityKg.toLocaleString('en-IN')} KG)` : ''}`],
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
    startY: y - 2,
    body: commRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.1,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', textColor: DARK, fillColor: [250, 251, 252] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: M, right: M },
    tableWidth: W
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── TERMS & CONDITIONS ───
  y = renderSectionHeader(doc, 'TERMS & CONDITIONS', M, y, W);

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

  const footerReserve = 35; // Professional footer space
  const maxY = PH - footerReserve;

  terms.forEach((term, index) => {
    const text = `${index + 1}.  ${term}`;
    const splitText = wrapText(doc, text, W - 2);
    const termHeight = splitText.length * 4;

    // Font scaling gracefully if tight
    if (y + termHeight > maxY && doc.getFontSize() > 6) {
      doc.setFontSize(6.5);
    }

    doc.text(splitText, M + 1, y);
    y += termHeight + 1.5;
  });

  // ─── FOOTER & SIGNATURE ───
  const footerY = PH - 30;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(M, footerY, PW - M, footerY);

  // Document Type Indicator (Bottom Left)
  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text(`** ${copyLabel} **`, M, footerY + 6);

  // Signatory Block (Bottom Right)
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(`For, ${settings.name}`, PW - M, footerY + 5, { align: 'right' });

  if (settings.signature) {
    try {
      doc.addImage(settings.signature, 'PNG', PW - M - 30, footerY + 7, 28, 10);
    } catch (e) {
      // safe fallback
    }
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Authorized Signatory', PW - M, footerY + 20, { align: 'right' });

  return doc;
};


export const generateBrokerageBillPDF = (
  bill: any,
  settings: CompanySettings,
  options: { isDownload?: boolean } = {}
): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210;
  const M = 15;
  const W = PW - M * 2;
  
  if (options.isDownload && (settings as any).letterhead) {
    try {
      const lh = (settings as any).letterhead;
      const imgFormat = lh.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(lh, imgFormat, 0, 0, 210, 50);
    } catch (e) {
      console.error('Failed to add letterhead', e);
    }
  }

  // LETTERHEAD GAP: Also leave 55mm blank for the pre-printed design
  let y = 55;

  // ─── TITLE & META ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  doc.text('BROKERAGE BILL', PW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);

  let periodText = '';
  if (bill.month && bill.month > 0) {
    periodText = `Period: ${bill.month}/${bill.year}`;
  } else if (bill.fromDate && bill.toDate) {
    periodText = `Period: ${format(new Date(bill.fromDate), 'dd/MM/yyyy')} - ${format(new Date(bill.toDate), 'dd/MM/yyyy')}`;
  } else {
    periodText = `Period: ${bill.year}`;
  }

  doc.text(periodText, M, y);
  doc.text(`Generated: ${format(new Date(bill.generatedAt?.toDate ? bill.generatedAt.toDate() : bill.generatedAt), 'dd/MM/yyyy')}`, PW - M, y, { align: 'right' });
  y += 6;

  // ─── BILLED TO ───
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(M, y, PW - M, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND);
  doc.text('BILLED TO', M, y);
  y += 5;

  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(bill.party.legalName, M, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  if (bill.party.address) {
    doc.text(`${bill.party.address}, ${bill.party.city}, ${bill.party.state}`, M, y);
    y += 4;
  }
  if (bill.party.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text(`GSTIN: `, M, y);
    doc.setTextColor(...DARK);
    doc.text(bill.party.gstin, M + 12, y);
    y += 4;
  }
  y += 2;

  // ─── FINANCIAL SUMMARY ───
  if (bill.status || bill.paidAmount > 0) {
    doc.setFillColor(...LIGHT);
    doc.rect(M, y, W, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const statusText = bill.status === 'paid' ? 'PAID' : bill.status === 'partial' ? 'PARTIALLY PAID' : 'PENDING';
    
    doc.setTextColor(...(bill.status === 'paid' ? [30, 130, 70] as RGB : BRAND));
    doc.text(`Status: ${statusText}`, M + 4, y + 6.5);

    doc.setTextColor(...BLACK);
    if (bill.paidAmount > 0) {
      doc.text(`Paid: Rs. ${bill.paidAmount.toLocaleString('en-IN')}`, PW / 2, y + 6.5, { align: 'center' });
    }
    
    doc.setFontSize(10);
    if (bill.balanceAmount > 0) {
      doc.setTextColor(...BRAND);
      doc.text(`Balance Due: Rs. ${bill.balanceAmount.toLocaleString('en-IN')}`, PW - M - 4, y + 6.5, { align: 'right' });
    }
    y += 14;
  }

  // ─── CONTRACTS TABLE ───
  const tableData = (bill.contracts || []).map((c: any) => [
    c.contractNo,
    format(new Date(c.date), 'dd/MM/yyyy'),
    c.product?.name || '',
    `${c.quantity} ${c.quantityUnit}`,
    c.price.toLocaleString('en-IN'),
    c.brokerageAmount.toLocaleString('en-IN')
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Contract', 'Date', 'Product', 'Quantity', 'Price (Rs.)', 'Brokerage (Rs.)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [248, 249, 250],
      textColor: [80, 80, 80],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: BORDER,
      lineWidth: 0.1
    },
    bodyStyles: { 
      fontSize: 8.5,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.1,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold', textColor: DARK }
    },
    margin: { left: M, right: M },
    tableWidth: W
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  
  // Total Banner
  doc.setFillColor(...LIGHT);
  doc.rect(PW - M - 80, finalY, 80, 10, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Total Brokerage:', PW - M - 76, finalY + 6.5);
  doc.setTextColor(...BRAND);
  doc.text(`Rs. ${bill.totalBrokerage.toLocaleString('en-IN')}`, PW - M - 4, finalY + 6.5, { align: 'right' });

  // ─── PAYMENT HISTORY ───
  if (bill.payments && bill.payments.length > 0) {
    let payY = finalY + 18;
    payY = renderSectionHeader(doc, 'PAYMENT HISTORY', M, payY, W);

    const paymentRows = bill.payments.map((p: BillPayment) => [
      format(new Date(p.date), 'dd/MM/yyyy'),
      p.mode.replace('_', ' ').toUpperCase(),
      p.reference || '-',
      p.amount.toLocaleString('en-IN')
    ]);

    autoTable(doc, {
      startY: payY - 2,
      head: [['Date', 'Mode', 'Reference', 'Amount (Rs.)']],
      body: paymentRows,
      theme: 'grid',
      headStyles: {
        fillColor: [250, 250, 250],
        textColor: GRAY,
        fontStyle: 'bold',
        fontSize: 8,
        lineWidth: 0.1,
        lineColor: BORDER
      },
      bodyStyles: { 
        fontSize: 8.5, 
        textColor: DARK,
        lineWidth: 0.1,
        lineColor: BORDER
      },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: M, right: M },
      tableWidth: W
    });
  }

  // Footer text
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...GRAY);
  doc.text('This is a computer generated bill.', PW / 2, 285, { align: 'center' });

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const getPDFBlob = (doc: jsPDF): Blob => {
  return doc.output('blob');
};
