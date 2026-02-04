

## WhatsApp Receipt Sharing Feature

### Overview

Add the ability to send Sanda payment receipts via WhatsApp. Since browsers cannot directly attach PDF files to WhatsApp messages, we'll implement a two-pronged approach:

1. **Text-based receipt summary** - Open WhatsApp with a pre-filled text message containing receipt details
2. **PDF with WhatsApp button** - Generate PDF, then offer a "Share via WhatsApp" button that opens WhatsApp with a message prompting the recipient to download/view the receipt

### How It Works

When the admin clicks "Send to WhatsApp":
1. The system checks if the family has a WhatsApp number stored
2. Opens WhatsApp (via `wa.me` URL) with a pre-formatted receipt summary message
3. The admin can also download the PDF separately to share as a file attachment if needed

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/utils/receiptGenerator.ts` | Add new function to generate receipt text for WhatsApp |
| `src/pages/Home.tsx` | Add "Send to WhatsApp" button alongside download button |
| `src/components/ui/icons.tsx` (optional) | Add WhatsApp icon if needed |

### Implementation Details

**1. New WhatsApp Receipt Text Generator**

Add a function to format receipt data as a WhatsApp-friendly text message:

```typescript
export const generateWhatsAppReceiptText = (data: ReceiptData): string => {
  const monthsText = data.monthsPaid.map(m => monthNames[m - 1]).join(", ");
  
  return `*MASJID AL-AHSAN*
_Sanda Payment Receipt_

*Donor:* ${data.donorName}
*Card No:* ${data.cardNumber}
${data.rootNo ? `*Root No:* ${data.rootNo}\n` : ''}
*Year:* ${data.year}
*Months Paid:* ${monthsText}
*Amount:* Rs. ${data.amount.toLocaleString()}
*Method:* ${data.method}
*Date:* ${new Date(data.date).toLocaleDateString("en-GB")}

_Thank you for your contribution._
_May Allah bless you._`;
};
```

**2. WhatsApp Share Function**

```typescript
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
```

**3. UI Changes in Home.tsx**

Add a WhatsApp share button in the donation list and the donation form:

- In the donation list, add a green WhatsApp icon button next to the download button
- In the "Save & Receipt" area, add a "Save & WhatsApp" option
- Show tooltip/error if family has no WhatsApp number stored

```text
+----------------------------------------+
| Donation Entry                         |
|                                        |
| Rs. 5,000                              |
| [Download] [WhatsApp] [Edit] [Delete]  |
+----------------------------------------+
```

### Technical Notes

- The `families` table already has a `whatsapp_no` field that stores the family's WhatsApp number
- WhatsApp URLs work on both mobile (opens app) and desktop (opens WhatsApp Web)
- Text formatting uses WhatsApp markdown (*bold*, _italic_)
- If no WhatsApp number is stored, the button will open WhatsApp without a recipient, allowing manual selection

### Limitations

- **Cannot auto-attach PDF files** - Browser security prevents this; users must manually share the downloaded PDF if needed
- **Recipient must have WhatsApp** - Obviously required for this feature to work
- **Phone number format** - Should ideally include country code (e.g., +92 for Pakistan)

