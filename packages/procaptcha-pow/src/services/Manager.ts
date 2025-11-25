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

import { stringToHex } from "@polkadot/util/string";
import { ProviderApi } from "@prosopo/api";
import { ProsopoEnvError } from "@prosopo/common";
import {
	ExtensionLoader,
	buildUpdateState,
	getProcaptchaRandomActiveProvider,
	providerRetry,
} from "@prosopo/procaptcha-common";
import { getDefaultEvents } from "@prosopo/procaptcha-common";
import {
	type Account,
	ApiParams,
	type FrictionlessState,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigInput,
	ProcaptchaConfigSchema,
	type ProcaptchaState,
	type ProcaptchaStateUpdateFn,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { sleep } from "@prosopo/util";
import { solvePoW } from "@prosopo/util";

export const Manager = (
	configInput: ProcaptchaClientConfigInput,
	state: ProcaptchaState,
	onStateUpdate: ProcaptchaStateUpdateFn,
	callbacks: ProcaptchaCallbacks,
	frictionlessState?: FrictionlessState,
) => {
	const events = getDefaultEvents(callbacks);

	const defaultState = (): Partial<ProcaptchaState> => {
		return {
			// note order matters! see buildUpdateState. These fields are set in order, so disable modal first, then set loading to false, etc.
			showModal: false,
			loading: false,
			index: 0,
			challenge: undefined,
			solutions: undefined,
			isHuman: false,
			captchaApi: undefined,
			account: undefined,
			// don't handle timeout here, this should be handled by the state management
		};
	};

	const clearTimeout = () => {
		// clear the timeout
		window.clearTimeout(Number(state.timeout));
		// then clear the timeout from the state
		updateState({ timeout: undefined });
	};

	const onFailed = () => {
		updateState({
			isHuman: false,
			loading: false,
		});
		events.onFailed();
		resetState(frictionlessState?.restart);
	};

	const clearSuccessfulChallengeTimeout = () => {
		// clear the timeout
		window.clearTimeout(Number(state.successfullChallengeTimeout));
		// then clear the timeout from the state
		updateState({ successfullChallengeTimeout: undefined });
	};

	const getConfig = () => {
		const config: ProcaptchaClientConfigInput = {
			userAccountAddress: configInput.userAccountAddress || "",
			...configInput,
		};

		console.log("Using config:", config);

		// overwrite the account in use with the one in state if it exists. Reduces likelihood of bugs where the user
		// changes account in the middle of the captcha process.
		if (state.account) {
			config.userAccountAddress = state.account.account.address;
		}

		return ProcaptchaConfigSchema.parse(config);
	};

	const getAccount = () => {
		if (!state.account) {
			throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
				context: { error: "Account not loaded" },
			});
		}
		const account: Account = state.account;
		return { account };
	};

	const getDappAccount = () => {
		if (!state.dappAccount) {
			throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
		}

		const dappAccount: string = state.dappAccount;
		return dappAccount;
	};

	// get the state update mechanism
	const updateState = buildUpdateState(state, onStateUpdate);

	const resetState = (frictionlessRestart?: () => void) => {
		// clear timeout just in case a timer is still active (shouldn't be)
		clearTimeout();
		clearSuccessfulChallengeTimeout();
		updateState(defaultState());
		events.onReset();
		// reset the frictionless state if necessary
		if (frictionlessRestart) {
			frictionlessRestart();
		}
	};

	const setValidChallengeTimeout = () => {
		const timeMillis: number = getConfig().captchas.pow.solutionTimeout;
		const successfullChallengeTimeout = setTimeout(() => {
			// Human state expired, disallow user's claim to be human
			updateState({ isHuman: false });

			events.onExpired();
			resetState(frictionlessState?.restart);
		}, timeMillis);

		updateState({ successfullChallengeTimeout });
	};

	const start = async () => {
		console.log("[DEBUG] PoW Manager start() called");
		console.log("[DEBUG] Initial frictionlessState:", frictionlessState);
		console.log(
			"[DEBUG] frictionlessState keys:",
			frictionlessState ? Object.keys(frictionlessState) : "null",
		);
		await providerRetry(
			async () => {
				if (state.loading) {
					return;
				}
				if (state.isHuman) {
					return;
				}

				// reset the state to defaults - do not reset the frictionless state
				resetState();

				// set the loading flag to true (allow UI to show some sort of loading / pending indicator while we get the captcha process going)
				updateState({
					loading: true,
				});
				updateState({ attemptCount: state.attemptCount + 1 });

				const config = getConfig();

				// check if account exists in extension
				const selectAccount = async () => {
					if (frictionlessState) {
						return frictionlessState.userAccount;
					}
					const ext = new (await ExtensionLoader(config.web2))();
					return ext.getAccount(config);
				};

				// use the passed in account (could be web3) or create a new account
				const user = await selectAccount();
				console.log("User", user);
				const userAccount = user.account.address;

				// set the account created or injected by the extension
				updateState({
					account: { account: { address: userAccount } },
				});

				// snapshot the config into the state
				updateState({ dappAccount: config.account.address });

				// allow UI to catch up with the loading state
				await sleep(100);

				// check if account has been provided in config (doesn't matter in web2 mode)
				if (!config.web2 && !config.userAccountAddress) {
					throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
						context: {
							error: "Account address has not been set for web3 mode",
						},
					});
				}

				let getRandomProviderResponse = undefined;

				if (frictionlessState?.provider) {
					getRandomProviderResponse = frictionlessState.provider;
				} else {
					getRandomProviderResponse = await getProcaptchaRandomActiveProvider(
						getConfig().defaultEnvironment,
					);
				}

				const providerUrl = getRandomProviderResponse.provider.url;

				const providerApi = new ProviderApi(providerUrl, getDappAccount());

				const challenge = await providerApi.getPowCaptchaChallenge(
					userAccount,
					getDappAccount(),
					frictionlessState?.sessionId,
				);

				console.log("Challenge:", challenge);

				if (challenge.error) {
					updateState({
						loading: false,
						error: {
							message: challenge.error.message,
							key: challenge.error.key || "API.UNKNOWN_ERROR",
						},
					});
				} else {
					const solution = solvePoW(challenge.challenge, challenge.difficulty);

					const signer = user.extension?.signer;

					if (!signer || !signer.signRaw) {
						throw new ProsopoEnvError("GENERAL.CANT_FIND_KEYRINGPAIR", {
							context: {
								error:
									"Signer is not defined, cannot sign message to prove account ownership",
							},
						});
					}

					const userTimestampSignature = await signer.signRaw({
						address: userAccount,
						data: stringToHex(challenge[ApiParams.timestamp].toString()),
						type: "bytes",
					});

					console.log("[DEBUG] About to check frictionlessState");
					console.log("[DEBUG] frictionlessState:", frictionlessState);
					console.log(
						"[DEBUG] Has encryptBehavioralData:",
						!!frictionlessState?.encryptBehavioralData,
					);
					console.log(
						"[DEBUG] Has behaviorCollector1:",
						!!frictionlessState?.behaviorCollector1,
					);
					console.log(
						"[DEBUG] Has behaviorCollector2:",
						!!frictionlessState?.behaviorCollector2,
					);
					console.log(
						"[DEBUG] Has behaviorCollector3:",
						!!frictionlessState?.behaviorCollector3,
					);

					let encryptedBehavioralData: string | undefined;

					// Collect and encrypt behavioral data before submission
					if (
						frictionlessState?.encryptBehavioralData &&
						(frictionlessState?.behaviorCollector1 ||
							frictionlessState?.behaviorCollector2 ||
							frictionlessState?.behaviorCollector3)
					) {
						console.log("[DEBUG] Inside behavioral data collection block");
						try {
							const behavioralData = {
								collector1:
									frictionlessState.behaviorCollector1?.getData() || [],
								collector2:
									frictionlessState.behaviorCollector2?.getData() || [],
								collector3:
									frictionlessState.behaviorCollector3?.getData() || [],
								deviceCapability:
									frictionlessState.deviceCapability || "unknown",
							};

							console.log(
								"[DEBUG] Behavioral data collected:",
								behavioralData,
							);
							console.log(
								"[DEBUG] Collector1 data length:",
								behavioralData.collector1.length,
							);
							console.log(
								"[DEBUG] Collector2 data length:",
								behavioralData.collector2.length,
							);
							console.log(
								"[DEBUG] Collector3 data length:",
								behavioralData.collector3.length,
							);

							// Pack the behavioral data before stringifying
							const dataToEncrypt = frictionlessState.packBehavioralData
								? frictionlessState.packBehavioralData(behavioralData)
								: behavioralData;

							const stringifiedData = JSON.stringify(dataToEncrypt);
							console.log(
								"[DEBUG] Stringified data length (after packing):",
								stringifiedData.length,
							);

							console.log("[DEBUG] About to encrypt behavioral data");
							encryptedBehavioralData =
								await frictionlessState.encryptBehavioralData(
									stringifiedData,
								);
							console.log(
								"[DEBUG] Encryption complete, encrypted length:",
								encryptedBehavioralData.length,
							);
							console.log(
								"[Encrypted Behavioral Data]:",
								encryptedBehavioralData,
							);
						} catch (error) {
							console.error(
								"[DEBUG] Error encrypting behavioral data:",
								error,
							);
						}
					} else {
						console.log(
							"[DEBUG] Skipping behavioral data collection - conditions not met",
						);
					}

					console.log("[DEBUG] About to submit PoW captcha solution");
					const verifiedSolution = await providerApi.submitPowCaptchaSolution(
						challenge,
						getAccount().account.account.address,
						getDappAccount(),
						solution,
						userTimestampSignature.signature.toString(),
						config.captchas.pow.verifiedTimeout,
						encryptedBehavioralData,
					);
					if (verifiedSolution[ApiParams.verified]) {
						updateState({
							isHuman: true,
							loading: false,
						});

						events.onHuman(
							encodeProcaptchaOutput({
								[ApiParams.providerUrl]: providerUrl,
								[ApiParams.user]: getAccount().account.account.address,
								[ApiParams.dapp]: getDappAccount(),
								[ApiParams.challenge]: challenge.challenge,
								[ApiParams.nonce]: solution,
								[ApiParams.timestamp]: challenge.timestamp,
								[ApiParams.signature]: {
									[ApiParams.provider]: challenge.signature.provider,
									[ApiParams.user]: {
										[ApiParams.timestamp]:
											userTimestampSignature.signature.toString(),
									},
								},
							}),
						);
						setValidChallengeTimeout();
					} else {
						onFailed();
					}
				}
			},
			start,
			() => {
				resetState();
			},
			state.attemptCount,
			3,
		);
	};

	return {
		start,
		resetState,
	};
};
