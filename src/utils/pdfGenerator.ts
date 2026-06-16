import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, CompanySettings, BrokerageBill, BillPayment } from '../types';
import { format } from 'date-fns';

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

  // ─── EXACT CONTRACT LAYOUT ───
  const startY = 55;
  const endY = 285;

  // 1. Draw Outer Border Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(M, startY, W, endY - startY);

  // 2. Header Row (NO. | CONTRACT NOTE | DATE)
  const row1Y = startY + 10;
  doc.line(M, row1Y, PW - M, row1Y);
  doc.line(55, startY, 55, row1Y);
  doc.line(155, startY, 155, row1Y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`NO.: ${contract.contractNo}`, M + 2, startY + 6.5);
  
  doc.setFontSize(12);
  doc.text('CONTRACT NOTE', PW / 2, startY + 6.5, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`DATE: ${format(new Date(contract.date), 'dd-MM-yyyy')}`, PW - M - 2, startY + 6.5, { align: 'right' });

  // 3. Parties Row (SELLER | BUYER)
  let ySeller = row1Y + 5;
  let yBuyer = row1Y + 5;

  // -- Seller (Left Side) --
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SELLER', M + 2, ySeller);
  doc.text(`: ${contract.seller.legalName}`, M + 25, ySeller);
  ySeller += 5;

  doc.setFont('helvetica', 'normal');
  const sellerAddr = doc.splitTextToSize(contract.seller.address || '', 80);
  doc.text(sellerAddr, M + 27, ySeller);
  ySeller += (sellerAddr.length * 5);

  doc.setFont('helvetica', 'bold');
  doc.text('CITY', M + 2, ySeller);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${contract.seller.city || ''}`, M + 25, ySeller);
  ySeller += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN NO.', M + 2, ySeller);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${contract.seller.gstin || ''}`, M + 25, ySeller);
  ySeller += 6;

  // -- Buyer (Right Side) --
  doc.setFont('helvetica', 'bold');
  doc.text('|| Shreenathji Satya Chhe ||', PW * 0.75, yBuyer, { align: 'center' });
  yBuyer += 6;

  doc.text('BUYER', PW / 2 + 2, yBuyer);
  doc.text(`: ${contract.buyer.legalName}`, PW / 2 + 25, yBuyer);
  yBuyer += 5;

  doc.setFont('helvetica', 'normal');
  const buyerAddr = doc.splitTextToSize(contract.buyer.address || '', 80);
  doc.text(buyerAddr, PW / 2 + 27, yBuyer);
  yBuyer += (buyerAddr.length * 5);

  doc.setFont('helvetica', 'bold');
  doc.text('CITY', PW / 2 + 2, yBuyer);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${contract.buyer.city || ''}`, PW / 2 + 25, yBuyer);
  yBuyer += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN NO.', PW / 2 + 2, yBuyer);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${contract.buyer.gstin || ''}`, PW / 2 + 25, yBuyer);
  yBuyer += 5;

  if (contract.buyer.pan) {
    doc.setFont('helvetica', 'bold');
    doc.text('PAN NO.', PW / 2 + 2, yBuyer);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${contract.buyer.pan}`, PW / 2 + 25, yBuyer);
    yBuyer += 5;
  }

  // Close Parties section with bottom and middle lines
  const row2Y = Math.max(ySeller, yBuyer) + 2;
  doc.line(M, row2Y, PW - M, row2Y);
  doc.line(PW / 2, row1Y, PW / 2, row2Y);

  // 4. Details Section
  let dy = row2Y + 6;
  const labelX = M + 2;
  const valueX = M + 45;

  const drawItem = (label: string, val: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, labelX, dy);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(`: ${val}`, W - 45);
    doc.text(lines, valueX, dy);
    dy += lines.length * 6;
  };

  drawItem('PRODUCT', contract.product.name);

  const specArray = contract.contractSpecs || contract.product.specs || [];
  let specText = specArray.map((s: any) => `${s.value} ${s.unit || ''}`.trim()).join(', ');
  if (!specText) specText = 'CRUSHING QUALITY AS PER SAMPLE';
  drawItem('SPECIFICATION', specText);

  const qtyKg = contract.quantityUnit === 'MT' ? contract.quantity * 1000 : contract.quantity;
  let qtyText = `${contract.quantity} ${contract.quantityUnit}`;
  if (contract.packing && contract.packing.includes('50') && contract.quantityUnit === 'MT') {
     qtyText = `${(qtyKg / 50).toFixed(0)} bags X 50 Kg = ${qtyKg.toLocaleString('en-IN')} Kg`;
  } else if (contract.quantityUnit === 'MT') {
     qtyText = `${contract.quantity} MT = ${qtyKg.toLocaleString('en-IN')} Kg`;
  }
  drawItem('QUANTITY', qtyText);

  drawItem('PRICE', `${contract.price} Per ${contract.priceUnit}`);
  drawItem('PACKING', contract.packing || '50 KG PACKING');
  drawItem('DELIVERY AT', contract.deliveryLocation || 'Ex Factory');
  drawItem('LOADING CONDITION', contract.loadingCondition || 'GOODS TO BE LOADED WITHIN ONE WEEK');
  drawItem('PAYMENT', contract.paymentTerms || 'Ready Payment');

  if (type === 'broker_copy' || options.showTotalValue) {
      drawItem('BROKERAGE', contract.brokerageAmount ? contract.brokerageAmount.toString() : '');
  } else {
      drawItem('BROKERAGE', '');
  }

  drawItem('OTHER TERMS', contract.otherTerms || `AS PER GOVERMENT RULE, "${contract.gstPercent}% GST" EXTRA.`);

  const row3Y = dy + 2;
  doc.line(M, row3Y, PW - M, row3Y);

  // 5. Terms & Conditions
  let ty = row3Y + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TERMS & CONDITIONS', PW / 2, ty, { align: 'center' });
  ty += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

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
      const lines = doc.splitTextToSize(term, W - 4);
      doc.text(lines, M + 2, ty);
      ty += lines.length * 4.5;
  });

  // 6. Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`For, ${settings.name || 'Mahalaxmi Agri Commodities'}`, PW - M - 2, endY - 25, { align: 'right' });

  if (settings.signature) {
      try {
          doc.addImage(settings.signature, 'PNG', PW - M - 45, endY - 22, 40, 14);
      } catch(e) {}
  }

  doc.setFont('helvetica', 'normal');
  doc.text('AUTHORISED SIGNATURE', PW - M - 2, endY - 4, { align: 'right' });

  const copyLabel = type === 'buyer_copy' ? 'BUYER COPY' : type === 'seller_copy' ? 'SELLER COPY' : 'BROKER COPY';
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100);
  doc.text(`** ${copyLabel} **`, M + 2, endY - 4);

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
  doc.setTextColor(20, 20, 20);
  doc.text('BROKERAGE BILL', PW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);

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

  doc.setDrawColor(160, 30, 50);
  doc.setLineWidth(0.5);
  doc.line(M, y, PW - M, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(160, 30, 50);
  doc.text('BILLED TO', M, y);
  y += 5;

  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(bill.party.legalName, M, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  if (bill.party.address) {
    doc.text(`${bill.party.address}, ${bill.party.city}, ${bill.party.state}`, M, y);
    y += 4;
  }
  if (bill.party.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text(`GSTIN: `, M, y);
    doc.setTextColor(60, 60, 60);
    doc.text(bill.party.gstin, M + 12, y);
    y += 4;
  }
  y += 2;

  if (bill.status || bill.paidAmount > 0) {
    doc.setFillColor(248, 249, 250);
    doc.rect(M, y, W, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const statusText = bill.status === 'paid' ? 'PAID' : bill.status === 'partial' ? 'PARTIALLY PAID' : 'PENDING';
    
    if (bill.status === 'paid') {
      doc.setTextColor(30, 130, 70);
    } else {
      doc.setTextColor(160, 30, 50);
    }
    
    doc.text(`Status: ${statusText}`, M + 4, y + 6.5);

    doc.setTextColor(20, 20, 20);
    if (bill.paidAmount > 0) {
      doc.text(`Paid: Rs. ${bill.paidAmount.toLocaleString('en-IN')}`, PW / 2, y + 6.5, { align: 'center' });
    }
    
    doc.setFontSize(10);
    if (bill.balanceAmount > 0) {
      doc.setTextColor(160, 30, 50);
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
      fillColor: [248, 249, 250],
      textColor: [80, 80, 80],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: [225, 230, 235],
      lineWidth: 0.1
    },
    bodyStyles: { 
      fontSize: 8.5,
      textColor: 20,
      lineColor: [225, 230, 235],
      lineWidth: 0.1,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold', textColor: 60 }
    },
    margin: { left: M, right: M },
    tableWidth: W
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  
  doc.setFillColor(248, 249, 250);
  doc.rect(PW - M - 80, finalY, 80, 10, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Total Brokerage:', PW - M - 76, finalY + 6.5);
  doc.setTextColor(160, 30, 50);
  doc.text(`Rs. ${bill.totalBrokerage.toLocaleString('en-IN')}`, PW - M - 4, finalY + 6.5, { align: 'right' });

  if (bill.payments && bill.payments.length > 0) {
    let payY = finalY + 18;
    
    doc.setFillColor(248, 249, 250);
    doc.rect(M, payY, W, 8, 'F');
    doc.setDrawColor(160, 30, 50);
    doc.setLineWidth(0.8);
    doc.line(M, payY, M, payY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text('PAYMENT HISTORY', M + 4, payY + 5.5);
    payY += 12;

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
        textColor: 120,
        fontStyle: 'bold',
        fontSize: 8,
        lineWidth: 0.1,
        lineColor: [225, 230, 235]
      },
      bodyStyles: { 
        fontSize: 8.5, 
        textColor: 60,
        lineWidth: 0.1,
        lineColor: [225, 230, 235]
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
  doc.setTextColor(120, 120, 120);
  doc.text('This is a computer generated bill.', PW / 2, 285, { align: 'center' });

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const getPDFBlob = (doc: jsPDF): Blob => {
  return doc.output('blob');
};
