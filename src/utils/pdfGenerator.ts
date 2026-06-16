import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings, BrokerageBill, BillPayment } from '../types';
import { format } from 'date-fns';

type RGB = [number, number, number];
const c = (r: number, g: number, b: number): RGB => [r, g, b];

const BLACK = c(20, 20, 20);
const DARK = c(60, 60, 60);
const GRAY = c(120, 120, 120);
const BRAND = c(160, 30, 50);
const LIGHT = c(248, 249, 250);
const BORDER = c(225, 230, 235);

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

const renderSectionHeader = (doc: jsPDF, title: string, x: number, y: number, w: number): number => {
  doc.setFillColor(...LIGHT);
  doc.rect(x, y, w, 8, 'F');
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
  const M = 15;
  const W = PW - M * 2;

  // ─── LETTERHEAD (Top 60mm) ───
  if (options.isDownload) {
    if ((settings as any).letterhead) {
      try {
        const lh = (settings as any).letterhead;
        const imgFormat = lh.includes('image/jpeg') ? 'JPEG' : 'PNG';
        doc.addImage(lh, imgFormat, 0, 0, 210, 55);
      } catch (e) {
        console.error('Failed to add letterhead', e);
      }
    } else {
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('|| Shree Ganeshay Namah ||', PW / 2, 12, { align: 'center' });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('MAHALAXMI', PW / 2, 22, { align: 'center' });
      
      doc.setFontSize(18);
      doc.text('AGRI COMMODITIES', PW / 2, 29, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('General Merchant & Commision Agent', PW / 2, 35, { align: 'center' });
      
      doc.setFontSize(8);
      doc.text('Tower A-118 New Marketing Yard, Rajkot Morbi Highway, Bed, Rajkot (Gujarat) 360 001.', PW / 2, 41, { align: 'center' });
      doc.text('MAIN OFFICE: 408-Star Plaza, Phulchaab Chowk, Rajkot (Gujarat) 360 001.', PW / 2, 45, { align: 'center' });
      doc.text('Email: mahalaxmiagricommodities@gmail.com', PW / 2, 49, { align: 'center' });
      
      doc.setFont('helvetica', 'bold');
      doc.text('M. 90330 00032/98255 00032', PW / 2, 53, { align: 'center' });
    }
  }

  // Set Y below letterhead space
  let y = 65;

  // ─── META INFO ───
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  doc.text(`NO.: ${contract.contractNo}`, M, y);
  doc.setFontSize(14);
  doc.text('CONTRACT NOTE', PW / 2, y, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`DATE: ${format(new Date(contract.date), 'dd-MM-yyyy')}`, PW - M, y, { align: 'right' });
  y += 5;

  // ─── PARTIES SECTION ───
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(M, y, PW - M, y);
  y += 6;

  let rightY = y;
  let leftY = y;

  // LEFT: SELLER
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SELLER', M, leftY);
  doc.text(`: ${contract.seller.legalName}`, M + 22, leftY);
  leftY += 5;

  doc.setFont('helvetica', 'normal');
  const sellerAddr = doc.splitTextToSize(contract.seller.address, 75);
  doc.text(sellerAddr, M + 24, leftY);
  leftY += (sellerAddr.length * 5);

  doc.text('CITY', M, leftY);
  doc.text(`: ${contract.seller.city}`, M + 22, leftY);
  leftY += 5;

  doc.text('GSTIN NO.', M, leftY);
  doc.text(`: ${contract.seller.gstin || ''}`, M + 22, leftY);
  leftY += 5;

  // RIGHT: BUYER
  doc.setFont('helvetica', 'normal');
  doc.text('|| Shreenathji Satya Chhe ||', PW - M, rightY - 8, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('BUYER', PW / 2 + 5, rightY);
  doc.text(`: ${contract.buyer.legalName}`, PW / 2 + 25, rightY);
  rightY += 5;

  doc.setFont('helvetica', 'normal');
  const buyerAddr = doc.splitTextToSize(contract.buyer.address, 75);
  doc.text(buyerAddr, PW / 2 + 27, rightY);
  rightY += (buyerAddr.length * 5);

  doc.text('CITY', PW / 2 + 5, rightY);
  doc.text(`: ${contract.buyer.city}`, PW / 2 + 25, rightY);
  rightY += 5;

  doc.text('GSTIN NO.', PW / 2 + 5, rightY);
  doc.text(`: ${contract.buyer.gstin || ''}`, PW / 2 + 25, rightY);
  rightY += 5;

  y = Math.max(leftY, rightY) + 2;
  doc.line(M, y, PW - M, y);
  y += 8;

  // ─── PRODUCT & SPECIFICATIONS ───
  const drawRow = (label: string, value: string, currentY: number) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, M, currentY);
    
    doc.setFont('helvetica', 'normal');
    const valLines = doc.splitTextToSize(`: ${value}`, W - 40);
    doc.text(valLines, M + 40, currentY);
    return currentY + (valLines.length * 6);
  };

  y = drawRow('PRODUCT', contract.product.name, y);

  const specArray = contract.contractSpecs || contract.product.specs || [];
  let specText = specArray.map((s: any) => `${s.value} ${s.unit || ''}`.trim()).join(', ');
  if (!specText) specText = 'CRUSHING QUALITY AS PER SAMPLE';
  y = drawRow('SPECIFICATION', specText, y);

  const qtyKg = contract.quantityUnit === 'MT' ? contract.quantity * 1000 : contract.quantity;
  let qtyText = `${contract.quantity} ${contract.quantityUnit}`;
  if (contract.packing && contract.packing.includes('50') && contract.quantityUnit === 'MT') {
     qtyText = `${(qtyKg / 50).toFixed(0)} bags X 50 Kg = ${qtyKg.toLocaleString('en-IN')} Kg`;
  } else if (contract.quantityUnit === 'MT') {
     qtyText = `${contract.quantity} MT = ${qtyKg.toLocaleString('en-IN')} Kg`;
  }
  y = drawRow('QUANTITY', qtyText, y);

  y = drawRow('PRICE', `${contract.price} Per ${contract.priceUnit}`, y);
  y = drawRow('PACKING', contract.packing || '50 KG PACKING', y);
  y = drawRow('DELIVERY AT', contract.deliveryLocation || 'Ex Factory', y);
  y = drawRow('LOADING CONDITION', contract.loadingCondition || 'GOODS TO BE LOADED WITHIN ONE WEEK', y);
  y = drawRow('PAYMENT', contract.paymentTerms || 'Ready Payment', y);

  const showBrokerage = type === 'broker_copy' || options.showTotalValue;
  y = drawRow('BROKERAGE', showBrokerage && contract.brokerageAmount ? contract.brokerageAmount.toString() : '', y);

  const otherTerms = contract.otherTerms || `AS PER GOVERMENT RULE, "${contract.gstPercent}% GST" EXTRA.`;
  y = drawRow('OTHER TERMS', otherTerms, y);

  y += 4;

  // ─── TERMS & CONDITIONS ───
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS', M, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const defaultTerms = [
    'FROM AS PER REQUIREMENT & BILL LEADING MUST ON PER BILL',
    'WE HAVE FULL POWER TO SETTLE ALL CLAIMS AMICABLY WILL BIND BOTH BUYER AND SELLER EQUALLY.',
    'BARGAINS MUST BE DESPATCHED IN TIME & ACCORDING TO CONDITION.',
    'AFTER DESPATCHING OF BARGAINS INTIMATION MUST BE GIVE TO US.',
    'IF ANY BARGAIN CANCELLED DUE TO ANY TIME LIMIT LOADING CONDITION OR ANY GOVT. RESTICTION.',
    'OUR BROKERAGE WILL BE CHARGED AS USUALY.',
    'THIS CONTRACT SUBJECT TO RESPONSIBILITY OF BOTH PARTIES AND EFFECTED AS A BROKER OF BOTH PARTIES WITH OUT ANY LIABILITIES.'
  ];

  const terms = settings.termsAndConditions.length > 0 ? settings.termsAndConditions : defaultTerms;

  terms.forEach((term) => {
    const splitText = doc.splitTextToSize(`•  ${term}`, W);
    doc.text(splitText, M, y);
    y += splitText.length * 4.5;
  });

  // ─── SIGNATURE BLOCK ───
  const footerY = PH - 35;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`For, ${settings.name}`, PW - M, footerY, { align: 'right' });

  if (settings.signature) {
    try {
      doc.addImage(settings.signature, 'PNG', PW - M - 40, footerY + 2, 40, 15);
    } catch (e) {}
  }

  doc.setFont('helvetica', 'normal');
  doc.text('AUTHORISED SIGNATURE', PW - M, footerY + 22, { align: 'right' });

  // Document Type Indicator (Bottom Left)
  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
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
  
  if (options.isDownload) {
    if ((settings as any).letterhead) {
      try {
        const lh = (settings as any).letterhead;
        const imgFormat = lh.includes('image/jpeg') ? 'JPEG' : 'PNG';
        doc.addImage(lh, imgFormat, 0, 0, 210, 55);
      } catch (e) {}
    } else {
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('MAHALAXMI AGRI COMMODITIES', PW / 2, 25, { align: 'center' });
    }
  }

  let y = 65;

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
