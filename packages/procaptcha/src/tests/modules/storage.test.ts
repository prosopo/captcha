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
import { describe, expect, test } from "vitest";
import storage from "../../modules/storage.js";

const { setAccount, getAccount, getProcaptchaStorage, setProcaptchaStorage } =
	storage;

describe("storage tests", () => {
	test("sets and gets account", async () => {
		setAccount("abc");
		expect(getAccount()).to.equal("abc");
	});

	test("sets provider URL and block number", async () => {
		setAccount("abc");
		const procaptchaStorage = getProcaptchaStorage();
		setProcaptchaStorage({
			...procaptchaStorage,
			providerUrl: "http://localhost:9229",
			blockNumber: 100,
		});
		expect(getProcaptchaStorage()).toMatchObject({
			account: "abc",
			providerUrl: "http://localhost:9229",
			blockNumber: 100,
		});
	});
});
