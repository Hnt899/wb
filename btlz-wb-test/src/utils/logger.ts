import log4js from "log4js";

const logger = log4js.getLogger();
logger.level = process.env.NODE_ENV === "development" ? "debug" : "info";

export default logger;