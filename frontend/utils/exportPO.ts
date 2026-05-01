import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { PurchaseOrder, Vendor } from "../types";
import { COMPANY_CONFIG } from "../constants";

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

export const exportPOToPDF = (
  po: PurchaseOrder,
  vendor?: Vendor,
  opts?: { isBill?: boolean }
) => {
  const isBill = opts?.isBill ?? !!(po as any).billStatus;
  const doc = new jsPDF("portrait", "pt", "a4");

  const vendorAddress = vendor
    ? [
        vendor.billingAddress?.address1,
        vendor.billingAddress?.address2,
        vendor.billingAddress?.city,
        vendor.billingAddress?.state,
        vendor.billingAddress?.pinCode,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const poDate = formatDate(po.date);
  const deliveryDate = formatDate(po.deliveryDate);
  const expiryDate = "";

  const totalQty = po.items.reduce((sum, item) => sum + item.quantity, 0);

  const topTableData: any[] = [];
  topTableData.push([
    { content: "Company Name", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
    vendor?.companyName || vendor?.displayName || COMPANY_CONFIG.name,
    { content: "Vendor Name", styles: { fontStyle: "bold" } },
    vendor?.displayName || po.vendorName,
    { content: "PO Number", styles: { fontStyle: "bold" } },
    po.poNumber,
  ]);

  topTableData.push([
    { content: "CIN No.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
    vendor?.cinNumber || COMPANY_CONFIG.cin,
    { content: "Vendor Code", styles: { fontStyle: "bold" } },
    vendor?.vendorCode || "",
    { content: "PO Date", styles: { fontStyle: "bold" } },
    poDate,
  ]);

  topTableData.push([
    { content: "GST No.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
    vendor?.gstNumber || COMPANY_CONFIG.gst,
    { content: "Brand", styles: { fontStyle: "bold" } },
    vendor?.brand || COMPANY_CONFIG.brand,
    { content: "Delivery Date", styles: { fontStyle: "bold" } },
    deliveryDate,
  ]);

  topTableData.push([
    { content: "PAN No.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
    vendor?.pan || COMPANY_CONFIG.pan,
    { content: "Total Value INR", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
    po.total.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    { content: "Total Order Qty.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
    totalQty.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  ]);

  topTableData.push([
    { content: "Invoice To", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
    vendorAddress || COMPANY_CONFIG.invoiceTo,
    { content: "Vendor address", styles: { fontStyle: "bold" } },
    vendorAddress,
    { content: "PO Expiry Date", styles: { fontStyle: "bold" } },
    expiryDate,
  ]);

  topTableData.push([
    { content: "Ship To", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
    vendorAddress || COMPANY_CONFIG.shipTo,
    { content: "Contact Person", styles: { fontStyle: "bold" } },
    vendor?.displayName || "",
    { content: "Phone", styles: { fontStyle: "bold" } },
    vendor?.mobile || vendor?.workPhone || "",
  ]);

  if ((po as any).billRemark) {
    topTableData.push([
      { content: "Bill Remark", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      (po as any).billRemark, "", "", "", "",
    ]);
  }

  autoTable(doc, {
    startY: 20,
    margin: { left: 40, right: 40 },
    theme: "plain",
    styles: { cellPadding: 5, fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
    body: [[
      { content: vendor?.companyName || COMPANY_CONFIG.name, styles: { halign: "left", fontStyle: "bold", fontSize: 11 } },
      { content: isBill ? "Proforma Invoice / Bill" : "Purchase Order", styles: { halign: "center", fontSize: 14, fontStyle: "bold", fillColor: [240, 245, 240] } },
      { content: "", styles: { halign: "right" } },
    ]],
    columnStyles: { 0: { cellWidth: 200 }, 1: { cellWidth: 200 }, 2: { cellWidth: "auto" } },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY,
    margin: { left: 40, right: 40 },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 4, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5, valign: "middle" },
    columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" }, 1: { cellWidth: 140 }, 2: { cellWidth: 80, fontStyle: "bold" }, 3: { cellWidth: 120 }, 4: { cellWidth: 60, fontStyle: "bold" }, 5: { cellWidth: "auto" } },
    body: topTableData,
  });

  const itemRows: any[] = [];
  po.items.forEach((item) => {
    const parts = item.itemName.split("-").map((p) => p.trim());
    const masterName = parts[0] || "";
    const styleBase = parts.slice(0, 2).join("-");
    const styleNo = styleBase;
    const color = parts.length > 1 ? parts[1] : "";
    const gender = "M";

    let sizeMap: any = {};
    if (item.sizeMap) {
      if (typeof (item.sizeMap as any).get === "function") {
        (item.sizeMap as any).forEach((v: any, k: string) => { sizeMap[k] = v; });
      } else {
        sizeMap = item.sizeMap;
      }
    }

    const cartonCount = item.cartonCount || Math.floor((item.quantity || 0) / 24) || 0;
    const sizeEntries = Object.entries(sizeMap);
    const validSizes = sizeEntries.filter(([_, data]: [string, any]) => data && data.qty > 0);

    if (validSizes.length > 0) {
      validSizes.forEach(([size, data]: [string, any]) => {
        const totalQtyForItem = data.qty * cartonCount;
        const totalWoGst = totalQtyForItem * item.basePrice;
        const taxVal = totalQtyForItem * (item.taxRate || 0);
        const totalValue = totalWoGst + taxVal;

        itemRows.push([
          "", item.itemTaxCode || "", `${masterName}-${size}`, styleNo, data.sku || `${styleBase}-${size}`,
          color, gender, item.mrp.toFixed(1), `${data.qty}x${cartonCount}=${totalQtyForItem}`,
          item.basePrice.toFixed(1), totalWoGst.toFixed(2), taxVal.toFixed(2), totalValue.toFixed(2),
        ]);
      });
    } else {
      const totalQtyForItem = item.quantity * cartonCount;
      const totalWoGst = totalQtyForItem * item.basePrice;
      const taxVal = totalQtyForItem * (item.taxRate || 0);
      itemRows.push([
        "", item.itemTaxCode || "", item.itemName, styleNo, item.sku, color, gender,
        item.mrp.toFixed(1), `${item.quantity}x${cartonCount}=${totalQtyForItem}`,
        item.basePrice.toFixed(1), totalWoGst.toFixed(2), taxVal.toFixed(2), (totalWoGst + taxVal).toFixed(2),
      ]);
    }
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    margin: { left: 40, right: 40 },
    theme: "grid",
    headStyles: { fillColor: [240, 245, 240], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 6.5, lineColor: [0, 0, 0], lineWidth: 0.5, halign: "center", valign: "middle" },
    styles: { fontSize: 6.5, cellPadding: 2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5, halign: "center", valign: "middle", overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 35 }, 2: { cellWidth: 45, halign: "left" }, 3: { cellWidth: 55 }, 4: { cellWidth: 55 }, 5: { cellWidth: 40 }, 6: { cellWidth: 25 }, 7: { cellWidth: 30 }, 8: { cellWidth: 55, fontStyle: "bold" }, 9: { cellWidth: 35 }, 10: { cellWidth: 40 }, 11: { cellWidth: 35 }, 12: { cellWidth: 50 } },
    head: [["EAN", "HSN", "STYLE\nNAME", "STYLE\nNO.", "SKU", "COLOR", "GENDER", "MRP", "QTY\n(Formula)", "PRICE", "TOTAL\nW/O GST", "TAX", "TOTAL\nVALUE"]],
    body: itemRows,
  });

  doc.save(`${po.poNumber}.pdf`);
};

export const exportOrderToExcel = async (po: PurchaseOrder, vendor?: Vendor) => {
  const isBill = !!(po as any).billStatus;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(isBill ? "Bill" : "Purchase Order");

  worksheet.columns = [
    { header: "EAN", key: "ean", width: 15 },
    { header: "HSN", key: "hsn", width: 15 },
    { header: "STYLE NAME", key: "styleName", width: 30 },
    { header: "STYLE NO.", key: "styleNo", width: 25 },
    { header: "SKU", key: "sku", width: 25 },
    { header: "COLOR", key: "color", width: 20 },
    { header: "GENDER", key: "gender", width: 10 },
    { header: "MRP (₹)", key: "mrp", width: 12 },
    { header: "QTY (Formula)", key: "qtyFormula", width: 20 },
    { header: "TOTAL QTY", key: "totalQty", width: 12 },
    { header: "UNIT PRICE (₹)", key: "unitPrice", width: 15 },
    { header: "TOTAL W/O GST (₹)", key: "totalWoGst", width: 20 },
    { header: "TAX (₹)", key: "taxVal", width: 15 },
    { header: "GST (%)", key: "gstPercent", width: 10 },
    { header: "TOTAL VALUE (₹)", key: "totalValue", width: 20 },
  ];

  const titleRow = worksheet.insertRow(1, [isBill ? "PROFORMA INVOICE / BILL" : "PURCHASE ORDER"]);
  titleRow.font = { size: 18, bold: true, color: { argb: "FF000000" } };
  worksheet.mergeCells(1, 1, 1, 15);
  titleRow.alignment = { horizontal: "center", vertical: "middle" };
  titleRow.height = 35;

  const addHeaderInfo = (rowIdx: number, label1: string, val1: any, label2: string, val2: any, label3: string, val3: any) => {
    const row = worksheet.insertRow(rowIdx, [label1, val1, "", label2, val2, "", label3, val3]);
    row.font = { bold: false, size: 10 };
    row.getCell(1).font = { bold: true };
    row.getCell(4).font = { bold: true };
    row.getCell(7).font = { bold: true };
    worksheet.mergeCells(rowIdx, 1, rowIdx, 1);
    worksheet.mergeCells(rowIdx, 2, rowIdx, 3);
    worksheet.mergeCells(rowIdx, 4, rowIdx, 4);
    worksheet.mergeCells(rowIdx, 5, rowIdx, 6);
    worksheet.mergeCells(rowIdx, 7, rowIdx, 7);
    worksheet.mergeCells(rowIdx, 8, rowIdx, 15);
    row.height = 20;
    return row;
  };

  addHeaderInfo(2, "Company Name", vendor?.companyName || COMPANY_CONFIG.name, "Vendor Name", po.vendorName, "PO Number", po.poNumber);
  addHeaderInfo(3, "CIN No.", vendor?.cinNumber || COMPANY_CONFIG.cin, "Vendor Code", vendor?.vendorCode || "—", "PO Date", formatDate(po.date));
  addHeaderInfo(4, "GST No.", vendor?.gstNumber || COMPANY_CONFIG.gst, "Vendor GST", vendor?.gstNumber || "—", "Delivery Date", formatDate(po.deliveryDate));
  addHeaderInfo(5, "PAN No.", vendor?.pan || COMPANY_CONFIG.pan, "Vendor PAN", vendor?.pan || "—", "Total Value (₹)", po.total?.toFixed(2));

  const vendorAddress = vendor ? [
    vendor.billingAddress?.address1, vendor.billingAddress?.address2, vendor.billingAddress?.city, vendor.billingAddress?.state, vendor.billingAddress?.pinCode,
  ].filter(Boolean).join(", ") : "";

  addHeaderInfo(6, "Vendor Address", vendorAddress || "—", "Contact", vendor?.displayName || "—", "Phone", vendor?.mobile || "—");
  addHeaderInfo(7, "Brand", vendor?.brand || COMPANY_CONFIG.brand, "Terms", "—", "Total Qty", po.items.reduce((sum, item) => sum + item.quantity, 0).toFixed(0));

  worksheet.addRow([]);

  const tableHeaderRow = worksheet.getRow(9);
  tableHeaderRow.values = ["EAN", "HSN", "STYLE NAME", "STYLE NO.", "SKU", "COLOR", "GENDER", "MRP (₹)", "QTY (Formula)", "TOTAL QTY", "UNIT PRICE (₹)", "TOTAL W/O GST (₹)", "TAX (₹)", "GST (%)", "TOTAL VALUE (₹)"];
  tableHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  tableHeaderRow.height = 25;
  tableHeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "medium" }, right: { style: "thin" } };
  });

  po.items.forEach((item) => {
    const parts = item.itemName.split("-").map((p) => p.trim());
    const masterName = parts[0] || "";
    const styleBase = parts.slice(0, 2).join("-");
    const color = parts.length > 1 ? parts[1] : "";
    const gender = "M";

    let sizeMap: any = {};
    if (item.sizeMap) {
      if (typeof (item.sizeMap as any).get === "function") { (item.sizeMap as any).forEach((v: any, k: string) => { sizeMap[k] = v; }); }
      else { sizeMap = item.sizeMap; }
    }

    const cartonCount = item.cartonCount || Math.floor((item.quantity || 0) / 24) || 0;
    const validSizes = Object.entries(sizeMap).filter(([_, data]: [string, any]) => data && data.qty > 0);

    if (validSizes.length > 0) {
      validSizes.forEach(([size, data]: [string, any]) => {
        const totalQty = data.qty * cartonCount;
        const totalWoGst = totalQty * item.basePrice;
        const taxVal = totalQty * (item.taxRate || 0);
        const totalValue = totalWoGst + taxVal;
        worksheet.addRow({
          ean: "", hsn: item.itemTaxCode || "", styleName: `${masterName}-${size}`, styleNo: styleBase, sku: data.sku || `${styleBase}-${size}`,
          color: color, gender: gender, mrp: item.mrp, qtyFormula: `${data.qty}x${cartonCount}`, totalQty: totalQty,
          unitPrice: item.basePrice, totalWoGst: totalWoGst, taxVal: taxVal, gstPercent: item.taxRate, totalValue: totalValue,
        });
      });
    } else {
      const totalQty = item.quantity * cartonCount;
      const totalWoGst = totalQty * item.basePrice;
      const taxVal = totalQty * (item.taxRate || 0);
      worksheet.addRow({
        ean: "", hsn: item.itemTaxCode || "", styleName: item.itemName, styleNo: styleBase, sku: item.sku, color: color, gender: gender,
        mrp: item.mrp, qtyFormula: `${item.quantity}x${cartonCount}`, totalQty: totalQty, unitPrice: item.basePrice,
        totalWoGst: totalWoGst, taxVal: taxVal, gstPercent: item.taxRate, totalValue: totalWoGst + taxVal,
      });
    }
  });

  worksheet.addRow([]);
  const addSummaryRow = (label: string, value: any) => {
    const row = worksheet.addRow(["", "", "", "", "", "", "", "", "", "", "", label, "", "", value]);
    row.font = { bold: true };
    worksheet.mergeCells(row.number, 12, row.number, 14);
    row.getCell(12).alignment = { horizontal: "right" };
    row.getCell(15).alignment = { horizontal: "right" };
    return row;
  };

  addSummaryRow("Sub Total (₹)", po.subTotal?.toFixed(2));
  addSummaryRow(`Discount (${po.discountPercent || 0}%) (₹)`, po.discountAmount?.toFixed(2));
  addSummaryRow("Total Tax (₹)", po.totalTax?.toFixed(2));
  const finalRow = addSummaryRow("TOTAL AMOUNT (₹)", po.total?.toFixed(2));
  finalRow.font = { bold: true, size: 12 };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < 9) return;
    row.eachCell((cell) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    });
  });

  worksheet.columns.forEach(col => {
    let maxLen = 0;
    col.eachCell?.({ includeEmpty: true }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(Math.max(maxLen + 5, 12), 60);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${po.poNumber}.xlsx`);
};
