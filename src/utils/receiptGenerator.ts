import jsPDF from "jspdf";

interface ReceiptData {
  donorName: string;
  cardNumber: string;
  rootNo?: string;
  phone?: string;
  address?: string;
  amount: number;
  date: string;
  method: string;
  year: number;
  monthsPaid: number[];
  paymentFrequency?: string;
  receiptNo?: string;
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const generateSandaReceipt = async (data: ReceiptData): Promise<void> => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 15;

  // Load and add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => {
        const logoWidth = 30;
        const logoHeight = 30;
        const logoX = (pageWidth - logoWidth) / 2;
        
        const canvas = document.createElement("canvas");
        canvas.width = logoImg.width;
        canvas.height = logoImg.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(logoImg, 0, 0);
          const imgData = canvas.toDataURL("image/png");
          doc.addImage(imgData, "PNG", logoX, yPos, logoWidth, logoHeight);
        }
        resolve();
      };
      logoImg.onerror = () => {
        console.warn("Could not load logo, skipping...");
        resolve();
      };
      // Use the imported logo path
      logoImg.src = "/ahsan-logo.png";
    });
    
    yPos += 35;
  } catch (error) {
    console.warn("Error loading logo:", error);
    yPos += 5;
  }

  // Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("MASJID AL-AHSAN", pageWidth / 2, yPos, { align: "center" });
  yPos += 5;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Regd No: R/2327/K/253", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Receipt title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SANDA PAYMENT RECEIPT", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Receipt number and date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const receiptNo = data.receiptNo || `RCP-${Date.now().toString().slice(-8)}`;
  doc.text(`Receipt No: ${receiptNo}`, margin, yPos);
  doc.text(`Date: ${new Date(data.date).toLocaleDateString("en-GB")}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 10;

  // Divider line
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Donor information section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Donor Information", margin, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const addField = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 35, yPos);
    yPos += 5;
  };

  addField("Name", data.donorName);
  addField("Card No", data.cardNumber);
  if (data.rootNo) addField("Root No", data.rootNo);
  if (data.phone) addField("Phone", data.phone);
  yPos += 3;

  // Divider line
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Payment details section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Details", margin, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  addField("Year", data.year.toString());
  addField("Payment Type", data.paymentFrequency === "yearly" ? "Yearly Payment" : "Monthly Payment");
  addField("Method", data.method.charAt(0).toUpperCase() + data.method.slice(1).replace("_", " "));
  yPos += 2;

  // Months paid
  if (data.monthsPaid.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Months Paid:", margin, yPos);
    yPos += 5;
    
    doc.setFont("helvetica", "normal");
    const monthsText = data.monthsPaid.map(m => monthNames[m - 1]).join(", ");
    
    // Handle text wrapping for months
    const maxWidth = pageWidth - margin * 2;
    const splitMonths = doc.splitTextToSize(monthsText, maxWidth);
    doc.text(splitMonths, margin, yPos);
    yPos += (splitMonths.length * 4) + 3;
  }

  yPos += 3;
  
  // Amount box
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 15, 2, 2, "F");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount:", margin + 5, yPos + 9);
  doc.setFontSize(14);
  doc.text(`Rs. ${data.amount.toLocaleString()}`, pageWidth - margin - 5, yPos + 9, { align: "right" });
  yPos += 22;

  // Divider line
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("This is a computer-generated receipt.", pageWidth / 2, yPos, { align: "center" });
  yPos += 4;
  doc.text("Thank you for your contribution. May Allah bless you.", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Signature area
  doc.setFont("helvetica", "normal");
  doc.line(pageWidth - margin - 40, yPos + 10, pageWidth - margin, yPos + 10);
  doc.text("Authorized Signature", pageWidth - margin - 20, yPos + 15, { align: "center" });

  // Save the PDF
  const fileName = `Sanda_Receipt_${data.cardNumber}_${data.year}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
};

// Generate WhatsApp-friendly text message for receipt
export const generateWhatsAppReceiptText = (data: ReceiptData): string => {
  const monthsText = data.monthsPaid.map(m => monthNames[m - 1]).join(", ");
  
  return `*MASJID AL-AHSAN*
_Sanda Payment Receipt_

*Donor:* ${data.donorName}
*Card No:* ${data.cardNumber}
${data.rootNo ? `*Root No:* ${data.rootNo}\n` : ''}*Year:* ${data.year}
*Months Paid:* ${monthsText}
*Amount:* Rs. ${data.amount.toLocaleString()}
*Method:* ${data.method.charAt(0).toUpperCase() + data.method.slice(1).replace("_", " ")}
*Date:* ${new Date(data.date).toLocaleDateString("en-GB")}

_Thank you for your contribution._
_May Allah bless you._`;
};

// Share receipt via WhatsApp
export const shareReceiptViaWhatsApp = (
  phoneNumber: string | undefined, 
  receiptText: string
): void => {
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phoneNumber?.replace(/[\s\-\(\)]/g, "") || "";
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(receiptText);
  
  // Build WhatsApp URL
  let whatsappUrl: string;
  if (cleanPhone) {
    whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  } else {
    // If no phone, open WhatsApp without specific recipient
    whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  }
  
  // Open WhatsApp
  window.open(whatsappUrl, "_blank");
};
