import type { ProsopoError } from "@prosopo/common";
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
import type {
	ProcaptchaCallbacks,
	ProcaptchaEvents,
	ProcaptchaState,
	ProcaptchaStateUpdateFn,
} from "@prosopo/types";

const alertError = (error: ProsopoError) => {
	alert(error.message);
};

export const getDefaultEvents = (
	stateUpdater: ProcaptchaStateUpdateFn,
	state: ProcaptchaState,
	callbacks: ProcaptchaCallbacks,
): ProcaptchaEvents =>
	Object.assign(
		{
			onError: alertError,
			onHuman: (output: {
				user: string;
				dapp: string;
				commitmentId?: string;
				providerUrl?: string;
			}) => {
				stateUpdater({ sendData: !state.sendData });
			},
			onExtensionNotFound: () => {
				alert("No extension found");
			},
			onFailed: () => {
				alert("Captcha challenge failed. Please try again");
				stateUpdater({ sendData: !state.sendData });
			},
			onExpired: () => {
				console.info("Completed challenge has expired, please try again");
			},
			onChallengeExpired: () => {
				console.info("Uncompleted challenge has expired, please try again");
			},
			onOpen: () => {
				console.info("captcha opened");
			},
			onClose: () => {
				console.info("captcha closed");
			},
			onReload: () => {
				console.info("captcha reloaded");
			},
			onReset: () => {
				console.info("captcha reset");
			},
		},
		callbacks,
	);
