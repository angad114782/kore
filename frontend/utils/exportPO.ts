import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PurchaseOrder, Vendor } from "../types";

// Constant Company Info based on the user's provided image
const COMPANY_INFO = {
  name: "INNOVATIVE LIFESTYLE TECHNOLOGY PRIVATE LIMITED",
  cin: "U511909DL2020PTC3711873",
  gst: "07AAFC18644A1ZP",
  pan: "AAFC18644A",
  brand: "YOHO",
  invoiceTo: "INNOVATIVE LIFESTYLE TECHNOLOGY PRIVATE LIMITED, First Floor, M-24, Block-M, Badli Industrial Area Phase 1, GATE NO-4, New Delhi, North Delhi, Delhi, 110042",
  shipTo: "419/1, Village mundka, Near Under Pass, Mundka, New Delhi, West Delhi, 110041"
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  } catch (e) {
    return dateStr;
  }
};

export const exportPOToPDF = (po: PurchaseOrder, vendor?: Vendor) => {
  const doc = new jsPDF("portrait", "pt", "a4");

  // Font setup
  // doc.setFont("helvetica");

  // Logo text - substitute for image if image isn't available
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 190, 150); // greenish 'yoho' color from image
  doc.text("yoho", 40, 40);

  doc.setTextColor(0, 0, 0); // reset color

  // We construct the info table
  const vendorAddress = vendor 
    ? [
        vendor.billingAddress?.address1,
        vendor.billingAddress?.address2,
        vendor.billingAddress?.city,
        vendor.billingAddress?.state,
        vendor.billingAddress?.pinCode
      ].filter(Boolean).join(", ") 
    : "";

  const poDate = formatDate(po.date);
  const deliveryDate = formatDate(po.deliveryDate);
  // Estimate an expiry date if none exists, else just leave blank if our schema lacks it
  const expiryDate = ""; 

  // Calculate total order qty 
  const totalQty = po.items.reduce((sum, item) => sum + item.quantity, 0);

  const topTableData = [
    [
      { content: "Company Name", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_INFO.name,
      { content: "Vendor Name", styles: { fontStyle: "bold" } },
      vendor?.displayName || po.vendorName,
      { content: "PO Number", styles: { fontStyle: "bold" } },
      po.poNumber
    ],
    [
      { content: "CIN No.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_INFO.cin,
      { content: "Vendor Code", styles: { fontStyle: "bold" } },
      vendor ? `#${vendor.id.slice(-6).toUpperCase()}` : "", // Fallback
      { content: "PO Date", styles: { fontStyle: "bold" } },
      poDate
    ],
    [
      { content: "GST No.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_INFO.gst,
      { content: "GST No.", styles: { fontStyle: "bold" } },
      (vendor as any)?.gstNumber || "", // Assuming vendor has gstNumber,
      { content: "Brand", styles: { fontStyle: "bold" } },
      COMPANY_INFO.brand
    ],
    [
      { content: "PAN No.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_INFO.pan,
      { content: "PAN No.", styles: { fontStyle: "bold" } },
      (vendor as any)?.panNumber || vendor?.pan || "", // Assuming vendor has panNumber
      { content: "Delivery Date", styles: { fontStyle: "bold" } },
      deliveryDate
    ],
    [
      { content: "Invoice To", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_INFO.invoiceTo,
      { content: "Vendor address", styles: { fontStyle: "bold" } },
      vendorAddress,
      { content: "PO Expiry Date", styles: { fontStyle: "bold" } },
      expiryDate
    ],
    [
      { content: "Company address", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      "", // Left empty in image
      { content: "", colSpan: 2 },
      { content: "Total Value INR", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      po.total.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    ],
    [
      { content: "Ship To", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_INFO.shipTo,
      { content: "", colSpan: 2 },
      { content: "Total Order Qty.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      totalQty.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    ]
  ];

  // Draw the Title matching top block
  autoTable(doc, {
    startY: 20,
    margin: { left: 40, right: 40 },
    theme: "plain",
    styles: { cellPadding: 5, fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
    body: [
      [
        { content: "yoho", styles: { halign: "left", fontSize: 16, fontStyle: "bold", textColor: [110, 190, 150] } },
        { content: COMPANY_INFO.name, styles: { halign: "center", fontStyle: "bold", fontSize: 11 } },
        { content: "Purchase Order", styles: { halign: "left", fontSize: 14, fontStyle: "bold", fillColor: [240, 245, 240] } }
      ]
    ],
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 250 },
      2: { cellWidth: 'auto' }
    }
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY,
    margin: { left: 40, right: 40 },
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      valign: "middle"
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: "bold" },
      1: { cellWidth: 140 }, // Expanded for address and company name
      2: { cellWidth: 80, fontStyle: "bold" },
      3: { cellWidth: 120 }, // Vendor value
      4: { cellWidth: 60, fontStyle: "bold" },
      5: { cellWidth: 'auto' } // Last col
    },
    body: topTableData as any
  });

  // Table Data Mapping
  // EAN | HSN | STYLE NAME | STYLE NO. | SKU | MARKETED COLOR | GENDER | MRP | PO QTY | UNIT PRICE | TOTAL W/O GST | GST (%) | TOTAL VALUE
  const itemRows = po.items.map(item => {
    const parts = item.itemName.split("-");
    const styleName = parts.length > 0 ? parts[0] : "";
    const color = parts.length > 1 ? parts[1] : "";
    
    // Fallbacks if EAN isn't in item
    const ean = item.sku || ""; 
    const hsn = item.itemTaxCode || "";
    // Using Article ID / Variant ID mapping might be needed, but we rely on populated fields
    const styleNo = item.sku || "";
    const gender = "M"; // Default from image, or could be mapped if item has gender

    const totalWoGst = item.quantity * item.basePrice;

    return [
      ean,
      hsn,
      styleName,
      styleNo,
      item.sku,
      color,
      gender,
      item.basePrice.toFixed(1), // MRP
      item.quantity.toFixed(1), // PO QTY
      item.basePrice.toFixed(1), // UNIT PRICE
      totalWoGst, // TOTAL W/O GST
      item.taxRate.toFixed(1), // GST (%)
      item.unitTotal // TOTAL VALUE
    ];
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    margin: { left: 40, right: 40 },
    theme: "grid",
    headStyles: {
      fillColor: [240, 245, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 7,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      halign: "center",
      valign: "middle"
    },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      halign: "center",
      valign: "middle"
    },
    head: [[
      "EAN", "HSN", "STYLE\nNAME", "STYLE\nNO.", "SKU", "MARKETED\nCOLOR", 
      "GENDER", "MRP", "PO QTY", "UNIT\nPRICE", "TOTAL\nW/O GST", "GST (%)", "TOTAL\nVALUE"
    ]],
    body: itemRows
  });

  // Save the PDF
  doc.save(`${po.poNumber}.pdf`);
};
