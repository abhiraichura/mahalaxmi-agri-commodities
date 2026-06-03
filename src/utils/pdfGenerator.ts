import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings } from '../types';
import { format } from 'date-fns';

// Helper to create RGB color tuple
type RGBColor = [number, number, number];

const rgb = (r: number, g: number, b: number): RGBColor => [r, g, b];

export const generateContractPDF = (
  contract: Contract,
  settings: CompanySettings,
  type: 'buyer_copy' | 'seller_copy' | 'broker_copy'
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  let y = margin;

  // Colors
  const primaryColor = rgb(220, 20, 60); // Crimson red for Mahalaxmi branding
  const darkColor = rgb(33, 37, 41);
  const grayColor = rgb(108, 117, 125);
  const lightGray = rgb(248, 249, 250);
  const borderColor = rgb(222, 226, 230);

  // Helper functions
  const addText = (text: string, x: number, yPos: number, options: any = {}) => {
    const {
      fontSize = 10,
      fontStyle = 'normal',
      color = darkColor,
      align = 'left',
      maxWidth = contentWidth
    } = options;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color[0], color[1], color[2]);

    if (align === 'center') {
      doc.text(text, pageWidth / 2, yPos, { align: 'center' });
    } else if (align === 'right') {
      doc.text(text, pageWidth - margin, yPos, { align: 'right' });
    } else {
      doc.text(text, x, yPos, { maxWidth });
    }
  };

  const addLine = (x1: number, y1: number, x2: number, y2: number, color = borderColor, width = 0.3) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(width);
    doc.line(x1, y1, x2, y2);
  };

  const addBox = (x: number, yPos: number, w: number, h: number, fill = false) => {
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    if (fill) {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(x, yPos, w, h, 'FD');
    } else {
      doc.rect(x, yPos, w, h, 'D');
    }
  };

  // ===== HEADER SECTION =====
  // Logo placeholder or text
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', margin, y, 25, 20);
    } catch (e) {
      // Fallback to text logo
      addText(settings.name, margin, y + 8, { fontSize: 16, fontStyle: 'bold', color: primaryColor });
    }
  } else {
    addText(settings.name, margin, y + 8, { fontSize: 16, fontStyle: 'bold', color: primaryColor });
  }

  // Company details on right
  const rightX = pageWidth - margin - 80;
  addText(settings.legalName, rightX, y, { fontSize: 9, fontStyle: 'bold' });
  addText(settings.address, rightX, y + 4, { fontSize: 8, color: grayColor });
  addText(`${settings.city}, ${settings.state} - ${settings.pincode}`, rightX, y + 8, { fontSize: 8, color: grayColor });
  addText(`GSTIN: ${settings.gstin}`, rightX, y + 12, { fontSize: 8, color: grayColor });
  addText(`Phone: ${settings.phone}`, rightX, y + 16, { fontSize: 8, color: grayColor });

  y += 25;
  addLine(margin, y, pageWidth - margin, y, primaryColor, 1);
  y += 8;

  // ===== CONTRACT TITLE =====
  addText('CONTRACT NOTE', pageWidth / 2, y, { fontSize: 14, fontStyle: 'bold', align: 'center', color: primaryColor });
  y += 6;
  addText(`No. ${contract.contractNo} / ${contract.year}`, pageWidth / 2, y, { fontSize: 11, align: 'center' });
  y += 8;

  // Date and type
  addText(`Date: ${format(new Date(contract.date), 'dd/MM/yyyy')}`, margin, y, { fontSize: 9 });
  addText(`Copy: ${type.replace('_', ' ').toUpperCase()}`, pageWidth - margin, y, { fontSize: 9, align: 'right', color: primaryColor });
  y += 10;

  // ===== PARTY DETAILS BOX =====
  const boxHeight = 35;
  addBox(margin, y, contentWidth, boxHeight, true);

  // Determine order based on copy type
  const firstParty = type === 'buyer_copy' ? contract.buyer : contract.seller;
  const secondParty = type === 'buyer_copy' ? contract.seller : contract.buyer;
  const firstLabel = type === 'buyer_copy' ? 'BUYER' : 'SELLER';
  const secondLabel = type === 'buyer_copy' ? 'SELLER' : 'BUYER';

  // First party (left)
  addText(`${firstLabel}:`, margin + 2, y + 5, { fontSize: 8, fontStyle: 'bold', color: primaryColor });
  addText(firstParty.legalName, margin + 2, y + 10, { fontSize: 9, fontStyle: 'bold' });
  addText(firstParty.address, margin + 2, y + 14, { fontSize: 8, color: grayColor, maxWidth: 80 });
  addText(`${firstParty.city}, ${firstParty.state}`, margin + 2, y + 22, { fontSize: 8, color: grayColor });
  addText(`GSTIN: ${firstParty.gstin}`, margin + 2, y + 26, { fontSize: 8, color: grayColor });
  addText(`Phone: ${firstParty.phone}`, margin + 2, y + 30, { fontSize: 8, color: grayColor });

  // Second party (right)
  const rightPartyX = pageWidth / 2 + 5;
  addText(`${secondLabel}:`, rightPartyX, y + 5, { fontSize: 8, fontStyle: 'bold', color: primaryColor });
  addText(secondParty.legalName, rightPartyX, y + 10, { fontSize: 9, fontStyle: 'bold' });
  addText(secondParty.address, rightPartyX, y + 14, { fontSize: 8, color: grayColor, maxWidth: 80 });
  addText(`${secondParty.city}, ${secondParty.state}`, rightPartyX, y + 22, { fontSize: 8, color: grayColor });
  addText(`GSTIN: ${secondParty.gstin}`, rightPartyX, y + 26, { fontSize: 8, color: grayColor });
  addText(`Phone: ${secondParty.phone}`, rightPartyX, y + 30, { fontSize: 8, color: grayColor });

  y += boxHeight + 8;

  // ===== PRODUCT & SPECIFICATIONS =====
  addText('PRODUCT SPECIFICATIONS', margin, y, { fontSize: 11, fontStyle: 'bold', color: primaryColor });
  y += 6;

  // Product name box
  addBox(margin, y, contentWidth, 8, true);
  addText(contract.product.name, margin + 2, y + 5, { fontSize: 10, fontStyle: 'bold' });
  y += 10;

  // Specifications table
  if (contract.product.specs && contract.product.specs.length > 0) {
    const specRows = contract.product.specs.map(spec => [
      spec.label,
      `${spec.value} ${spec.unit}`
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Specification', 'Standard']],
      body: specRows,
      theme: 'plain',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: primaryColor,
        fontStyle: 'bold',
        fontSize: 9,
        lineWidth: 0.3,
        lineColor: borderColor
      },
      bodyStyles: {
        fontSize: 9,
        lineWidth: 0.2,
        lineColor: borderColor
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // ===== COMMERCIAL TERMS =====
  addText('COMMERCIAL TERMS', margin, y, { fontSize: 11, fontStyle: 'bold', color: primaryColor });
  y += 6;

  const commercialData = [
    ['Quantity', `${contract.quantity} ${contract.quantityUnit}`],
    ['Price', `Rs.${contract.price.toLocaleString('en-IN')} per ${contract.priceUnit}`],
    ['Total Value', `Rs.${(contract.quantity * contract.price).toLocaleString('en-IN')}`],
    ['Packing', contract.packing],
    ['Delivery At', contract.deliveryLocation],
    ['Delivery Address', contract.deliveryAddress || 'As provided by buyer'],
    ['Loading Condition', contract.loadingCondition],
    ['Payment Terms', contract.paymentTerms],
    ['GST', `${contract.gstPercent}% Extra as per Government Rules`]
  ];

  autoTable(doc, {
    startY: y,
    body: commercialData,
    theme: 'plain',
    bodyStyles: {
      fontSize: 9,
      lineWidth: 0.2,
      lineColor: borderColor
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: lightGray },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ===== OTHER TERMS =====
  if (contract.otherTerms) {
    addText('OTHER TERMS & CONDITIONS', margin, y, { fontSize: 11, fontStyle: 'bold', color: primaryColor });
    y += 5;
    addText(contract.otherTerms, margin, y, { fontSize: 8, color: grayColor, maxWidth: contentWidth });
    y += 15;
  }

  // ===== TERMS & CONDITIONS =====
  addText('TERMS & CONDITIONS', margin, y, { fontSize: 11, fontStyle: 'bold', color: primaryColor });
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

  terms.forEach((term, index) => {
    addText(`${index + 1}. ${term}`, margin, y, { fontSize: 8, color: grayColor, maxWidth: contentWidth });
    y += 4;
  });

  y += 8;

  // ===== FOOTER =====
  addLine(margin, y, pageWidth - margin, y, primaryColor, 0.5);
  y += 5;

  addText(settings.legalName, margin, y, { fontSize: 9, fontStyle: 'bold' });
  addText('Authorized Signature', pageWidth - margin, y, { fontSize: 9, align: 'right', fontStyle: 'bold' });
  y += 4;
  addText('For, KRISHNA AGRI BROKERS', margin, y, { fontSize: 8, color: grayColor });

  // Page border
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin - 2, margin - 2, pageWidth - (margin - 2) * 2, pageHeight - (margin - 2) * 2, 'D');

  return doc;
};

export const generateBrokerageBillPDF = (
  bill: any,
  settings: CompanySettings
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;
  const pageHeight = 297;

  const primaryColor = rgb(220, 20, 60);
  const darkColor = rgb(33, 37, 41);
  const grayColor = rgb(108, 117, 125);

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(settings.name, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Brokerage Bill', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Bill details
  doc.setFontSize(9);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(`Bill Period: ${bill.month}/${bill.year}`, margin, y);
  doc.text(`Generated: ${format(new Date(bill.generatedAt), 'dd/MM/yyyy')}`, pageWidth - margin, y, { align: 'right' });
  y += 8;

  // Party details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Party: ${bill.party.legalName}`, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`GSTIN: ${bill.party.gstin}`, margin, y);
  y += 8;

  // Contracts table
  const tableData = bill.contracts.map((c: any) => [
    c.contractNo,
    format(new Date(c.date), 'dd/MM/yyyy'),
    c.product.name,
    `${c.quantity} ${c.quantityUnit}`,
    `Rs.${c.price.toLocaleString('en-IN')}`,
    `Rs.${c.brokerageAmount.toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Contract No', 'Date', 'Product', 'Quantity', 'Price', 'Brokerage']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Total Brokerage: Rs.${bill.totalBrokerage.toLocaleString('en-IN')}`, pageWidth - margin, finalY, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('This is a computer generated bill and does not require signature.', pageWidth / 2, pageHeight - 20, { align: 'center' });

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const getPDFBlob = (doc: jsPDF): Blob => {
  return doc.output('blob');
};
