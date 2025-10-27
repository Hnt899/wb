import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const numberString = z
    .string()
    .regex(/^[0-9]+$/)
    .transform((value) => parseInt(value));

const envSchema = z.object({
    NODE_ENV: z.union([z.undefined(), z.enum(["development", "production"])]),
    POSTGRES_HOST: z.union([z.undefined(), z.string()]),
    POSTGRES_PORT: z.union([z.undefined(), numberString]),
    POSTGRES_DB: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    APP_PORT: z.union([z.undefined(), numberString]),
    WB_API_TOKEN: z.string(),
    WB_FETCH_MINUTE_OFFSET: z.union([z.undefined(), numberString.refine((value) => value >= 0 && value < 60, {
        message: "WB_FETCH_MINUTE_OFFSET must be between 0 and 59",
    })]),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string(),
    GOOGLE_PRIVATE_KEY: z.string(),
    GOOGLE_SHEETS_UPDATE_MINUTE_OFFSET: z.union([
        z.undefined(),
        numberString.refine((value) => value >= 0 && value < 60, {
            message: "GOOGLE_SHEETS_UPDATE_MINUTE_OFFSET must be between 0 and 59",
        }),
    ]),
    GOOGLE_SHEETS_TARGET_SHEET: z.union([z.undefined(), z.string()]),
});

const parsed = envSchema.parse({
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
    APP_PORT: process.env.APP_PORT,
    WB_API_TOKEN: process.env.WB_API_TOKEN,
    WB_FETCH_MINUTE_OFFSET: process.env.WB_FETCH_MINUTE_OFFSET,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    GOOGLE_SHEETS_UPDATE_MINUTE_OFFSET: process.env.GOOGLE_SHEETS_UPDATE_MINUTE_OFFSET,
    GOOGLE_SHEETS_TARGET_SHEET: process.env.GOOGLE_SHEETS_TARGET_SHEET,
});

const env = {
    ...parsed,
    WB_FETCH_MINUTE_OFFSET: parsed.WB_FETCH_MINUTE_OFFSET ?? 0,
    GOOGLE_SHEETS_UPDATE_MINUTE_OFFSET: parsed.GOOGLE_SHEETS_UPDATE_MINUTE_OFFSET ?? 5,
    GOOGLE_SHEETS_TARGET_SHEET: parsed.GOOGLE_SHEETS_TARGET_SHEET ?? "stocks_coefs",
    GOOGLE_PRIVATE_KEY: parsed.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
};

export default env;