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

import { getLoggerDefault } from "@prosopo/common";
import {
  PowCaptchaRecord,
  PowCaptchaRecordSchema,
  type UserCommitmentRecord,
  UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import mongoose from "mongoose";
import { PoWCaptchaUser } from "@prosopo/types";
const logger = getLoggerDefault();

let StoredImageCaptcha: mongoose.Model<UserCommitmentRecord>;
let StoredPoWCaptcha: mongoose.Model<PowCaptchaRecord>;

export const saveCaptchas = async (
  imageCaptchaEvents: UserCommitmentRecord[],
  powCaptchaEvents: PoWCaptchaUser[],
  atlasUri: string,
) => {
  const connection = mongoose.createConnection(atlasUri, {
    authSource: "admin",
  });
  await new Promise<void>((resolve, reject) => {
    connection
      .once("open", () => {
        logger.info("Connected to MongoDB Atlas");
        StoredImageCaptcha = connection.model<UserCommitmentRecord>(
          "StoredImageCaptcha",
          UserCommitmentRecordSchema,
        );
        StoredPoWCaptcha = connection.model<PowCaptchaRecord>(
          "StoredPoWCaptcha",
          PowCaptchaRecordSchema,
        );
        resolve();
      })
      .on("error", reject);
  });
  if (imageCaptchaEvents.length) {
    await StoredImageCaptcha.insertMany(imageCaptchaEvents);
    logger.info("Mongo Saved Image Events");
  }
  if (powCaptchaEvents.length) {
    await StoredPoWCaptcha.insertMany(powCaptchaEvents);
    logger.info("Mongo Saved PoW Events");
  }

  await connection.close();
};
