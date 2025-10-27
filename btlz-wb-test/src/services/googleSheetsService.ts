import env from "#config/env/env.js";
import { getLatestTariffSnapshot } from "#postgres/repositories/tariffSnapshotsRepository.js";
import { listSpreadsheets } from "#postgres/repositories/spreadsheetsRepository.js";
import { extractTariffRows, TariffRow } from "#services/wbTariffsService.js";
import logger from "#utils/logger.js";
import { google } from "googleapis";

const sheetsScopes = ["https://www.googleapis.com/auth/spreadsheets"]; 

function createSheetsClient() {
    const auth = new google.auth.JWT({
        email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: env.GOOGLE_PRIVATE_KEY,
        scopes: sheetsScopes,
    });
    return google.sheets({ version: "v4", auth });
}

function buildSheetValues(rows: TariffRow[]): string[][] {
    const header = ["Coefficient", "Warehouse name", "Warehouse id", "Path", "Raw JSON"];
    const values = rows.map((row) => [
        row.coefficient.toString(),
        row.warehouseName ?? "",
        row.warehouseId ?? "",
        row.path,
        JSON.stringify(row.raw),
    ]);
    return [header, ...values];
}

export async function syncSheetsWithLatestTariffs(preloadedRows?: TariffRow[]): Promise<void> {
    const spreadsheets = await listSpreadsheets();
    if (spreadsheets.length === 0) {
        logger.warn("No spreadsheets configured, skipping Google Sheets sync");
        return;
    }

    const rows = preloadedRows ?? (await loadRowsFromSnapshot());
    if (!rows || rows.length === 0) {
        logger.warn("No tariff rows available to push to Google Sheets");
        return;
    }

    const sheetsClient = createSheetsClient();
    const range = `${env.GOOGLE_SHEETS_TARGET_SHEET}!A1:E`;
    const values = buildSheetValues(rows);

    for (const spreadsheet of spreadsheets) {
        logger.info(`Updating spreadsheet ${spreadsheet.spreadsheet_id}`);
        await sheetsClient.spreadsheets.values.clear({
            spreadsheetId: spreadsheet.spreadsheet_id,
            range,
        });
        await sheetsClient.spreadsheets.values.update({
            spreadsheetId: spreadsheet.spreadsheet_id,
            range,
            valueInputOption: "RAW",
            requestBody: {
                values,
            },
        });
    }
}

async function loadRowsFromSnapshot(): Promise<TariffRow[] | null> {
    const snapshot = await getLatestTariffSnapshot();
    if (!snapshot) {
        return null;
    }
    return extractTariffRows(snapshot.payload);
}