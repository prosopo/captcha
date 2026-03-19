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

export type PuzzleStartResult = {
	sliderLeft: number;
};

export const Manager = (
	configInput: ProcaptchaClientConfigInput,
	state: ProcaptchaState,
	onStateUpdate: ProcaptchaStateUpdateFn,
	callbacks: ProcaptchaCallbacks,
	frictionlessState?: FrictionlessState,
	onChallengeReady?: (imgUrl: string, destX: number, blockY: number) => void,
) => {
	const events = getDefaultEvents(callbacks);

	const defaultState = (): Partial<ProcaptchaState> => ({
		showModal: false,
		loading: false,
		index: 0,
		challenge: undefined,
		solutions: undefined,
		isHuman: false,
		captchaApi: undefined,
		account: undefined,
	});

	const clearTimeout = () => {
		window.clearTimeout(Number(state.timeout));
		updateState({ timeout: undefined });
	};

	const clearSuccessfulChallengeTimeout = () => {
		window.clearTimeout(Number(state.successfullChallengeTimeout));
		updateState({ successfullChallengeTimeout: undefined });
	};

	const onFailed = () => {
		updateState({ isHuman: false, loading: false });
		events.onFailed();
		resetState(frictionlessState?.restart);
	};

	const getConfig = () => {
		const config: ProcaptchaClientConfigInput = {
			userAccountAddress: configInput.userAccountAddress || "",
			...configInput,
		};
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
		return state.dappAccount;
	};

	const updateState = buildUpdateState(state, onStateUpdate);

	const resetState = (frictionlessRestart?: () => void) => {
		clearTimeout();
		clearSuccessfulChallengeTimeout();
		updateState(defaultState());
		events.onReset();
		if (frictionlessRestart) {
			frictionlessRestart();
		}
	};

	const setValidChallengeTimeout = () => {
		const timeMillis: number = getConfig().captchas.pow.solutionTimeout;
		const successfullChallengeTimeout = setTimeout(() => {
			updateState({ isHuman: false });
			events.onExpired();
			resetState(frictionlessState?.restart);
		}, timeMillis);
		updateState({ successfullChallengeTimeout });
	};

	/**
	 * Start the puzzle captcha flow. After fetching the challenge this function
	 * calls `onChallengeReady` with the image URL and destX so the widget can
	 * render the puzzle. The actual submission happens in `submitSolution`.
	 */
	const start = async () => {
		await providerRetry(
			async () => {
				if (state.loading || state.isHuman) return;

				resetState();
				updateState({ loading: true });
				updateState({ attemptCount: state.attemptCount + 1 });

				const config = getConfig();

				const selectAccount = async () => {
					if (frictionlessState) return frictionlessState.userAccount;
					const ext = new (await ExtensionLoader(config.web2))();
					return ext.getAccount(config);
				};

				const user = await selectAccount();
				const userAccount = user.account.address;

				updateState({ account: { account: { address: userAccount } } });
				updateState({ dappAccount: config.account.address });
				await sleep(100);

				if (!config.web2 && !config.userAccountAddress) {
					throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
						context: {
							error: "Account address has not been set for web3 mode",
						},
					});
				}

				const getRandomProviderResponse =
					frictionlessState?.provider ??
					(await getProcaptchaRandomActiveProvider(config.defaultEnvironment));

				const providerUrl = getRandomProviderResponse.provider.url;
				const providerApi = new ProviderApi(providerUrl, getDappAccount());

				const challenge = await providerApi.getPuzzleCaptchaChallenge(
					userAccount,
					getDappAccount(),
					frictionlessState?.sessionId,
				);

				if ("error" in challenge && challenge.error) {
					updateState({
						loading: false,
						error: {
							message: (challenge.error as { message: string }).message,
							key:
								(challenge.error as { key?: string }).key ||
								"API.UNKNOWN_ERROR",
						},
					});
					return;
				}

				// Store challenge reference so submitSolution can use it
				// @ts-expect-error: we use challenge as a generic state carrier here
				updateState({ challenge: { ...challenge, providerUrl } });

				// Notify the widget to render the puzzle
				onChallengeReady?.(challenge.imgUrl, challenge.destX, challenge.blockY);

				updateState({ loading: false });
			},
			start,
			() => resetState(),
			state.attemptCount,
			3,
		);
	};

	/**
	 * Called by the widget after the user has successfully dragged the slider.
	 */
	const submitSolution = async (sliderLeft: number) => {
		await providerRetry(
			async () => {
				const storedChallenge = state.challenge as
					| ((ReturnType<typeof start> extends Promise<infer T> ? T : never) & {
							providerUrl: string;
					  })
					| undefined;
				if (!storedChallenge) {
					throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
						context: { error: "No active puzzle challenge" },
					});
				}

				const config = getConfig();
				const user = getAccount();
				const userAccount = user.account.account.address;
				// @ts-expect-error: generic challenge storage
				const providerUrl: string = state.challenge?.providerUrl;
				const providerApi = new ProviderApi(providerUrl, getDappAccount());

				const signer =
					frictionlessState?.userAccount?.extension?.signer ??
					(await (async () => {
						const ext = new (await ExtensionLoader(config.web2))();
						const u = await ext.getAccount(config);
						return u.extension?.signer;
					})());

				if (!signer?.signRaw) {
					throw new ProsopoEnvError("GENERAL.CANT_FIND_KEYRINGPAIR", {
						context: { error: "Signer is not defined" },
					});
				}

				// @ts-expect-error: generic challenge storage
				const timestamp: string = state.challenge?.timestamp;
				const userTimestampSignature = await signer.signRaw({
					address: userAccount,
					data: stringToHex(timestamp),
					type: "bytes",
				});

				let encryptedBehavioralData: string | undefined;
				if (
					frictionlessState?.encryptBehavioralData &&
					(frictionlessState.behaviorCollector1 ||
						frictionlessState.behaviorCollector2 ||
						frictionlessState.behaviorCollector3)
				) {
					try {
						const behavioralData = {
							collector1: frictionlessState.behaviorCollector1?.getData() || [],
							collector2: frictionlessState.behaviorCollector2?.getData() || [],
							collector3: frictionlessState.behaviorCollector3?.getData() || [],
							deviceCapability: frictionlessState.deviceCapability || "unknown",
						};
						const dataToEncrypt = frictionlessState.packBehavioralData
							? frictionlessState.packBehavioralData(behavioralData)
							: behavioralData;
						encryptedBehavioralData =
							await frictionlessState.encryptBehavioralData(
								JSON.stringify(dataToEncrypt),
							);
					} catch {
						// Silently ignore behavioral data errors
					}
				}

				const verifiedSolution = await providerApi.submitPuzzleCaptchaSolution(
					// @ts-expect-error: generic challenge storage
					state.challenge,
					userAccount,
					getDappAccount(),
					sliderLeft,
					userTimestampSignature.signature.toString(),
					config.captchas.pow.verifiedTimeout,
					encryptedBehavioralData,
				);

				if (verifiedSolution[ApiParams.verified]) {
					updateState({ isHuman: true, loading: false });
					events.onHuman(
						encodeProcaptchaOutput({
							[ApiParams.providerUrl]: providerUrl,
							[ApiParams.user]: userAccount,
							[ApiParams.dapp]: getDappAccount(),
							// @ts-expect-error: generic challenge storage
							[ApiParams.challenge]: state.challenge?.puzzleChallengeId,
							// @ts-expect-error: generic challenge storage
							[ApiParams.timestamp]: state.challenge?.timestamp,
							[ApiParams.signature]: {
								// @ts-expect-error: generic challenge storage
								[ApiParams.provider]: state.challenge?.signature?.provider,
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
			},
			submitSolution.bind(null, sliderLeft),
			() => resetState(),
			state.attemptCount,
			3,
		);
	};

	return { start, submitSolution, resetState };
};
