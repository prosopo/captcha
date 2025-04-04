import { mnemonicGenerate } from "@polkadot/util-crypto/mnemonic";
// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import type { BN } from "@polkadot/util/bn";
import type { Dapp, Provider } from "@prosopo/types";
import { ProviderEnvironment } from "./provider.js";

export type TestAccount = {
	mnemonic: string;
	address: string;
	contractAddress: string | undefined;
};

export interface ProviderTestAccount extends TestAccount {
	contractValue: Provider;
}

export interface AppTestAccount extends TestAccount {
	contractValue: Dapp;
}

export class MockEnvironment extends ProviderEnvironment {
	public createAccountAndAddToKeyring(): TestAccount {
		const mnemonic: string = mnemonicGenerate();
		const account = this.keyring.addFromMnemonic(mnemonic);
		const { address } = account;
		return { address, mnemonic, contractAddress: undefined };
	}
}

export interface ViteTestContext {
	env: MockEnvironment;
	providerStakeThreshold: BN;
	dappStakeThreshold: BN;
}
