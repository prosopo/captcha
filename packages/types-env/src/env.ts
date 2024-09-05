import type { Keyring } from "@polkadot/keyring";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { Logger } from "@prosopo/common";
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
import type { AssetsResolver, EnvironmentTypes } from "@prosopo/types";
import type { ProsopoBasicConfigOutput } from "@prosopo/types";
import type { IDatabase, IProviderDatabase } from "@prosopo/types-database";

export interface ProsopoEnvironment {
  config: ProsopoBasicConfigOutput;
  db: IProviderDatabase | undefined;
  defaultEnvironment: EnvironmentTypes;
  logger: Logger;
  assetsResolver: AssetsResolver | undefined;
  keyring: Keyring;
  pair: KeyringPair | undefined;
  getDb(): IProviderDatabase;
  isReady(): Promise<void>;
  importDatabase(): Promise<void>;
}
