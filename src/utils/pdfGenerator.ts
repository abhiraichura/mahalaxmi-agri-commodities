import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings } from '../types';

// Helper to add logo image to PDF
function addLogoToPDF(doc: jsPDF, logoData: string | null, x: number, y: number, maxW: number, maxH: number) {
  if (!logoData) return 0;
  try {
    const img = new Image();
    img.src = logoData;
    const aspect = img.width / img.height;
    let w = maxW;
    let h = maxH;
    if (aspect > 1) { h = w / aspect; }
    else { w = h * aspect; }
    doc.addImage(logoData, 'PNG', x, y, w, h);
    return h;
  } catch (e) {
    return 0;
  }
}

function addHeader(doc: jsPDF, settings: CompanySettings, pageWidth: number) {
  const margin = 14;
  let y = 12;

  // Logo on left
  const logoH = addLogoToPDF(doc, settings.logo, margin, y, 20, 16);

  // Company name and details - centered, but keep within page
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 30, 60); // Rose color
  const nameText = settings.name || 'MAHALAXMI AGRI COMMODITIES';
  const nameW = doc.getTextWidth(nameText);
  doc.text(nameText, pageWidth / 2, y + 6, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const addrLine = `${settings.address}, ${settings.city}, ${settings.state} - ${settings.pincode}`;
  doc.text(addrLine, pageWidth / 2, y + 11, { align: 'center' });
  const contactLine = `GSTIN: ${settings.gstin} | Phone: ${settings.phone}`;
  doc.text(contactLine, pageWidth / 2, y + 15, { align: 'center' });

  // Decorative line
  doc.setDrawColor(180, 30, 60);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 20, pageWidth - margin, y + 20);

  return y + 24;
}

function addFooter(doc: jsPDF, settings: CompanySettings, pageWidth: number, pageHeight: number, type: string) {
  const margin = 14;
  const y = pageHeight - 30;

  // Terms
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 30, 60);
  doc.text('TERMS & CONDITIONS', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const terms = settings.termsAndConditions || [];
  terms.slice(0, 5).forEach((term, i) => {
    doc.text(`${i + 1}. ${term}`, margin, y + 4 + (i * 3.5), { maxWidth: pageWidth - margin * 2 });
  });

  // Signature area
  const sigY = pageHeight - 14;
  if (settings.signature) {
    try {
      doc.addImage(settings.signature, 'PNG', pageWidth - 50, sigY - 12, 36, 10);
    } catch (e) {}
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(`For, ${settings.name || 'MAHALAXMI AGRI COMMODITIES'}`, pageWidth - margin, sigY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Authorized Signature', pageWidth - margin, sigY + 4, { align: 'right' });

  // Bottom decorative line
  doc.setDrawColor(180, 30, 60);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 6, pageWidth - margin, pageHeight - 6);
}

export function generateContractPDF(contract: Contract, settings: CompanySettings, type: 'buyer_copy' | 'seller_copy' | 'broker_copy') {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let y = addHeader(doc, settings, pageWidth);

  // Copy type label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 30, 60);
  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.text(copyLabel, pageWidth - margin, y - 6, { align: 'right' });

  // Contract Note Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('CONTRACT NOTE', pageWidth / 2, y + 4, { align: 'center' });

  // Contract number and date box
  y += 10;
  doc.setFillColor(250, 245, 245);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(`No. ${contract.contractNo}`, margin + 4, y + 7);
  doc.text(`Date: ${new Date(contract.date).toLocaleDateString('en-IN')}`, pageWidth - margin - 4, y + 7, { align: 'right' });

  y += 16;

  // Parties section
  const colW = (pageWidth - margin * 2 - 4) / 2;

  // Seller Box
  doc.setFillColor(240, 253, 240);
  doc.roundedRect(margin, y, colW, 32, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text('SELLER:', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.text(contract.seller.legalName, margin + 3, y + 10);
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(contract.seller.address, margin + 3, y + 14, { maxWidth: colW - 6 });
  doc.text(`${contract.seller.city}, ${contract.seller.state} - ${contract.seller.pincode}`, margin + 3, y + 20);
  doc.text(`GSTIN: ${contract.seller.gstin} | Phone: ${contract.seller.phone || 'N/A'}`, margin + 3, y + 24);

  // Buyer Box
  doc.setFillColor(240, 248, 255);
  doc.roundedRect(margin + colW + 4, y, colW, 32, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 100, 180);
  doc.text('BUYER:', margin + colW + 7, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.text(contract.buyer.legalName, margin + colW + 7, y + 10);
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(contract.buyer.address, margin + colW + 7, y + 14, { maxWidth: colW - 6 });
  doc.text(`${contract.buyer.city}, ${contract.buyer.state} - ${contract.buyer.pincode}`, margin + colW + 7, y + 20);
  doc.text(`GSTIN: ${contract.buyer.gstin} | Phone: ${contract.buyer.phone || 'N/A'}`, margin + colW + 7, y + 24);

  y += 38;

  // Product Specifications
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 30, 60);
  doc.text('PRODUCT SPECIFICATIONS', margin, y);
  y += 5;

  const specHeaders = [['Specification', 'Standard / Value']];
  const specBody = contract.product.specs?.map(s => [s.label, `${s.value} ${s.unit || ''}`]) || [];
  specBody.unshift(['Product Name', contract.product.name]);

  autoTable(doc, {
    startY: y,
    head: specHeaders,
    body: specBody,
    theme: 'grid',
    headStyles: { fillColor: [180, 30, 60], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: 40 },
    columnStyles: { 0: { fontStyle: 'bold' } },
    margin: { left: margin, right: margin },
    styles: { lineColor: [200, 200, 200], lineWidth: 0.3 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Commercial Terms
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 30, 60);
  doc.text('COMMERCIAL TERMS', margin, y);
  y += 5;

  const totalValue = contract.quantity * contract.price;
  const termsBody = [
    ['Quantity', `${contract.quantity} ${contract.quantityUnit}`],
    ['Price', `Rs. ${contract.price.toLocaleString('en-IN')} per ${contract.priceUnit}`],
    ['Total Value', `Rs. ${totalValue.toLocaleString('en-IN')}`],
    ['Packing', contract.packing],
    ['Delivery At', contract.deliveryLocation],
    ['Delivery Address', contract.deliveryAddress || 'As per buyer'],
    ['Loading Condition', contract.loadingCondition],
    ['Payment Terms', contract.paymentTerms],
    ['GST', `${contract.gstPercent}% Extra as per Government Rules`],
  ];

  // Show brokerage % on contract, NOT amount
  if (type === 'broker_copy') {
    termsBody.push(['Buyer Brokerage', `${contract.buyerBrokeragePercent}%`]);
    termsBody.push(['Seller Brokerage', `${contract.sellerBrokeragePercent}%`]);
  }

  if (contract.otherTerms) {
    termsBody.push(['Other Terms', contract.otherTerms]);
  }

  autoTable(doc, {
    startY: y,
    body: termsBody,
    theme: 'grid',
    bodyStyles: { fontSize: 8, textColor: 40 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [250, 245, 245] } },
    margin: { left: margin, right: margin },
    styles: { lineColor: [200, 200, 200], lineWidth: 0.3 },
  });

  // Footer
  addFooter(doc, settings, pageWidth, pageHeight, type);

  return doc;
}

export function generateBrokerageBillPDF(bill: any, settings: CompanySettings) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let y = addHeader(doc, settings, pageWidth);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('BROKERAGE BILL', pageWidth / 2, y + 4, { align: 'center' });

  y += 10;

  // Bill info box
  doc.setFillColor(250, 245, 245);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(`Bill To: ${bill.party.legalName}`, margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`GSTIN: ${bill.party.gstin} | ${bill.party.address}, ${bill.party.city}`, margin + 4, y + 10);
  doc.text(`Period: ${['January','February','March','April','May','June','July','August','September','October','November','December'][bill.month]} ${bill.year}`, margin + 4, y + 14);
  doc.text(`Status: ${bill.status?.toUpperCase() || 'PENDING'}`, pageWidth - margin - 4, y + 6, { align: 'right' });

  y += 24;

  // Contract table
  const tableBody = bill.contracts.map((c: any) => [
    c.contractNo,
    c.date,
    c.product?.name || 'N/A',
    `${c.quantity} ${c.quantityUnit}`,
    `Rs. ${(c.sellerBrokerageAmount || c.buyerBrokerageAmount || 0).toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Contract#', 'Date', 'Product', 'Quantity', 'Brokerage']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [180, 30, 60], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: 40 },
    margin: { left: margin, right: margin },
    styles: { lineColor: [200, 200, 200], lineWidth: 0.3 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Totals
  doc.setFillColor(250, 245, 245);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 30, 60);
  doc.text(`Total Brokerage: Rs. ${bill.totalBrokerage.toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 9, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Total Contracts: ${bill.contracts.length} | Total Qty: ${bill.totalQuantity} MT`, margin + 4, y + 9);

  // Payment info if available
  if (bill.paidAmount > 0) {
    y += 18;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34);
    doc.text('PAYMENT DETAILS', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.text(`Paid Amount: Rs. ${bill.paidAmount.toLocaleString('en-IN')}`, margin, y + 5);
    if (bill.paymentDate) doc.text(`Payment Date: ${bill.paymentDate}`, margin, y + 9);
    if (bill.paymentNotes) doc.text(`Notes: ${bill.paymentNotes}`, margin, y + 13, { maxWidth: pageWidth - margin * 2 });
  }

  // Footer
  addFooter(doc, settings, pageWidth, pageHeight, 'broker_copy');

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
