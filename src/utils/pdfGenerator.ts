// src/utils/pdfGenerator.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings, BrokerageBill, BillPayment } from '../types';
import { format } from 'date-fns';

const BORDER_DARK: [number, number, number] = [0, 0, 0];
const BORDER_LIGHT: [number, number, number] = [200, 200, 200];
const BG_GRAY: [number, number, number] = [242, 242, 242];
const TEXT_BLACK: [number, number, number] = [0, 0, 0];
const TEXT_GRAY: [number, number, number] = [80, 80, 80];

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
  const M = 15;
  const W = PW - M * 2;
  let startY = 15;

  if (options.isDownload && (settings as any).letterhead) {
    try {
      const lh = (settings as any).letterhead;
      const imgFormat = lh.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(lh, imgFormat, 0, 0, 210, 55);
      startY = 58;
    } catch (e) {
      console.error('Failed to add letterhead', e);
    }
  }

  const endY = 282;

  // Outer Frame
  doc.setDrawColor(...BORDER_DARK);
  doc.setLineWidth(0.4);
  doc.rect(M, startY, W, endY - startY);

  // Header Bar
  doc.setFillColor(...BG_GRAY);
  doc.rect(M, startY, W, 10, 'FD');
  
  // Vertical Dividers for Header
  doc.setDrawColor(...BORDER_DARK);
  doc.setLineWidth(0.4);
  doc.line(M + 45, startY, M + 45, startY + 10);
  doc.line(PW - M - 45, startY, PW - M - 45, startY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_BLACK);
  doc.text(`NO.: ${contract.contractNo}`, M + 4, startY + 6.5);
  
  doc.setFontSize(12);
  doc.text('CONTRACT NOTE', PW / 2, startY + 6.5, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`DATE: ${format(new Date(contract.date), 'dd-MM-yyyy')}`, PW - M - 4, startY + 6.5, { align: 'right' });

  // Divider below header
  doc.line(M, startY + 10, PW - M, startY + 10);

  // Parties Section
  const isBuyerLeft = type === 'buyer_copy';
  const leftPartyType = isBuyerLeft ? 'BUYER' : 'SELLER';
  const rightPartyType = isBuyerLeft ? 'SELLER' : 'BUYER';
  const leftPartyData = isBuyerLeft ? contract.buyer : contract.seller;
  const rightPartyData = isBuyerLeft ? contract.seller : contract.buyer;

  let leftY = startY + 15;
  let rightY = startY + 15;

  const renderParty = (title: string, party: any, xPos: number, yPos: number, maxWidth: number) => {
    let currentY = yPos;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, xPos, currentY);
    doc.text(`: ${party.legalName}`, xPos + 22, currentY);
    currentY += 5;

    if (party.address) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const addrLines = doc.splitTextToSize(party.address.trim(), maxWidth - 24);
      doc.text(addrLines, xPos + 24, currentY);
      currentY += addrLines.length * 4.5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CITY', xPos, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${party.city || ''}`, xPos + 22, currentY);
    currentY += 5;

    if (party.gstin) {
      doc.setFont('helvetica', 'bold');
      doc.text('GSTIN NO.', xPos, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${party.gstin}`, xPos + 22, currentY);
      currentY += 5;
    }

    if (party.pan) {
      doc.setFont('helvetica', 'bold');
      doc.text('PAN NO.', xPos, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${party.pan}`, xPos + 22, currentY);
      currentY += 5;
    }
    
    return currentY;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('|| Shreenathji Satya Chhe ||', PW * 0.75, rightY - 2, { align: 'center' });
  rightY += 3;

  leftY = renderParty(leftPartyType, leftPartyData, M + 4, leftY, W / 2 - 8);
  rightY = renderParty(rightPartyType, rightPartyData, PW / 2 + 4, rightY, W / 2 - 8);

  const partiesBottomY = Math.max(leftY, rightY) + 3;

  // Center vertical line and bottom horizontal line for parties
  doc.setDrawColor(...BORDER_DARK);
  doc.setLineWidth(0.2);
  doc.line(PW / 2, startY + 10, PW / 2, partiesBottomY);
  doc.line(M, partiesBottomY, PW - M, partiesBottomY);

  // Contract Details Section
  const validSpecs = (contract.contractSpecs || contract.product.specs || []).filter((s: any) => s.value && s.value.toString().trim() !== '');
  let specText = validSpecs.map((s: any) => `${s.label ? `${s.label} ` : ''}${s.value} ${s.unit || ''}`.trim()).join(', ');
  if (!specText) specText = 'CRUSHING QUALITY AS PER SAMPLE';

  const qtyKg = contract.quantityUnit === 'MT' ? contract.quantity * 1000 : contract.quantity;
  let qtyText = `${contract.quantity} ${contract.quantityUnit}`;
  if (contract.packing && contract.packing.includes('50') && contract.quantityUnit === 'MT') {
     qtyText = `${(qtyKg / 50).toFixed(0)} bags X 50 Kg = ${qtyKg.toLocaleString('en-IN')} Kg`;
  } else if (contract.quantityUnit === 'MT') {
     qtyText = `${contract.quantity} MT = ${qtyKg.toLocaleString('en-IN')} Kg`;
  }

  const detailsData = [
    ['PRODUCT', ':', contract.product.name],
    ['SPECIFICATION', ':', specText],
    ['QUANTITY', ':', qtyText],
    ['PRICE', ':', `${contract.price} Per ${contract.priceUnit}`],
    ['PACKING', ':', contract.packing || '50 KG PACKING'],
    ['DELIVERY AT', ':', contract.deliveryLocation || 'Ex Factory'],
    ['LOADING CONDITION', ':', contract.loadingCondition || 'GOODS TO BE LOADED WITHIN ONE WEEK'],
    ['PAYMENT', ':', contract.paymentTerms || 'Ready Payment']
  ];

  if (type === 'broker_copy' || options.showTotalValue) {
    detailsData.push(['BROKERAGE', ':', contract.brokerageAmount ? contract.brokerageAmount.toString() : '']);
  }
  
  detailsData.push(['OTHER TERMS', ':', contract.otherTerms || `AS PER GOVERMENT RULE, "${contract.gstPercent}% GST" EXTRA.`]);

  autoTable(doc, {
    startY: partiesBottomY + 2,
    body: detailsData,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      textColor: TEXT_BLACK,
      cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 }
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { fontStyle: 'bold', cellWidth: 5, halign: 'center' },
      2: { cellWidth: 'auto' }
    },
    margin: { left: M, right: M }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 2;

  // Separator before Terms
  doc.setDrawColor(...BORDER_DARK);
  doc.setLineWidth(0.2);
  doc.line(M, currentY, PW - M, currentY);

  // Terms & Conditions Header
  doc.setFillColor(...BG_GRAY);
  doc.rect(M, currentY, W, 8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TERMS & CONDITIONS', PW / 2, currentY + 5.5, { align: 'center' });
  
  currentY += 8;
  doc.line(M, currentY, PW - M, currentY);

  const termsList = settings.termsAndConditions.length > 0 ? settings.termsAndConditions : [
      'FROM AS PER REQUIREMENT & BILL LEADING MUST ON PER BILL',
      'WE HAVE FULL POWER TO SETTLE ALL CLAIMS AMICABLY WILL BIND BOTH BUYER AND SELLER EQUALLY.',
      'BARGAINS MUST BE DESPATCHED IN TIME & ACCORDING TO CONDITION.',
      'AFTER DESPATCHING OF BARGAINS INTIMATION MUST BE GIVE TO US.',
      'IF ANY BARGAIN CANCELLED DUE TO ANY TIME LIMIT LOADING CONDITION OR ANY GOVT. RESTICTION.',
      'OUR BROKERAGE WILL BE CHARGED AS USUALY.',
      'THIS CONTRACT SUBJECT TO RESPONSIBILITY OF BOTH PARTIES AND EFFECTED AS A BROKER OF BOTH PARTIES WITH OUT ANY LIABILITIES.'
  ];

  const termsMapped = termsList.map((t, i) => [`${i + 1}.`, t]);

  autoTable(doc, {
    startY: currentY + 2,
    body: termsMapped,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: TEXT_BLACK,
      cellPadding: { top: 1.5, right: 4, bottom: 1.5, left: 4 }
    },
    columnStyles: {
      0: { cellWidth: 8, fontStyle: 'bold', halign: 'right' },
      1: { cellWidth: 'auto', halign: 'justify' }
    },
    margin: { left: M, right: M }
  });

  // Footer Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`For, ${settings.name || 'Mahalaxmi Agri Commodities'}`, PW - M - 4, endY - 26, { align: 'right' });

  if (settings.signature) {
      try {
          doc.addImage(settings.signature, 'PNG', PW - M - 45, endY - 24, 40, 14);
      } catch(e) {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('AUTHORISED SIGNATURE', PW - M - 4, endY - 6, { align: 'right' });

  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_GRAY);
  doc.text(`** ${copyLabel} **`, M + 4, endY - 6);

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
  doc.setTextColor(...TEXT_BLACK);
  doc.text('BROKERAGE BILL', PW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_GRAY);

  let periodText = '';
  if (bill.month && bill.month > 0) {
    periodText = `Period: ${bill.month}/${bill.year}`;
  } else if (bill.fromDate && bill.toDate) {
    periodText = `Period: ${format(new Date(bill.fromDate), 'dd/MM/yyyy')} - ${format(new Date(bill.toDate), 'dd/MM/yyyy')}`;
  } else {
    periodText = `Period: ${bill.year}`;
  }

  const generatedDate = bill.generatedAt?.toDate ? bill.generatedAt.toDate() : new Date(bill.generatedAt || Date.now());

  doc.text(periodText, M, y);
  doc.text(`Generated: ${format(generatedDate, 'dd/MM/yyyy')}`, PW - M - 4, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(M, y, PW - M, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_GRAY);
  doc.text('BILLED TO', M, y);
  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(...TEXT_BLACK);
  doc.text(bill.party.legalName, M, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_BLACK);
  if (bill.party.address) {
    doc.text(`${bill.party.address}, ${bill.party.city || ''}`, M, y);
    y += 5;
  }
  if (bill.party.gstin) {
    doc.setTextColor(...TEXT_GRAY);
    doc.text(`GSTIN: `, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_BLACK);
    doc.text(bill.party.gstin, M + 13, y);
    y += 5;
  }
  y += 4;

  if (bill.status || bill.paidAmount > 0) {
    doc.setFillColor(...BG_GRAY);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.rect(M, y, W, 10, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const statusText = bill.status === 'paid' ? 'PAID' : bill.status === 'partial' ? 'PARTIALLY PAID' : 'PENDING';
    
    if (bill.status === 'paid') {
      doc.setTextColor(22, 163, 74); 
    } else {
      doc.setTextColor(225, 29, 72); 
    }
    
    doc.text(`Status: ${statusText}`, M + 4, y + 6.5);

    doc.setTextColor(...TEXT_BLACK);
    if (bill.paidAmount > 0) {
      doc.text(`Paid: Rs. ${bill.paidAmount.toLocaleString('en-IN')}`, PW / 2, y + 6.5, { align: 'center' });
    }
    
    doc.setFontSize(10);
    if (bill.balanceAmount > 0) {
      doc.text(`Balance Due: Rs. ${bill.balanceAmount.toLocaleString('en-IN')}`, PW - M - 4, y + 6.5, { align: 'right' });
    }
    y += 16;
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
      fillColor: BG_GRAY,
      textColor: TEXT_BLACK,
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: BORDER_LIGHT,
      lineWidth: 0.2
    },
    bodyStyles: { 
      fontSize: 8.5,
      textColor: TEXT_BLACK,
      lineColor: BORDER_LIGHT,
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
  
  doc.setFillColor(...BG_GRAY);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.rect(PW - M - 80, finalY, 80, 10, 'FD');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_GRAY);
  doc.text('Total Brokerage:', PW - M - 76, finalY + 6.5);
  doc.setTextColor(...TEXT_BLACK);
  doc.text(`Rs. ${bill.totalBrokerage.toLocaleString('en-IN')}`, PW - M - 4, finalY + 6.5, { align: 'right' });

  if (bill.payments && bill.payments.length > 0) {
    let payY = finalY + 18;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_GRAY);
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
        fillColor: BG_GRAY,
        textColor: TEXT_BLACK,
        fontStyle: 'bold',
        fontSize: 8.5,
        lineWidth: 0.2,
        lineColor: BORDER_LIGHT
      },
      bodyStyles: { 
        fontSize: 8.5, 
        textColor: TEXT_BLACK,
        lineWidth: 0.2,
        lineColor: BORDER_LIGHT
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
  doc.setTextColor(...TEXT_GRAY);
  doc.text('This is a computer generated bill.', PW / 2, 285, { align: 'center' });

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const getPDFBlob = (doc: jsPDF): Blob => {
  return doc.output('blob');
};
