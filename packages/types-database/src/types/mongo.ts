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
import { Logger, TranslationKey, TranslationKeysSchema } from "@prosopo/common";
import type { Hash } from "@prosopo/types";
import type { PendingCaptchaRequest } from "@prosopo/types";
import {
  ScheduledTaskNames,
  type ScheduledTaskResult,
  ScheduledTaskStatus,
} from "@prosopo/types";
import type { DeleteResult } from "mongodb";
import mongoose, {
  type Connection,
  type Model,
  ObjectId,
  Schema,
} from "mongoose";

export interface IDatabase {
  url: string;
  dbname: string;
  connection?: Connection;
  logger: Logger;

  getConnection(): Connection;

  connect(): Promise<void>;

  close(): Promise<void>;
}
