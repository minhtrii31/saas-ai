import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { analysisRouter } from "./modules/analyses/analysis.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { comparisonRouter } from "./modules/comparisons/comparison.routes";
import { cvRouter } from "./modules/cvs/cv.routes";
import { documentRouter } from "./modules/documents/document.routes";
import { healthRouter } from "./modules/health/health.routes";
import { jobRouter } from "./modules/jobs/job.routes";
import { openApiRouter } from "./modules/openapi/openapi.routes";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { allowedClientOrigins } from "./middleware/origin-protection";
import { requestIdMiddleware } from "./middleware/request-id";
import { requestLogger } from "./middleware/request-logger";

const parseTrustProxy = (value: string): boolean | number | string => {
  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized === "false" || normalized === "0") {
    return false;
  }

  if (normalized === "true") {
    return true;
  }

  const proxyHopCount = Number(normalized);

  if (Number.isInteger(proxyHopCount) && proxyHopCount > 0) {
    return proxyHopCount;
  }

  return value;
};

export const createApp = (): express.Express => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", parseTrustProxy(env.TRUST_PROXY));

  app.use(requestIdMiddleware);
  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedClientOrigins().has(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.JSON_BODY_LIMIT }));
  app.use(cookieParser());

  app.use(healthRouter);
  app.use(openApiRouter);
  app.use(authRouter);
  app.use(cvRouter);
  app.use(analysisRouter);
  app.use(jobRouter);
  app.use(comparisonRouter);
  app.use(documentRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
