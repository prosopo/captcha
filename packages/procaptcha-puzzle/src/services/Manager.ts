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
	pickIpMode,
	providerRetry,
} from "@prosopo/procaptcha-common";
import { getDefaultEvents } from "@prosopo/procaptcha-common";
import {
	type Account,
	ApiParams,
	type FrictionlessState,
	type GetPuzzleCaptchaResponse,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigInput,
	ProcaptchaConfigSchema,
	type ProcaptchaState,
	type ProcaptchaStateUpdateFn,
	type PuzzleEvent,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { embedData, sleep } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";

interface PuzzleManagerHandle {
	start: (
		x?: number,
		y?: number,
	) => Promise<GetPuzzleCaptchaResponse | undefined>;
	submitSolution: (
		finalX: number,
		finalY: number,
		puzzleEvents: PuzzleEvent[],
	) => Promise<boolean>;
	resetState: (frictionlessRestart?: () => void) => void;
}

export const Manager = (
	configInput: ProcaptchaClientConfigInput,
	state: ProcaptchaState,
	onStateUpdate: ProcaptchaStateUpdateFn,
	callbacks: ProcaptchaCallbacks,
	frictionlessState?: FrictionlessState,
	// Reads the live honeypot input value at submit time. Returns undefined
	// when the honeypot is disabled or the input hasn't been filled.
	getHoneypotValue?: () => string | undefined,
): PuzzleManagerHandle => {
	const events = getDefaultEvents(callbacks);

	// Closure variables to share state between start and submitSolution
	let storedChallengeResponse: GetPuzzleCaptchaResponse | undefined;
	let storedProviderApi: ProviderApi | undefined;
	let storedProviderUrl: string | undefined;
	let storedUser: Account | undefined;
	// Checkbox click coords, captured by start() and embedded into the
	// solution salt at submit time — same shape as the POW flow so the
	// provider records identical entry-point telemetry for both types.
	let storedClickX: number | undefined;
	let storedClickY: number | undefined;

	// URL of the provider used on the previous attempt. Kept outside the
	// resetState-cleared closure state so a retry can exclude it from the
	// candidate pool and land on a different provider.
	let previousProviderUrl: string | undefined;

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
		// clear closure state
		storedChallengeResponse = undefined;
		storedProviderApi = undefined;
		storedProviderUrl = undefined;
		storedUser = undefined;
		storedClickX = undefined;
		storedClickY = undefined;
	};

	const setValidChallengeTimeout = () => {
		const timeMillis: number = getConfig().captchas.puzzle.solutionTimeout;
		const successfullChallengeTimeout = setTimeout(() => {
			// Human state expired, disallow user's claim to be human
			updateState({ isHuman: false });

			events.onExpired();
			resetState(frictionlessState?.restart);
		}, timeMillis);

		updateState({ successfullChallengeTimeout });
	};

	const start = async (
		x = 0,
		y = 0,
	): Promise<GetPuzzleCaptchaResponse | undefined> => {
		// Persist click coords on every entry so retries inherit the
		// trusted coordinates captured by the widget on initial click.
		storedClickX = x;
		storedClickY = y;

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
					const currentConfig = getConfig();
					getRandomProviderResponse = await getProcaptchaRandomActiveProvider(
						currentConfig.defaultEnvironment,
						pickIpMode(currentConfig),
						{ attempt: state.attemptCount, excludeUrl: previousProviderUrl },
					);
				}

				const providerUrl = getRandomProviderResponse.provider.url;
				previousProviderUrl = providerUrl;

				const providerApi = new ProviderApi(providerUrl, getDappAccount());

				// Non-blocking check — attach SIMD readings only if the
				// prefetched benchmark has already resolved.
				const simdReadingsOnChallenge = frictionlessState?.getSimdReadings
					? await frictionlessState.getSimdReadings(0)
					: undefined;
				const challenge = await providerApi.getPuzzleCaptchaChallenge(
					userAccount,
					getDappAccount(),
					frictionlessState?.sessionId,
					simdReadingsOnChallenge,
				);

				if (challenge.error) {
					updateState({
						loading: false,
						error: {
							message: challenge.error.message,
							key: challenge.error.key || "API.UNKNOWN_ERROR",
						},
					});
					return;
				}

				// Store closure state for submitSolution
				storedChallengeResponse = challenge;
				storedProviderApi = providerApi;
				storedProviderUrl = providerUrl;
				storedUser = user;

				// Set loading to false to signal the widget to show the puzzle canvas
				updateState({
					loading: false,
				});
			},
			async () => {
				await start();
			},
			() => {
				resetState();
			},
			state.attemptCount,
			3,
		);

		// Return the stored challenge so retries (which re-enter `start`)
		// still surface the resolved challenge to the original caller.
		return storedChallengeResponse;
	};

	const submitSolution = async (
		finalX: number,
		finalY: number,
		puzzleEvents: PuzzleEvent[],
	): Promise<boolean> => {
		if (
			!storedChallengeResponse ||
			!storedProviderApi ||
			!storedProviderUrl ||
			!storedUser
		) {
			throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
				context: { error: "No challenge data available. Call start() first." },
			});
		}

		updateState({ loading: true });

		try {
			const challenge = storedChallengeResponse;
			const providerApi = storedProviderApi;
			const providerUrl = storedProviderUrl;
			const user = storedUser;
			const config = getConfig();

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
				address: user.account.address,
				data: stringToHex(challenge[ApiParams.timestamp].toString()),
				type: "bytes",
			});

			let encryptedBehavioralData: string | undefined;

			// Collect and encrypt behavioral data before submission
			if (
				frictionlessState?.encryptBehavioralData &&
				(frictionlessState?.behaviorCollector1 ||
					frictionlessState?.behaviorCollector2 ||
					frictionlessState?.behaviorCollector3)
			) {
				try {
					const behavioralData = {
						collector1: frictionlessState.behaviorCollector1?.getData() || [],
						collector2: frictionlessState.behaviorCollector2?.getData() || [],
						collector3: frictionlessState.behaviorCollector3?.getData() || [],
						deviceCapability: frictionlessState.deviceCapability || "unknown",
					};

					// Pack the behavioral data before stringifying
					const dataToEncrypt = frictionlessState.packBehavioralData
						? frictionlessState.packBehavioralData(behavioralData)
						: behavioralData;

					encryptedBehavioralData =
						await frictionlessState.encryptBehavioralData(
							JSON.stringify(dataToEncrypt),
						);
				} catch {
					// Silently ignore behavioral data errors - captcha should still work
				}
			}

			// Encode the checkbox click coordinates into a random salt, same
			// shape as the POW flow. The provider decodes this on submit and
			// records the (x, y) on the puzzle captcha record for telemetry.
			let salt: string | undefined;
			if (storedClickX !== undefined && storedClickY !== undefined) {
				const coords = [storedClickX, storedClickY];
				const randomSalt = randomAsHex(
					coords
						.map((coord) => coord.toString(16).length + 4)
						.reduce((acc, curr) => acc + curr, 0),
				);
				salt = embedData(randomSalt, coords);
			}

			const simdReadings = frictionlessState?.getSimdReadings
				? await frictionlessState.getSimdReadings()
				: undefined;
			const hpValue = getHoneypotValue?.();
			const clientMetaData = hpValue ? { hp: hpValue } : undefined;
			const verifiedSolution = await providerApi.submitPuzzleCaptchaSolution(
				challenge,
				getAccount().account.account.address,
				getDappAccount(),
				finalX,
				finalY,
				puzzleEvents,
				userTimestampSignature.signature.toString(),
				encryptedBehavioralData,
				salt,
				simdReadings,
				clientMetaData,
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
				return true;
			}
			onFailed();
			return false;
		} catch (error) {
			updateState({ loading: false });
			throw error;
		}
	};

	return {
		start,
		submitSolution,
		resetState,
	};
};
