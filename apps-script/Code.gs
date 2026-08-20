/**
 * Google Apps Script — prijíma dáta z výzkumu (dotazník + diskontovací
 * úloha) a zapisuje je do Google Sheets. Rozlišuje 3 typy záznamů podle
 * pole "record_type" a zapisuje je do 3 samostatných listů:
 *
 *   - "data"          — kompletní odpovědi účastníků (record_type: "survey")
 *   - "screened_out"  — lidé, kteří byli na začátku vyřazeni (věk < 18,
 *                        nebo nehráli hry za posledních 30 dní)
 *   - "raffle"        — e-maily pro žrebování o Steam poukázku
 *
 * DŮLEŽITÉ: list "raffle" NEOBSAHUJE participant_id ani žádné jiné
 * spojení s listem "data" — e-maily jsou záměrně neprovázané s
 * odpověďmi, aby zůstala zachována anonymita. Nesnaž se je ručně
 * propojovat (např. podle času odeslání) — to by anonymitu popřelo.
 *
 * TENTO SOUBOR JE LOKÁLNÍ KÓPIA PRE VERZOVANIE.
 * Google Apps Script editor NEČÍTA tento súbor priamo — po každej zmene
 * treba obsah ručně skopírovať do Extensions > Apps Script v Google
 * Sheete a znovu nasadiť (Deploy > Manage deployments > Edit > Deploy).
 *
 * NÁVOD NA NASAZENÍ (cca 5 minut):
 * 1. Vytvoř nový Google Sheet, zkopíruj si jeho ID z URL
 *    (docs.google.com/spreadsheets/d/TOTO_JE_ID/edit).
 * 2. Extensions > Apps Script, smaž předvyplněný kód, vlož tento soubor.
 * 3. Vlož zkopírované ID do konstanty SPREADSHEET_ID níže.
 * 4. Deploy > New deployment > Type: "Web app".
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 5. Deploy, potvrď oprávnění.
 * 6. Zkopíruj "Web app URL" (končí na /exec) a vlož ji do index.html,
 *    do CONFIG.GOOGLE_SCRIPT_URL.
 *
 * POZNÁMKA: Skript používá SpreadsheetApp.openById(SPREADSHEET_ID) místo
 * getActiveSpreadsheet() — funguje tak spolehlivě i pro samostatný
 * (standalone) Apps Script projekt, který není otevřený zevnitř Sheetu.
 */

const SHEET_NAMES = {
  survey: 'data',
  screened_out: 'screened_out',
  raffle: 'raffle',
};

// Vlož sem ID svojho Google Sheetu (z jeho URL:
// docs.google.com/spreadsheets/d/TOTO_JE_ID/edit)
const SPREADSHEET_ID = '1yNJDU0cOWTwUo761wO6Cvg_C2ajoljpRz43qbiH6cRg';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const recordType = data.record_type || 'survey';
    const sheetName = SHEET_NAMES[recordType] || 'data';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);

    const incomingKeys = Object.keys(data);
    let headers;
    if (sheet.getLastRow() === 0) {
      headers = incomingKeys;
      sheet.appendRow(headers);
    } else {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newKeys = incomingKeys.filter(k => headers.indexOf(k) === -1);
      if (newKeys.length > 0) {
        headers = headers.concat(newKeys);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }

    const row = headers.map(h => {
      const v = data[h];
      return (v === null || v === undefined) ? '' : v;
    });
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// rychly test primo v Apps Script editoru (Run > testDoPost)
function testDoPost() {
  const fake = { postData: { contents: JSON.stringify({ record_type: 'survey', participant_id: 'test_123', dd_k: 0.01 }) } };
  Logger.log(doPost(fake).getContent());
}
