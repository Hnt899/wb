import env from "#config/env/env.js";
import { refreshTariffs } from "#services/wbTariffsService.js";
import { syncSheetsWithLatestTariffs } from "#services/googleSheetsService.js";
import logger from "#utils/logger.js";

type StopHandle = { stop: () => void };

type TaskHandler = () => Promise<void>;

function scheduleHourlyTask(minuteOffset: number, handler: TaskHandler): StopHandle {
    let interval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;
    let stopped = false;

    const runHandler = async () => {
        if (stopped) {
            return;
        }
        try {
            await handler();
        } catch (error) {
            logger.error("Scheduled task failed", error);
        }
    };

    const scheduleNextRun = () => {
        const now = new Date();
        const next = new Date(now);
        next.setMinutes(minuteOffset, 0, 0);
        if (
            now.getMinutes() > minuteOffset ||
            (now.getMinutes() === minuteOffset && now.getSeconds() > 0) ||
            (now.getMinutes() === minuteOffset && now.getSeconds() === 0 && now.getMilliseconds() > 0)
        ) {
            next.setHours(next.getHours() + 1);
        }
        const delay = Math.max(next.getTime() - now.getTime(), 0);
        timeout = setTimeout(async () => {
            await runHandler();
            if (!stopped) {
                interval = setInterval(() => {
                    void runHandler();
                }, 60 * 60 * 1000);
            }
        }, delay);
    };

    scheduleNextRun();

    return {
        stop: () => {
            stopped = true;
            if (timeout) {
                clearTimeout(timeout);
            }
            if (interval) {
                clearInterval(interval);
            }
        },
    };
}

export async function startTariffSchedulers(): Promise<StopHandle> {
    await runInitialSync();

    const handles: StopHandle[] = [];
    handles.push(scheduleHourlyTask(env.WB_FETCH_MINUTE_OFFSET, async () => {
        const { rows } = await refreshTariffs();
        await syncSheetsWithLatestTariffs(rows);
    }));

    handles.push(
        scheduleHourlyTask(env.GOOGLE_SHEETS_UPDATE_MINUTE_OFFSET, async () => {
            await syncSheetsWithLatestTariffs();
        }),
    );

    return {
        stop: () => {
            handles.forEach((handle) => handle.stop());
        },
    };
}

async function runInitialSync(): Promise<void> {
    try {
        const { rows } = await refreshTariffs();
        await syncSheetsWithLatestTariffs(rows);
    } catch (error) {
        logger.error("Initial tariff sync failed", error);
    }
}
