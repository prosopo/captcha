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

import { loadI18next } from "@prosopo/locale";
import type { Ti18n } from "@prosopo/locale";
import { CaptchaComponentProvider } from "@prosopo/procaptcha-bundle/components";
import { CaptchaType, type ProcaptchaToken } from "@prosopo/types";
import { useEffect, useRef, useState } from "react";
import configs from "./config.js";

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
	const [config, setConfig] = useState(
		configs[props.captchaType || CaptchaType.frictionless],
	);
	const [i18n, setI18n] = useState<Ti18n | null>(null);

	const onHuman = async (procaptchaToken: ProcaptchaToken) => {
		console.log("onHuman", procaptchaToken);
		props.setProcaptchaToken(procaptchaToken);
	};

	const onFailed = () => {
		console.log("Challenge failed");
	};

	useEffect(() => {
		setConfig(configs[props.captchaType || CaptchaType.frictionless]);
	}, [props.captchaType]);

	useEffect(() => {
		loadI18next(false).then((i18n) => {
			setI18n(i18n);
		});
	}, []);

	if (!i18n) {
		return <div>Loading...</div>;
	}

	return (
		<div>
			{new CaptchaComponentProvider().getCaptchaComponent(
				props.captchaType || CaptchaType.frictionless,
				{
					config,
					callbacks: {
						onError,
						onExpired,
						onHuman,
						onFailed,
					},
					i18n: i18n,
				},
			)}
		</div>
	);
}
