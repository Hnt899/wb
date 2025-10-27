import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("tariff_snapshots", (table) => {
        table.increments("id").primary();
        table.date("tariff_date").notNullable();
        table.jsonb("payload").notNullable();
        table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.unique(["tariff_date"], {
            indexName: "tariff_snapshots_tariff_date_unique",
        });
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable("tariff_snapshots");
}