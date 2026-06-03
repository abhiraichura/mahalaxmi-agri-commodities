import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings } from '../types';
import { format } from 'date-fns';

// Helper to create proper RGB tuple for jsPDF
type RGB = [number, number, number];
const c = (r: number, g: number, b: number): RGB => [r, g, b];

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

  const PW = 210; // page width
  const PH = 297; // page height
  const M = 12;   // margin
  const W = PW - M * 2; // content width

  // Colors
  const BLACK = c(0, 0, 0);
  const DARK = c(33, 37, 41);
  const GRAY = c(100, 100, 100);
  const RED = c(180, 30, 60);
  const LIGHT = c(245, 245, 245);
  const BORDER = c(200, 200, 200);

  let y = M;

  // ===== HEADER: Broker Name =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(settings.name.toUpperCase(), M, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(settings.address, M, y);
  y += 4;
  doc.text(`${settings.city}, ${settings.state} - ${settings.pincode} | GSTIN: ${settings.gstin} | Phone: ${settings.phone}`, M, y);
  y += 6;

  // Separator line
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.line(M, y, PW - M, y);
  y += 8;

  // ===== CONTRACT TITLE =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...RED);
  doc.text('CONTRACT NOTE', PW / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(`No. ${contract.contractNo} / ${contract.year}`, PW / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Date: ${format(new Date(contract.date), 'dd/MM/yyyy')}`, PW / 2, y, { align: 'center' });
  y += 8;

  // ===== PARTIES BOX =====
  const partyH = 32;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W, partyH, 'FD');

  const colW = W / 2 - 2;

  // Determine order based on copy type
  const firstParty = type === 'buyer_copy' ? contract.buyer : contract.seller;
  const secondParty = type === 'buyer_copy' ? contract.seller : contract.buyer;
  const firstLabel = type === 'buyer_copy' ? 'BUYER' : 'SELLER';
  const secondLabel = type === 'buyer_copy' ? 'SELLER' : 'BUYER';

  // First party (left column)
  let py = y + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text(`${firstLabel}:`, M + 3, py);
  py += 5;
  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  doc.text(firstParty.legalName, M + 3, py);
  py += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const addr1 = firstParty.address.length > 50 ? firstParty.address.substring(0, 50) + '...' : firstParty.address;
  doc.text(addr1, M + 3, py);
  py += 3.5;
  doc.text(`${firstParty.city}, ${firstParty.state} - ${firstParty.pincode}`, M + 3, py);
  py += 3.5;
  doc.text(`GSTIN: ${firstParty.gstin} | Phone: ${firstParty.phone || 'N/A'}`, M + 3, py);

  // Second party (right column)
  const rx = M + colW + 4;
  py = y + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text(`${secondLabel}:`, rx, py);
  py += 5;
  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  doc.text(secondParty.legalName, rx, py);
  py += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const addr2 = secondParty.address.length > 50 ? secondParty.address.substring(0, 50) + '...' : secondParty.address;
  doc.text(addr2, rx, py);
  py += 3.5;
  doc.text(`${secondParty.city}, ${secondParty.state} - ${secondParty.pincode}`, rx, py);
  py += 3.5;
  doc.text(`GSTIN: ${secondParty.gstin} | Phone: ${secondParty.phone || 'N/A'}`, rx, py);

  y += partyH + 6;

  // ===== PRODUCT & SPECIFICATIONS =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...RED);
  doc.text('PRODUCT SPECIFICATIONS', M, y);
  y += 5;

  // Product name bar
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
      .sort((a, b) => a.order - b.order)
      .map(spec => [spec.label, `${spec.value} ${spec.unit}`]);

    autoTable(doc, {
      startY: y,
      head: [['Specification', 'Standard / Value']],
      body: specRows,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [180, 30, 60],
        fontStyle: 'bold',
        fontSize: 8,
        lineWidth: 0.3,
        lineColor: [200, 200, 200]
      },
      bodyStyles: {
        fontSize: 8,
        lineWidth: 0.2,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      margin: { left: M, right: M },
      tableWidth: W
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // ===== COMMERCIAL TERMS =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...RED);
  doc.text('COMMERCIAL TERMS', M, y);
  y += 5;

  const totalValue = contract.quantity * contract.price;

  const commRows = [
    ['Quantity', `${contract.quantity} ${contract.quantityUnit}`],
    ['Price', `Rs. ${contract.price.toLocaleString('en-IN')} per ${contract.priceUnit}`],
    ['Total Value', `Rs. ${totalValue.toLocaleString('en-IN')}`],
    ['Packing', contract.packing],
    ['Delivery At', contract.deliveryLocation],
    ['Delivery Address', contract.deliveryAddress || 'Will be provided by buyer at time of delivery'],
    ['Loading Condition', contract.loadingCondition],
    ['Payment Terms', contract.paymentTerms],
    ['GST', `${contract.gstPercent}% Extra as per Government Rules`]
  ];

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
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', fillColor: [248, 248, 248] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: M, right: M },
    tableWidth: W
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ===== TERMS & CONDITIONS =====
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
    const splitText = doc.splitTextToSize(text, W - 5);
    doc.text(splitText, M + 2, y);
    y += (splitText.length * 3.5) + 1;
  });

  y += 4;

  // ===== FOOTER =====
  // Check if we need a new page
  if (y > PH - 35) {
    doc.addPage();
    y = M;
  }

  // Separator
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.line(M, y, PW - M, y);
  y += 6;

  // Broker info left, signature right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(settings.legalName, M, y);

  // Digital signature
  if (settings.signature) {
    try {
      doc.addImage(settings.signature, 'PNG', PW - M - 40, y - 5, 35, 15);
    } catch (e) {
      // Signature image failed, skip
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
  doc.setLineWidth(0.5);
  doc.rect(M - 2, M - 2, W + 4, PH - M * 2 + 4, 'D');

  return doc;
};

export const generateBrokerageBillPDF = (
  bill: any,
  settings: CompanySettings
): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 12;
  const W = 210 - M * 2;
  let y = M;

  const RED: RGB = [180, 30, 60];
  const GRAY: RGB = [100, 100, 100];

  // Header
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
  doc.text(`Period: ${bill.month}/${bill.year}`, M, y);
  doc.text(`Generated: ${format(new Date(bill.generatedAt?.toDate ? bill.generatedAt.toDate() : bill.generatedAt), 'dd/MM/yyyy')}`, 198, y, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Party: ${bill.party.legalName}`, M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`GSTIN: ${bill.party.gstin}`, M, y);
  y += 8;

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
