import env from "#config/env/env.js";
import { upsertTariffSnapshot, TariffSnapshot } from "#postgres/repositories/tariffSnapshotsRepository.js";
import logger from "#utils/logger.js";

const TARIFFS_ENDPOINT = "https://common-api.wildberries.ru/api/v1/tariffs/box";

export interface TariffRow {
    coefficient: number;
    warehouseName: string | null;
    warehouseId: string | null;
    path: string;
    raw: unknown;
}

export interface TariffRefreshResult {
    snapshot: TariffSnapshot;
    rows: TariffRow[];
}

export async function fetchTariffsFromApi(): Promise<unknown> {
    const token = env.WB_API_TOKEN.startsWith("Bearer ")
        ? env.WB_API_TOKEN
        : `Bearer ${env.WB_API_TOKEN}`;
    const response = await fetch(TARIFFS_ENDPOINT, {
        headers: {
            Authorization: token,
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to fetch tariffs: ${response.status} ${response.statusText} - ${body}`);
    }

    return response.json();
}

export async function refreshTariffs(): Promise<TariffRefreshResult> {
    logger.info("Fetching tariffs from Wildberries API");
    const payload = await fetchTariffsFromApi();
    const now = new Date();
    const tariffDate = now.toISOString().slice(0, 10);
    const snapshot = await upsertTariffSnapshot(tariffDate, payload);
    const rows = extractTariffRows(payload);
    logger.info(`Stored tariff snapshot for ${tariffDate} with ${rows.length} coefficient rows`);
    return { snapshot, rows };
}

export function extractTariffRows(payload: unknown): TariffRow[] {
    const rows: TariffRow[] = [];

    function walk(node: unknown, path: string[]): void {
        if (Array.isArray(node)) {
            node.forEach((item, index) => {
                walk(item, [...path, `[${index}]`]);
            });
            return;
        }

        if (node && typeof node === "object") {
            const record = node as Record<string, unknown>;
            if (typeof record.coefficient === "number") {
                rows.push({
                    coefficient: record.coefficient,
                    warehouseName: typeof record.warehouseName === "string" ? record.warehouseName : null,
                    warehouseId:
                        typeof record.warehouseId === "number"
                            ? record.warehouseId.toString()
                            : typeof record.warehouseId === "string"
                              ? record.warehouseId
                              : null,
                    path: path.join("."),
                    raw: record,
                });
            }

            for (const [key, value] of Object.entries(record)) {
                walk(value, [...path, key]);
            }
        }
    }

    walk(payload, []);

    const unique = new Map<string, TariffRow>();
    for (const row of rows) {
        const key = `${row.path}-${row.warehouseId ?? ""}-${row.warehouseName ?? ""}-${row.coefficient}`;
        if (!unique.has(key)) {
            unique.set(key, row);
        }
    }

    return Array.from(unique.values()).sort((a, b) => a.coefficient - b.coefficient);
}
