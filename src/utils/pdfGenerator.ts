import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Contract, CompanySettings } from '../types';

// Brand colors
const BRAND = {
  primary: '#ed1879',
  primaryLight: '#fce4ef',
  primaryMid: '#f8bbd0',
  black: '#000000',
  darkGray: '#333333',
  gray: '#666666',
  lightGray: '#f5f5f5',
  white: '#ffffff',
};

// Helper to convert hex to RGB for jsPDF
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function generateContractPDF(
  contract: Contract,
  settings: CompanySettings,
  type: 'buyer_copy' | 'seller_copy' | 'broker_copy'
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Use Helvetica (closest to Barlow in jsPDF built-in fonts)
  doc.setFont('helvetica', 'normal');

  let y = 12;

  // ─── HEADER ───
  // Top logo if available
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', margin, y, 25, 12);
    } catch (e) {
      // Logo failed to load, skip
    }
  }

  // Company name
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text(settings.legalName || settings.name || 'MAHALAXMI AGRI COMMODITIES', margin + (settings.logo ? 30 : 0), y + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.gray).r, hexToRgb(BRAND.gray).g, hexToRgb(BRAND.gray).b);
  const addrLines = [
    settings.address,
    `${settings.city}${settings.state ? ', ' + settings.state : ''}`,
    `GSTIN: ${settings.gstin || ''} | Phone: ${settings.phone || ''}`
  ].filter(Boolean);
  addrLines.forEach((line, i) => {
    doc.text(line, margin + (settings.logo ? 30 : 0), y + 9 + i * 3.5);
  });

  // Copy label (top right)
  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text(copyLabel, pageWidth - margin, y + 3, { align: 'right' });

  // Contract No. (top right below label)
  doc.setFontSize(9);
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text(`No. ${contract.contractNo || ''}`, pageWidth - margin, y + 8, { align: 'right' });

  y += 22;

  // ─── PARTIES ───
  // Layout: buyer_copy => buyer left, seller right
  //         seller_copy => seller left, buyer right
  //         broker_copy => seller left, buyer right (default)
  const leftParty = type === 'buyer_copy' ? contract.buyer : contract.seller;
  const rightParty = type === 'buyer_copy' ? contract.seller : contract.buyer;
  const leftLabel = type === 'buyer_copy' ? 'BUYER' : 'SELLER';
  const rightLabel = type === 'buyer_copy' ? 'SELLER' : 'BUYER';

  const colWidth = (contentWidth - 4) / 2;

  // Left party box
  doc.setFillColor(hexToRgb(BRAND.primaryLight).r, hexToRgb(BRAND.primaryLight).g, hexToRgb(BRAND.primaryLight).b);
  doc.rect(margin, y, colWidth, 30, 'F');
  doc.setDrawColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.rect(margin, y, colWidth, 30, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text(leftLabel, margin + 2, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text(leftParty.legalName || '', margin + 2, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b);
  doc.setFontSize(7);
  const leftAddr = [leftParty.address, `${leftParty.city}, ${leftParty.state}`, `GSTIN: ${leftParty.gstin || ''}`, `Phone: ${leftParty.phone || 'N/A'}`].filter(Boolean);
  leftAddr.forEach((line, i) => doc.text(line, margin + 2, y + 14 + i * 3.5));

  // Right party box
  doc.setFillColor(hexToRgb(BRAND.primaryLight).r, hexToRgb(BRAND.primaryLight).g, hexToRgb(BRAND.primaryLight).b);
  doc.rect(margin + colWidth + 4, y, colWidth, 30, 'F');
  doc.setDrawColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.rect(margin + colWidth + 4, y, colWidth, 30, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text(rightLabel, margin + colWidth + 6, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text(rightParty.legalName || '', margin + colWidth + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b);
  doc.setFontSize(7);
  const rightAddr = [rightParty.address, `${rightParty.city}, ${rightParty.state}`, `GSTIN: ${rightParty.gstin || ''}`, `Phone: ${rightParty.phone || 'N/A'}`].filter(Boolean);
  rightAddr.forEach((line, i) => doc.text(line, margin + colWidth + 6, y + 14 + i * 3.5));

  y += 36;

  // ─── PRODUCT SPECIFICATIONS ───
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text('PRODUCT SPECIFICATIONS', margin, y);
  y += 5;

  const specRows = (contract.product?.specs || []).map((s: any) => [s.label || '', `${s.value || ''} ${s.unit || ''}`]);
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Specification', 'Standard / Value']],
    body: specRows,
    theme: 'grid',
    headStyles: {
      fillColor: [hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      font: 'helvetica',
    },
    bodyStyles: {
      fontSize: 8,
      font: 'helvetica',
      textColor: [51, 51, 51],
    },
    alternateRowStyles: {
      fillColor: [hexToRgb(BRAND.primaryLight).r, hexToRgb(BRAND.primaryLight).g, hexToRgb(BRAND.primaryLight).b],
    },
    styles: {
      lineColor: [hexToRgb(BRAND.primaryMid).r, hexToRgb(BRAND.primaryMid).g, hexToRgb(BRAND.primaryMid).b],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 'auto' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── COMMERCIAL TERMS ───
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text('COMMERCIAL TERMS', margin, y);
  y += 5;

  const totalValue = contract.quantity * contract.price;
  const termsBody: any[] = [
    ['Quantity', `${contract.quantity} ${contract.quantityUnit}`],
    ['Price', `Rs. ${contract.price.toLocaleString('en-IN')} per ${contract.priceUnit}`],
    ['Total Value', `Rs. ${totalValue.toLocaleString('en-IN')}`],
    ['Packing', contract.packing || ''],
    ['Delivery At', contract.deliveryLocation || ''],
    ['Delivery Address', contract.deliveryAddress || ''],
    ['Loading Condition', contract.loadingCondition || ''],
    ['Payment Terms', contract.paymentTerms || ''],
    ['GST', `${contract.gstPercent || 0}% Extra as per Government Rules`],
  ];

  // Brokerage in commercial terms - only show relevant one per copy type
  if (type === 'buyer_copy') {
    const bb = contract.product?.buyerBrokerageType === 'flat' && contract.product?.buyerBrokerageFixed > 0
      ? `Rs. ${contract.product.buyerBrokerageFixed}`
      : `${contract.buyerBrokeragePercent || contract.product?.buyerBrokeragePercent || 0}%`;
    termsBody.push(['Brokerage', bb]);
  } else if (type === 'seller_copy') {
    const sb = contract.product?.sellerBrokerageType === 'flat' && contract.product?.sellerBrokerageFixed > 0
      ? `Rs. ${contract.product.sellerBrokerageFixed}`
      : `${contract.sellerBrokeragePercent || contract.product?.sellerBrokeragePercent || 0}%`;
    termsBody.push(['Brokerage', sb]);
  } else {
    // broker copy - show both
    const bb = contract.product?.buyerBrokerageType === 'flat' && contract.product?.buyerBrokerageFixed > 0
      ? `Rs. ${contract.product.buyerBrokerageFixed}`
      : `${contract.buyerBrokeragePercent || contract.product?.buyerBrokeragePercent || 0}%`;
    const sb = contract.product?.sellerBrokerageType === 'flat' && contract.product?.sellerBrokerageFixed > 0
      ? `Rs. ${contract.product.sellerBrokerageFixed}`
      : `${contract.sellerBrokeragePercent || contract.product?.sellerBrokeragePercent || 0}%`;
    termsBody.push(['Buyer Brokerage', bb]);
    termsBody.push(['Seller Brokerage', sb]);
  }

  if (contract.otherTerms) {
    termsBody.push(['Other Terms', contract.otherTerms]);
  }

  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Term', 'Details']],
    body: termsBody,
    theme: 'grid',
    headStyles: {
      fillColor: [hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      font: 'helvetica',
    },
    bodyStyles: {
      fontSize: 8,
      font: 'helvetica',
      textColor: [51, 51, 51],
    },
    alternateRowStyles: {
      fillColor: [hexToRgb(BRAND.primaryLight).r, hexToRgb(BRAND.primaryLight).g, hexToRgb(BRAND.primaryLight).b],
    },
    styles: {
      lineColor: [hexToRgb(BRAND.primaryMid).r, hexToRgb(BRAND.primaryMid).g, hexToRgb(BRAND.primaryMid).b],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    didParseCell: function(data: any) {
      if (data.row.index === 2 && data.column.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── TERMS & CONDITIONS ───
  const tnc = settings.termsAndConditions?.length > 0 ? settings.termsAndConditions : [
    '1. Goods to be loaded within stipulated time as per contract.',
    '2. After dispatching of goods, intimation must be given to us.',
    '3. If any bargain cancelled due to time limit, loading condition or Govt. restriction, our brokerage will be charged as usual.',
    '4. This contract is subject to responsibility of both parties and effected as a broker of both parties without any liabilities.',
    '5. We have full power to settle all claims amicably which will bind both buyer and seller equally.',
  ];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text('TERMS & CONDITIONS', margin, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b);
  tnc.forEach((line: string) => {
    const splitLines = doc.splitTextToSize(line, contentWidth);
    splitLines.forEach((l: string) => {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = 15;
      }
      doc.text(l, margin, y);
      y += 3.8;
    });
  });

  y += 4;

  // ─── FOOTER ───
  // Ensure footer doesn't overlap with content
  const footerY = Math.min(y, pageHeight - 28);

  // Footer line
  doc.setDrawColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // Footer logo (small, right side) - ensure no overlap
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', pageWidth - margin - 20, footerY + 2, 18, 8);
    } catch (e) {
      // skip
    }
  }

  // Footer text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text(`For, ${settings.legalName || settings.name || 'MAHALAXMI AGRI COMMODITIES'}`, margin, footerY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.gray).r, hexToRgb(BRAND.gray).g, hexToRgb(BRAND.gray).b);
  doc.text('Authorized Signature', margin, footerY + 10);

  // Date on footer right
  doc.setFontSize(7);
  doc.setTextColor(hexToRgb(BRAND.gray).r, hexToRgb(BRAND.gray).g, hexToRgb(BRAND.gray).b);
  doc.text(`Date: ${new Date(contract.date).toLocaleDateString('en-IN')}`, pageWidth - margin, footerY + 5, { align: 'right' });

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function generateBrokerageBillPDF(bill: any, settings: CompanySettings) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  doc.setFont('helvetica', 'normal');

  let y = 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text('BROKERAGE BILL', pageWidth / 2, y, { align: 'center' });

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text(settings.legalName || settings.name || '', pageWidth / 2, y, { align: 'center' });

  y += 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.gray).r, hexToRgb(BRAND.gray).g, hexToRgb(BRAND.gray).b);
  doc.text(`Bill No: ${bill.id} | Month: ${bill.month}/${bill.year}`, margin, y);
  doc.text(`Party: ${bill.party?.legalName || ''}`, margin, y + 5);
  doc.text(`GSTIN: ${bill.party?.gstin || ''}`, margin, y + 10);

  y += 18;
  const rows = (bill.contracts || []).map((c: Contract) => [
    c.contractNo,
    c.product?.name || '',
    `${c.quantity} ${c.quantityUnit}`,
    `Rs. ${(c.quantity * c.price).toLocaleString('en-IN')}`,
    `Rs. ${(c.totalBrokerageAmount || 0).toLocaleString('en-IN')}`,
  ]);

  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Contract No', 'Product', 'Quantity', 'Total Value', 'Brokerage']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      font: 'helvetica',
    },
    bodyStyles: {
      fontSize: 8,
      font: 'helvetica',
      textColor: [51, 51, 51],
    },
    alternateRowStyles: {
      fillColor: [hexToRgb(BRAND.primaryLight).r, hexToRgb(BRAND.primaryLight).g, hexToRgb(BRAND.primaryLight).b],
    },
    styles: {
      lineColor: [hexToRgb(BRAND.primaryMid).r, hexToRgb(BRAND.primaryMid).g, hexToRgb(BRAND.primaryMid).b],
      lineWidth: 0.3,
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text(`Total Brokerage: Rs. ${(bill.totalBrokerage || 0).toLocaleString('en-IN')}`, pageWidth - margin, finalY, { align: 'right' });

  return doc;
}
