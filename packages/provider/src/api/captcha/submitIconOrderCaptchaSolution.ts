// Copyright 2021-2026 Prosopo (UK) Ltd.
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
import { SubmitIconOrderCaptchaSolutionBody } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { getIPAddress } from "@prosopo/util";
import { interactiveSolutionHandler } from "./interactiveCaptchaSolution.js";

export default (env: ProviderEnvironment) =>
	interactiveSolutionHandler(env, {
		label: "icon-order",
		parse: (body) => SubmitIconOrderCaptchaSolutionBody.parse(body),
		verify: (tasks, body, submitWindowMs, req) =>
			tasks.iconOrderCaptchaManager.verifyIconOrderCaptchaSolution(
				body.challenge,
				body.signature.provider.challenge,
				body.clicks,
				body.iconOrderEvents,
				submitWindowMs,
				body.signature.user.timestamp,
				getIPAddress(req.ip || ""),
				body.behavioralData,
				body.salt,
				body.simdReadings,
				body.clientMetaData,
			),
	});
