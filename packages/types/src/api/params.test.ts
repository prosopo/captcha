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
import { describe, expect, it } from "vitest";
import { ApiParams } from "./params.js";

describe("ApiParams enum", () => {
	it("has all expected parameter keys", () => {
		expect(ApiParams.datasetId).toBe("datasetId");
		expect(ApiParams.user).toBe("user");
		expect(ApiParams.dapp).toBe("dapp");
		expect(ApiParams.provider).toBe("provider");
		expect(ApiParams.blockNumber).toBe("blockNumber");
		expect(ApiParams.requestHash).toBe("requestHash");
		expect(ApiParams.captchas).toBe("captchas");
		expect(ApiParams.commitmentId).toBe("commitmentId");
		expect(ApiParams.proof).toBe("proof");
		expect(ApiParams.dappSignature).toBe("dappSignature");
		expect(ApiParams.dappUserSignature).toBe("dappUserSignature");
		expect(ApiParams.providerUrl).toBe("providerUrl");
		expect(ApiParams.procaptchaResponse).toBe("procaptcha-response");
		expect(ApiParams.verifiedTimeout).toBe("verifiedTimeout");
		expect(ApiParams.maxVerifiedTime).toBe("maxVerifiedTime");
		expect(ApiParams.verified).toBe("verified");
		expect(ApiParams.status).toBe("status");
		expect(ApiParams.challenge).toBe("challenge");
		expect(ApiParams.difficulty).toBe("difficulty");
		expect(ApiParams.nonce).toBe("nonce");
		expect(ApiParams.timeouts).toBe("timeouts");
		expect(ApiParams.token).toBe("token");
		expect(ApiParams.secret).toBe("secret");
		expect(ApiParams.timestamp).toBe("timestamp");
		expect(ApiParams.signature).toBe("signature");
		expect(ApiParams.error).toBe("error");
		expect(ApiParams.siteKey).toBe("siteKey");
		expect(ApiParams.captchaType).toBe("captchaType");
		expect(ApiParams.sessionId).toBe("sessionId");
		expect(ApiParams.settings).toBe("settings");
		expect(ApiParams.domains).toBe("domains");
		expect(ApiParams.frictionlessThreshold).toBe("frictionlessThreshold");
		expect(ApiParams.powDifficulty).toBe("powDifficulty");
		expect(ApiParams.score).toBe("score");
		expect(ApiParams.tier).toBe("tier");
		expect(ApiParams.detectorKey).toBe("detectorKey");
		expect(ApiParams.ip).toBe("ip");
		expect(ApiParams.expirationInSeconds).toBe("expirationInSeconds");
		expect(ApiParams.enabled).toBe("enabled");
		expect(ApiParams.headHash).toBe("headHash");
		expect(ApiParams.salt).toBe("salt");
	});
});
