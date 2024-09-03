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
  PoWCaptchaRecord,
  PowCaptchaRecordSchema,
  PoWCaptchaStored,
  UserCommitmentRecord,
  type UserCommitment,
  UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import mongoose from "mongoose";
import { PoWCaptchaUser } from "@prosopo/types";
const logger = getLoggerDefault();

let StoredImageCaptcha: mongoose.Model<UserCommitmentRecord>;
let StoredPoWCaptcha: mongoose.Model<PoWCaptchaRecord>;

export const saveCaptchas = async (
  imageCaptchaEvents: UserCommitmentRecord[],
  powCaptchaEvents: PoWCaptchaRecord[],
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
        StoredPoWCaptcha = connection.model<PoWCaptchaRecord>(
          "StoredPoWCaptcha",
          PowCaptchaRecordSchema,
        );
        resolve();
      })
      .on("error", reject);
  });
  if (imageCaptchaEvents.length) {
    const result = await StoredImageCaptcha.bulkWrite(
      imageCaptchaEvents.map((doc) => {
        // remove the _id field to avoid problems when upserting
        const { _id, ...safeDoc } = doc;
        return {
          updateOne: {
            filter: { id: safeDoc.id },
            update: { $set: safeDoc },
            upsert: true,
          },
        };
      }),
    );
    logger.info("Mongo Saved Image Events", result);
  }
  if (powCaptchaEvents.length) {
    const result = await StoredPoWCaptcha.bulkWrite(
      powCaptchaEvents.map((doc) => {
        // remove the _id field to avoid problems when upserting
        const { _id, ...safeDoc } = doc;
        return {
          updateOne: {
            filter: { challenge: safeDoc.challenge },
            update: { $set: safeDoc },
            upsert: true,
          },
        };
      }),
    );
    logger.info("Mongo Saved PoW Events", result);
  }

  await connection.close();
};
