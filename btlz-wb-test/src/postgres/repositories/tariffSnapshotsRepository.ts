import knex from "#postgres/knex.js";

export interface TariffSnapshot {
    id: number;
    tariff_date: string;
    payload: unknown;
    updated_at: Date;
}

export async function upsertTariffSnapshot(
    tariffDate: string,
    payload: unknown,
): Promise<TariffSnapshot> {
    const [row] = await knex("tariff_snapshots")
        .insert({ tariff_date: tariffDate, payload })
        .onConflict("tariff_date")
        .merge({ payload, updated_at: knex.fn.now() })
        .returning(["id", "tariff_date", "payload", "updated_at"]);

    return {
        id: row.id,
        tariff_date: row.tariff_date,
        payload: row.payload,
        updated_at: new Date(row.updated_at),
    };
}

export async function getLatestTariffSnapshot(): Promise<TariffSnapshot | null> {
    const row = await knex("tariff_snapshots")
        .orderBy("tariff_date", "desc")
        .first(["id", "tariff_date", "payload", "updated_at"]);

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        tariff_date: row.tariff_date,
        payload: row.payload,
        updated_at: new Date(row.updated_at),
    };
}
