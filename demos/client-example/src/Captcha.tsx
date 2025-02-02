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

import { CaptchaRenderer } from "@prosopo/procaptcha-bundle/components";
import { CaptchaType, type ProcaptchaToken } from "@prosopo/types";
import config from "./config.js";

type CaptchProps = {
	captchaType?: CaptchaType;
	setProcaptchaToken: (procaptchaToken: ProcaptchaToken) => void;
	key: number;
};

const onError = (error: Error) => {
	alert(error.message);
};

const onExpired = () => {
	alert("Challenge has expired");
};

export function Captcha(props: CaptchProps) {
	const onHuman = async (procaptchaToken: ProcaptchaToken) => {
		console.log("onHuman", procaptchaToken);
		props.setProcaptchaToken(procaptchaToken);
	};

	const onFailed = () => {
		console.log("The user failed the captcha");
	};

	return (
		<div>
			{new CaptchaRenderer().render(
				props.captchaType || CaptchaType.frictionless,
				{
					config,
					callbacks: {
						onError,
						onExpired,
						onHuman,
						onFailed,
					},
				},
			)}
		</div>
	);
}
