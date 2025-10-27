import knex, { migrate, seed } from "#postgres/knex.js";
import logger from "#utils/logger.js";
import { startTariffSchedulers } from "#services/scheduler.js";

async function bootstrap() {
    try {
        await migrate.latest();
        await seed.run();
        logger.info("Database migrations and seeds completed");
    } catch (error) {
        logger.error("Failed to run database migrations or seeds", error);
        throw error;
    }

    const schedulerHandle = await startTariffSchedulers();

    const shutdown = async (signal: NodeJS.Signals) => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        schedulerHandle.stop();
        await knex.destroy();
        process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}

bootstrap().catch((error) => {
    logger.fatal("Application failed to start", error);
    void knex.destroy().finally(() => {
        process.exit(1);
    });
});
