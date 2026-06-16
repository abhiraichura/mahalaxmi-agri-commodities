import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings, BrokerageBill, BillPayment } from '../types';
import { format } from 'date-fns';

// --- Modern Soft Color Palette ---
const TEXT_DARK: [number, number, number] = [40, 45, 50];       // Dark Slate (Softer than pure black)
const TEXT_MUTED: [number, number, number] = [107, 114, 128];   // Soft Gray for labels
const BORDER_COLOR: [number, number, number] = [229, 231, 235]; // Very light gray borders
const BG_HEADER: [number, number, number] = [249, 250, 251];    // Subtle off-white background

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

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
  const M = 15;
  const W = PW - M * 2;

  // ─── LETTERHEAD AREA (Top 55mm) ───
  if (options.isDownload && (settings as any).letterhead) {
    try {
      const lh = (settings as any).letterhead;
      const imgFormat = lh.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(lh, imgFormat, 0, 0, 210, 55);
    } catch (e) {
      console.error('Failed to add letterhead', e);
    }
  }

  let y = 60; // Start below the letterhead

  // ─── HEADER BAR (Contract Note, No, Date) ───
  doc.setFillColor(...BG_HEADER);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.rect(M, y, W, 12, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('No:', M + 4, y + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text(contract.contractNo, M + 11, y + 7.5);

  doc.setFontSize(12);
  doc.text('CONTRACT NOTE', PW / 2, y + 7.5, { align: 'center', renderingMode: 'fill' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Date:', PW - M - 28, y + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text(format(new Date(contract.date), 'dd-MM-yyyy'), PW - M - 18, y + 7.5);

  y += 17;

  // ─── PARTIES SECTION (Seller & Buyer) ───
  // Outer box for parties
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  
  const partyBoxY = y;
  let leftY = y + 6;
  let rightY = y + 6;
  const midX = PW / 2;

  const renderParty = (party: any, label: string, startX: number, currentY: number) => {
    let cy = currentY;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label.toUpperCase(), startX, cy);
    cy += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    const nameLines = doc.splitTextToSize(party.legalName, (W / 2) - 10);
    doc.text(nameLines, startX, cy);
    cy += nameLines.length * 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    
    if (party.address) {
      const addrLines = doc.splitTextToSize(party.address, (W / 2) - 10);
      doc.text(addrLines, startX, cy);
      cy += addrLines.length * 4.5;
    }

    if (party.city || party.state) {
      doc.text(`${party.city || ''}${party.city && party.state ? ', ' : ''}${party.state || ''}`, startX, cy);
      cy += 5;
    }

    if (party.gstin) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text('GSTIN:', startX, cy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT_DARK);
      doc.text(party.gstin, startX + 13, cy);
      cy += 5;
    }

    if (party.pan) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text('PAN:', startX, cy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT_DARK);
      doc.text(party.pan, startX + 13, cy);
      cy += 5;
    }

    return cy;
  };

  leftY = renderParty(contract.seller, 'Seller', M + 4, leftY);
  rightY = renderParty(contract.buyer, 'Buyer', midX + 4, rightY);

  const partiesHeight = Math.max(leftY, rightY) - partyBoxY + 4;
  
  // Draw boxes around parties
  doc.rect(M, partyBoxY, W / 2, partiesHeight);
  doc.rect(midX, partyBoxY, W / 2, partiesHeight);

  y = partyBoxY + partiesHeight + 5;

  // ─── CONTRACT DETAILS TABLE ───
  const specArray = contract.contractSpecs || contract.product.specs || [];
  let specText = specArray.map((s: any) => `${s.value} ${s.unit || ''}`.trim()).join(', ');
  if (!specText) specText = 'CRUSHING QUALITY AS PER SAMPLE';

  const qtyKg = contract.quantityUnit === 'MT' ? contract.quantity * 1000 : contract.quantity;
  let qtyText = `${contract.quantity} ${contract.quantityUnit}`;
  if (contract.packing && contract.packing.includes('50') && contract.quantityUnit === 'MT') {
     qtyText = `${(qtyKg / 50).toFixed(0)} bags X 50 Kg = ${qtyKg.toLocaleString('en-IN')} Kg`;
  } else if (contract.quantityUnit === 'MT') {
     qtyText = `${contract.quantity} MT = ${qtyKg.toLocaleString('en-IN')} Kg`;
  }

  const detailsRows: string[][] = [
    ['Product', contract.product.name],
    ['Specification', specText],
    ['Quantity', qtyText],
    ['Price', `${contract.price} Per ${contract.priceUnit}`],
    ['Packing', contract.packing || '50 KG PACKING'],
    ['Delivery At', contract.deliveryLocation || 'Ex Factory'],
    ['Loading Condition', contract.loadingCondition || 'GOODS TO BE LOADED WITHIN ONE WEEK'],
    ['Payment', contract.paymentTerms || 'Ready Payment'],
  ];

  if (type === 'broker_copy' || options.showTotalValue) {
    if (contract.brokerageAmount) {
      detailsRows.push(['Brokerage', `Rs. ${contract.brokerageAmount.toLocaleString('en-IN')}`]);
    }
  }

  detailsRows.push(['Other Terms', contract.otherTerms || `AS PER GOVERMENT RULE, "${contract.gstPercent}% GST" EXTRA.`]);

  autoTable(doc, {
    startY: y,
    body: detailsRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      textColor: TEXT_DARK,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 }
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', textColor: TEXT_MUTED, fillColor: BG_HEADER },
      1: { cellWidth: 'auto' }
    },
    margin: { left: M, right: M },
    tableWidth: W
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── TERMS & CONDITIONS ───
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text('TERMS & CONDITIONS', M, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);

  const termsList = settings.termsAndConditions.length > 0 ? settings.termsAndConditions : [
      'FROM AS PER REQUIREMENT & BILL LEADING MUST ON PER BILL',
      'WE HAVE FULL POWER TO SETTLE ALL CLAIMS AMICABLY WILL BIND BOTH BUYER AND SELLER EQUALLY.',
      'BARGAINS MUST BE DESPATCHED IN TIME & ACCORDING TO CONDITION.',
      'AFTER DESPATCHING OF BARGAINS INTIMATION MUST BE GIVE TO US.',
      'IF ANY BARGAIN CANCELLED DUE TO ANY TIME LIMIT LOADING CONDITION OR ANY GOVT. RESTICTION.',
      'OUR BROKERAGE WILL BE CHARGED AS USUALY.',
      'THIS CONTRACT SUBJECT TO RESPONSIBILITY OF BOTH PARTIES AND EFFECTED AS A BROKER OF BOTH PARTIES WITH OUT ANY LIABILITIES.'
  ];

  termsList.forEach(term => {
      const splitText = doc.splitTextToSize(`•  ${term}`, W);
      doc.text(splitText, M, y);
      y += splitText.length * 4.5;
  });

  // ─── SIGNATURE BLOCK ───
  const footerY = PH - 35;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text(`For, ${settings.name || 'Mahalaxmi Agri Commodities'}`, PW - M, footerY, { align: 'right' });

  if (settings.signature) {
      try {
          doc.addImage(settings.signature, 'PNG', PW - M - 40, footerY + 2, 40, 15);
      } catch(e) {}
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('AUTHORISED SIGNATURE', PW - M, footerY + 22, { align: 'right' });

  // Document Type Indicator (Bottom Left)
  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 180, 180);
  doc.text(`** ${copyLabel} **`, M, footerY + 22);

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
      doc.addImage(lh, imgFormat, 0, 0, 210, 55);
    } catch (e) {}
  }

  let y = 65;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...TEXT_DARK);
  doc.text('BROKERAGE BILL', PW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);

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

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.line(M, y, PW - M, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('BILLED TO', M, y);
  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text(bill.party.legalName, M, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  if (bill.party.address) {
    doc.text(`${bill.party.address}, ${bill.party.city}, ${bill.party.state}`, M, y);
    y += 5;
  }
  if (bill.party.gstin) {
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`GSTIN: `, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text(bill.party.gstin, M + 13, y);
    y += 5;
  }
  y += 2;

  if (bill.status || bill.paidAmount > 0) {
    doc.setFillColor(...BG_HEADER);
    doc.setDrawColor(...BORDER_COLOR);
    doc.rect(M, y, W, 10, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const statusText = bill.status === 'paid' ? 'PAID' : bill.status === 'partial' ? 'PARTIALLY PAID' : 'PENDING';
    
    if (bill.status === 'paid') {
      doc.setTextColor(22, 163, 74); // Success green
    } else {
      doc.setTextColor(225, 29, 72); // Rose red
    }
    
    doc.text(`Status: ${statusText}`, M + 4, y + 6.5);

    doc.setTextColor(...TEXT_DARK);
    if (bill.paidAmount > 0) {
      doc.text(`Paid: Rs. ${bill.paidAmount.toLocaleString('en-IN')}`, PW / 2, y + 6.5, { align: 'center' });
    }
    
    doc.setFontSize(10);
    if (bill.balanceAmount > 0) {
      doc.text(`Balance Due: Rs. ${bill.balanceAmount.toLocaleString('en-IN')}`, PW - M - 4, y + 6.5, { align: 'right' });
    }
    y += 14;
  }

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
      fillColor: BG_HEADER,
      textColor: TEXT_MUTED,
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2
    },
    bodyStyles: { 
      fontSize: 8.5,
      textColor: TEXT_DARK,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
      cellPadding: 4
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: M, right: M },
    tableWidth: W
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  
  doc.setFillColor(...BG_HEADER);
  doc.setDrawColor(...BORDER_COLOR);
  doc.rect(PW - M - 80, finalY, 80, 10, 'FD');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Total Brokerage:', PW - M - 76, finalY + 6.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Rs. ${bill.totalBrokerage.toLocaleString('en-IN')}`, PW - M - 4, finalY + 6.5, { align: 'right' });

  if (bill.payments && bill.payments.length > 0) {
    let payY = finalY + 18;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('PAYMENT HISTORY', M, payY);
    payY += 4;

    const paymentRows = bill.payments.map((p: BillPayment) => [
      format(new Date(p.date), 'dd/MM/yyyy'),
      p.mode.replace('_', ' ').toUpperCase(),
      p.reference || '-',
      p.amount.toLocaleString('en-IN')
    ]);

    autoTable(doc, {
      startY: payY,
      head: [['Date', 'Mode', 'Reference', 'Amount (Rs.)']],
      body: paymentRows,
      theme: 'grid',
      headStyles: {
        fillColor: BG_HEADER,
        textColor: TEXT_MUTED,
        fontStyle: 'bold',
        fontSize: 8.5,
        lineWidth: 0.2,
        lineColor: BORDER_COLOR
      },
      bodyStyles: { 
        fontSize: 8.5, 
        textColor: TEXT_DARK,
        lineWidth: 0.2,
        lineColor: BORDER_COLOR
      },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: M, right: M },
      tableWidth: W
    });
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('This is a computer generated bill.', PW / 2, 285, { align: 'center' });

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const getPDFBlob = (doc: jsPDF): Blob => {
  return doc.output('blob');
};
