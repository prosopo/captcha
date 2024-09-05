// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { getLogLevel } from "@prosopo/common";
import {
  DatabaseTypes,
  EnvironmentTypesSchema,
  type ProsopoCaptchaCountConfigSchemaInput,
  type ProsopoCaptchaSolutionConfigSchema,
  type ProsopoConfigInput,
  type ProsopoConfigOutput,
  ProsopoConfigSchema,
} from "@prosopo/types";
import { getRateLimitConfig } from "./RateLimiter.js";
import { getAddress, getPassword, getSecret } from "./process.env.js";

function getMongoURI(): string {
  const protocol = process.env.PROSOPO_DATABASE_PROTOCOL || "mongodb";
  const mongoSrv = protocol === "mongodb+srv";
  const password = process.env.PROSOPO_DATABASE_PASSWORD || "root";
  const username = process.env.PROSOPO_DATABASE_USERNAME || "root";
  const host = process.env.PROSOPO_DATABASE_HOST || "localhost";
  const port = mongoSrv ? "" : `:${process.env.PROSOPO_DATABASE_PORT || 27017}`;
  const retries = mongoSrv ? "?retryWrites=true&w=majority" : "";
  const mongoURI = `${protocol}://${username}:${password}@${host}${port}/${retries}`;
  return mongoURI;
}

export default function getConfig(
  captchaSolutionsConfig?: typeof ProsopoCaptchaSolutionConfigSchema,
  captchaServeConfig?: ProsopoCaptchaCountConfigSchemaInput,
  who = "PROVIDER",
): ProsopoConfigOutput {
  return ProsopoConfigSchema.parse({
    logLevel: getLogLevel(),
    defaultEnvironment: process.env.PROSOPO_DEFAULT_ENVIRONMENT
      ? EnvironmentTypesSchema.parse(process.env.PROSOPO_DEFAULT_ENVIRONMENT)
      : EnvironmentTypesSchema.enum.development,
    account: {
      address: getAddress(who),
      password: getPassword(who),
      secret: getSecret(who),
    },
    database: {
      development: {
        type: DatabaseTypes.enum.provider,
        endpoint: getMongoURI(),
        dbname: process.env.PROSOPO_DATABASE_NAME,
        authSource: process.env.PROSOPO_DATABASE_AUTH_SOURCE,
      },
      staging: {
        type: DatabaseTypes.enum.provider,
        endpoint: getMongoURI(),
        dbname: process.env.PROSOPO_DATABASE_NAME,
        authSource: process.env.PROSOPO_DATABASE_AUTH_SOURCE,
      },
      production: {
        type: DatabaseTypes.enum.provider,
        endpoint: getMongoURI(),
        dbname: process.env.PROSOPO_DATABASE_NAME,
        authSource: process.env.PROSOPO_DATABASE_AUTH_SOURCE,
      },
    },
    server: {
      baseURL: process.env.PROSOPO_API_BASE_URL || "http://localhost",
      port: process.env.PROSOPO_API_PORT
        ? Number.parseInt(process.env.PROSOPO_API_PORT)
        : 9229,
    },
    captchaSolutions: captchaSolutionsConfig,
    captchas: captchaServeConfig,
    devOnlyWatchEvents: process.env._DEV_ONLY_WATCH_EVENTS === "true",
    mongoEventsUri: process.env.PROSOPO_MONGO_EVENTS_URI || "",
    mongoCaptchaUri: process.env.PROSOPO_MONGO_CAPTCHA_URI || "",
    mongoClientUri: process.env.PROSOPO_MONGO_CLIENT_URI || "",
    rateLimits: getRateLimitConfig(),
    proxyCount: process.env.PROSOPO_PROXY_COUNT
      ? Number.parseInt(process.env.PROSOPO_PROXY_COUNT)
      : 0,
    scheduledTasks: {
      captchaScheduler: {
        schedule: process.env.CAPTCHA_STORAGE_SCHEDULE,
      },
      clientListScheduler: {
        schedule: process.env.CLIENT_LIST_SCHEDULE,
      },
    },
  } as ProsopoConfigInput);
}
