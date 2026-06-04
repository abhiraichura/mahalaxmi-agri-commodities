import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Contract, CompanySettings } from '../types';

const BRAND = {
  primary: '#ed1879',
  primaryDark: '#c41465',
  black: '#000000',
  darkGray: '#374151',
  gray: '#6b7280',
  lightGray: '#f9fafb',
  border: '#e5e7eb',
  white: '#ffffff',
};

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

  doc.setFont('helvetica', 'normal');

  let y = 10;

  // ─── HEADER ───
  const logoW = 20, logoH = 9;
  let headerX = margin;

  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', headerX, y, logoW, logoH);
      headerX += logoW + 3;
    } catch (e) { /* skip */ }
  }

  // Company name
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text(settings.legalName || settings.name || 'MAHALAXMI AGRI COMMODITIES', headerX, y + 4);

  // Address
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.gray).r, hexToRgb(BRAND.gray).g, hexToRgb(BRAND.gray).b);
  const addrLine = `${settings.address || ''}, ${settings.city || ''}${settings.state ? ', ' + settings.state : ''}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',');
  if (addrLine.length > 3) {
    doc.text(addrLine, headerX, y + 8);
  }
  const contactLine = `GSTIN: ${settings.gstin || ''} | Phone: ${settings.phone || ''}`.replace(/GSTIN:\s*\|/, '').replace(/\|\s*Phone:\s*$/, '');
  if (contactLine.length > 10) {
    doc.text(contactLine, headerX, y + 11);
  }

  // Top-right: Copy label (small, brand color)
  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text(copyLabel, pageWidth - margin, y + 3, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b);
  doc.text(`No. ${contract.contractNo || ''}`, pageWidth - margin, y + 6.5, { align: 'right' });

  // Thin black line under header
  y += 14;
  doc.setDrawColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── PARTIES ───
  const leftParty = type === 'buyer_copy' ? contract.buyer : contract.seller;
  const rightParty = type === 'buyer_copy' ? contract.seller : contract.buyer;
  const leftLabel = type === 'buyer_copy' ? 'BUYER' : 'SELLER';
  const rightLabel = type === 'buyer_copy' ? 'SELLER' : 'BUYER';
  const colWidth = (contentWidth - 4) / 2;

  // Left party box - clean white with thin gray border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(hexToRgb(BRAND.border).r, hexToRgb(BRAND.border).g, hexToRgb(BRAND.border).b);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, colWidth, 26, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text(leftLabel, margin + 2, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.setFontSize(8.5);
  const leftName = leftParty.legalName || '';
  const splitLeftName = doc.splitTextToSize(leftName, colWidth - 4);
  doc.text(splitLeftName, margin + 2, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b);
  doc.setFontSize(7);
  const leftAddrLines = [
    leftParty.address,
    `${leftParty.city}${leftParty.state ? ', ' + leftParty.state : ''}`,
    `GSTIN: ${leftParty.gstin || ''}`,
    `Phone: ${leftParty.phone || 'N/A'}`
  ].filter(Boolean);
  let leftY = y + 11 + (splitLeftName.length - 1) * 2.8;
  leftAddrLines.forEach(line => {
    if (leftY < y + 24) {
      doc.text(line, margin + 2, leftY);
      leftY += 3.2;
    }
  });

  // Right party box
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + colWidth + 4, y, colWidth, 26, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.primary).r, hexToRgb(BRAND.primary).g, hexToRgb(BRAND.primary).b);
  doc.text(rightLabel, margin + colWidth + 6, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.setFontSize(8.5);
  const rightName = rightParty.legalName || '';
  const splitRightName = doc.splitTextToSize(rightName, colWidth - 4);
  doc.text(splitRightName, margin + colWidth + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b);
  doc.setFontSize(7);
  const rightAddrLines = [
    rightParty.address,
    `${rightParty.city}${rightParty.state ? ', ' + rightParty.state : ''}`,
    `GSTIN: ${rightParty.gstin || ''}`,
    `Phone: ${rightParty.phone || 'N/A'}`
  ].filter(Boolean);
  let rightY = y + 11 + (splitRightName.length - 1) * 2.8;
  rightAddrLines.forEach(line => {
    if (rightY < y + 24) {
      doc.text(line, margin + colWidth + 6, rightY);
      rightY += 3.2;
    }
  });

  y += 30;

  // ─── PRODUCT SPECIFICATIONS ───
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text('PRODUCT SPECIFICATIONS', margin, y);
  y += 3.5;

  const specRows = (contract.product?.specs || []).map((s: any) => [s.label || '', `${s.value || ''} ${s.unit || ''}`]);
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Specification', 'Standard / Value']],
    body: specRows,
    theme: 'grid',
    headStyles: {
      fillColor: [hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      font: 'helvetica',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      font: 'helvetica',
      textColor: [hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b],
    },
    alternateRowStyles: {
      fillColor: [hexToRgb(BRAND.lightGray).r, hexToRgb(BRAND.lightGray).g, hexToRgb(BRAND.lightGray).b],
    },
    styles: {
      lineColor: [hexToRgb(BRAND.border).r, hexToRgb(BRAND.border).g, hexToRgb(BRAND.border).b],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // ─── COMMERCIAL TERMS ───
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text('COMMERCIAL TERMS', margin, y);
  y += 3.5;

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
      fillColor: [hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      font: 'helvetica',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      font: 'helvetica',
      textColor: [hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b],
    },
    alternateRowStyles: {
      fillColor: [hexToRgb(BRAND.lightGray).r, hexToRgb(BRAND.lightGray).g, hexToRgb(BRAND.lightGray).b],
    },
    styles: {
      lineColor: [hexToRgb(BRAND.border).r, hexToRgb(BRAND.border).g, hexToRgb(BRAND.border).b],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 'auto' },
    },
    didParseCell: function(data: any) {
      if (data.row.index === 2 && data.column.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // ─── TERMS & CONDITIONS ───
  const tnc = settings.termsAndConditions?.length > 0 ? settings.termsAndConditions : [
    '1. Goods to be loaded within stipulated time as per contract.',
    '2. After dispatching of goods, intimation must be given to us.',
    '3. If any bargain cancelled due to time limit, loading condition or Govt. restriction, our brokerage will be charged as usual.',
    '4. This contract is subject to responsibility of both parties and effected as a broker of both parties without any liabilities.',
    '5. We have full power to settle all claims amicably which will bind both buyer and seller equally.',
  ];

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text('TERMS & CONDITIONS', margin, y);
  y += 3.5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b);
  tnc.forEach((line: string) => {
    const splitLines = doc.splitTextToSize(line, contentWidth);
    splitLines.forEach((l: string) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 12;
      }
      doc.text(l, margin, y);
      y += 3.4;
    });
  });

  y += 3;

  // ─── FOOTER ───
  const footerHeight = 20;
  if (y > pageHeight - footerHeight - margin) {
    doc.addPage();
    y = margin;
  }

  const footerY = pageHeight - footerHeight;

  // Footer thin line
  doc.setDrawColor(hexToRgb(BRAND.border).r, hexToRgb(BRAND.border).g, hexToRgb(BRAND.border).b);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // Footer logo (small, right side) - only if space available
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', pageWidth - margin - 15, footerY + 2, 14, 6);
    } catch (e) { /* skip */ }
  }

  // Left side: "For, Company Name"
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text(`For, ${settings.legalName || settings.name || 'MAHALAXMI AGRI COMMODITIES'}`, margin, footerY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hexToRgb(BRAND.gray).r, hexToRgb(BRAND.gray).g, hexToRgb(BRAND.gray).b);
  doc.setFontSize(7);
  doc.text('Authorized Signature', margin, footerY + 8);

  // Right side: Date
  doc.setFontSize(7);
  doc.setTextColor(hexToRgb(BRAND.gray).r, hexToRgb(BRAND.gray).g, hexToRgb(BRAND.gray).b);
  doc.text(`Date: ${new Date(contract.date).toLocaleDateString('en-IN')}`, pageWidth - margin, footerY + 4, { align: 'right' });

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
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text('BROKERAGE BILL', pageWidth / 2, y, { align: 'center' });

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b);
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
      fillColor: [hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      font: 'helvetica',
    },
    bodyStyles: {
      fontSize: 8,
      font: 'helvetica',
      textColor: [hexToRgb(BRAND.darkGray).r, hexToRgb(BRAND.darkGray).g, hexToRgb(BRAND.darkGray).b],
    },
    alternateRowStyles: {
      fillColor: [hexToRgb(BRAND.lightGray).r, hexToRgb(BRAND.lightGray).g, hexToRgb(BRAND.lightGray).b],
    },
    styles: {
      lineColor: [hexToRgb(BRAND.border).r, hexToRgb(BRAND.border).g, hexToRgb(BRAND.border).b],
      lineWidth: 0.2,
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hexToRgb(BRAND.black).r, hexToRgb(BRAND.black).g, hexToRgb(BRAND.black).b);
  doc.text(`Total Brokerage: Rs. ${(bill.totalBrokerage || 0).toLocaleString('en-IN')}`, pageWidth - margin, finalY, { align: 'right' });

  return doc;
}
