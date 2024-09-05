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
import { DatabaseTypes } from "@prosopo/types";
import { MongoDatabase as MongoDatabase } from "../base/mongo.js";
import { ProviderDatabase } from "./provider.js";
import { CaptchaDatabase } from "./captcha.js";
import { ClientDatabase } from "./client.js";
import { MongoMemoryDatabase } from "../base/mongoMemory.js";
export * from "./captcha.js";
export * from "./client.js";
export { ProviderDatabase } from "./provider.js";
export const Databases = {
  [DatabaseTypes.Values.mongo]: MongoDatabase,
  [DatabaseTypes.Values.provider]: ProviderDatabase,
  [DatabaseTypes.Values.client]: ClientDatabase,
  [DatabaseTypes.Values.captcha]: CaptchaDatabase,
  [DatabaseTypes.Values.mongoMemory]: MongoMemoryDatabase,
};
