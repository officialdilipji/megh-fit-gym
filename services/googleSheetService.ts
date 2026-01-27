
import { Member } from '../types';

/**
 * GOOGLE SHEET SYNC SETUP:
 * 1. Open Google Sheets -> Extensions -> Apps Script.
 * 2. Paste the following code:
 * 
 * function doPost(e) {
 *   try {
 *     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *     var data = JSON.parse(e.postData.contents);
 *     sheet.appendRow([
 *       new Date().toLocaleString(),
 *       data.id,
 *       data.name,
 *       data.age,
 *       data.gender,
 *       data.phone,
 *       data.email,
 *       data.tier,
 *       data.amountPaid,
 *       data.paymentMethod,
 *       data.transactionId || "N/A",
 *       data.status,
 *       data.registrationSource, // Added source to distinguish QR entries
 *       data.joinDate,
 *       data.expiryDate,
 *       data.fitnessGoals
 *     ]);
 *     return ContentService.createTextOutput(JSON.stringify({"result": "success"}))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   } catch (f) {
 *     return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": f.toString()}))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 * 
 * 3. Deploy -> New Deployment -> Type: Web App -> Who has access: Anyone.
 * 4. Paste your Web App URL into the constant below.
 */

const GOOGLE_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbzAEibTXvnR6CivaStjyFx9oBzfKk5WtMVA-DyAENhAH-ZXdMDsibSlIDVmCagbDuZi/exec'; 

export const syncMemberToSheet = async (member: Member) => {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === '') {
    console.warn("Cloud Sync: URL is missing. Check googleSheetService.ts");
    return false;
  }

  try {
    // We use mode: 'no-cors' because Google Scripts redirect to a different URL
    // which normally causes a CORS error in standard fetch mode.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(member),
    });
    
    console.log(`Cloud Sync: Sent ${member.name} (${member.registrationSource}) to Sheets.`);
    return true;
  } catch (error) {
    console.error("Cloud Sync Error:", error);
    return false;
  }
};
