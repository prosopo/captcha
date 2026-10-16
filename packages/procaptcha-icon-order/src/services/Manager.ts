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
	buildClientMetaData,
	buildUpdateState,
	createManagerLifecycle,
	createSpentSessionGuard,
	encryptBehavioralDataForSubmit,
	getDefaultEvents,
	getProcaptchaRandomActiveProvider,
	getSimdReadingsForSubmit,
	pickIpMode,
	providerRetry,
} from "@prosopo/procaptcha-common";
import {
	type Account,
	ApiParams,
	CaptchaType,
	type FrictionlessState,
	type GetIconOrderCaptchaResponse,
	type IconClick,
	type IconOrderEvent,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigInput,
	ProcaptchaConfigSchema,
	type ProcaptchaState,
	type ProcaptchaStateUpdateFn,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { embedData, sleep } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";

interface IconOrderManagerHandle {
	start: (
		x?: number,
		y?: number,
	) => Promise<GetIconOrderCaptchaResponse | undefined>;
	submitSolution: (
		clicks: IconClick[],
		iconOrderEvents: IconOrderEvent[],
	) => Promise<boolean>;
	resetState: (frictionlessRestart?: () => void) => void;
	dispose: () => void;
}

export const Manager = (
	configInput: ProcaptchaClientConfigInput,
	state: ProcaptchaState,
	onStateUpdate: ProcaptchaStateUpdateFn,
	callbacks: ProcaptchaCallbacks,
	frictionlessState?: FrictionlessState,
	getHoneypotValue?: () => string | undefined,
): IconOrderManagerHandle => {
	const events = getDefaultEvents(callbacks);

	let storedChallengeResponse: GetIconOrderCaptchaResponse | undefined;
	let storedProviderApi: ProviderApi | undefined;
	let storedProviderUrl: string | undefined;
	let storedUser: Account | undefined;
	// Checkbox click coords, carried in the solution salt for telemetry.
	let storedClickX: number | undefined;
	let storedClickY: number | undefined;

	// Outlives resetState so a retry can avoid the provider that just failed.
	let previousProviderUrl: string | undefined;
	const spentSession = createSpentSessionGuard();

	const defaultState = (): Partial<ProcaptchaState> => {
		return {
			// Order matters: buildUpdateState applies fields in insertion order.
			showModal: false,
			loading: false,
			index: 0,
			challenge: undefined,
			solutions: undefined,
			isHuman: false,
			captchaApi: undefined,
			account: undefined,
		};
	};

	const onFailed = () => {
		updateState({
			isHuman: false,
			loading: false,
		});
		events.onFailed();
		resetState(frictionlessState?.restart);
	};

	const getConfig = () => {
		const config: ProcaptchaClientConfigInput = {
			userAccountAddress: configInput.userAccountAddress || "",
			...configInput,
		};

		// Pin the account in state so a mid-challenge account switch is ignored.
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

	const updateState = buildUpdateState(state, onStateUpdate);
	const lifecycle = createManagerLifecycle(state, updateState);

	const resetState = (frictionlessRestart?: () => void) => {
		lifecycle.clearTimers();
		updateState(defaultState());
		events.onReset();
		if (frictionlessRestart) {
			frictionlessRestart();
		}
		storedChallengeResponse = undefined;
		storedProviderApi = undefined;
		storedProviderUrl = undefined;
		storedUser = undefined;
		storedClickX = undefined;
		storedClickY = undefined;
	};

	const setValidChallengeTimeout = () => {
		lifecycle.expireSolutionAfter(
			getConfig().captchas.iconOrder.solutionTimeout,
			() => {
				updateState({ isHuman: false });
				events.onExpired();
				resetState(frictionlessState?.restart);
			},
		);
	};

	const start = async (
		x = 0,
		y = 0,
	): Promise<GetIconOrderCaptchaResponse | undefined> => {
		await providerRetry(
			async () => {
				if (state.loading) {
					return;
				}
				if (state.isHuman) {
					return;
				}

				resetState();

				// After the reset, which clears them, so retries keep the real click.
				storedClickX = x;
				storedClickY = y;

				updateState({
					loading: true,
				});
				updateState({ attemptCount: state.attemptCount + 1 });

				const config = getConfig();

				const selectAccount = async () => {
					if (frictionlessState) {
						return frictionlessState.userAccount;
					}
					const ext = new (await ExtensionLoader(config.web2))();
					return ext.getAccount(config);
				};

				const user = await selectAccount();
				const userAccount = user.account.address;

				updateState({
					account: { account: { address: userAccount } },
				});

				updateState({ dappAccount: config.account.address });

				// allow UI to catch up with the loading state
				await sleep(100);

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

				// The provider would reject a spent session, so go straight to the
				// re-mint recovery the wrapper listens for.
				const challengeSessionId = frictionlessState?.sessionId;
				if (spentSession.isSpent(challengeSessionId)) {
					updateState({
						loading: false,
						error: {
							message: "No session found",
							key: "CAPTCHA.NO_SESSION_FOUND",
						},
					});
					events.onError(new Error("No session found"));
					return;
				}

				// A zero timeout attaches SIMD readings only if they are already in.
				const simdReadingsOnChallenge = frictionlessState?.getSimdReadings
					? await frictionlessState.getSimdReadings(0)
					: undefined;
				const challenge = await providerApi.getIconOrderCaptchaChallenge(
					userAccount,
					getDappAccount(),
					challengeSessionId,
					simdReadingsOnChallenge,
				);
				// Marked only once the provider has answered: a throw may mean the
				// request never landed, and providerRetry then fails over with the
				// same session.
				spentSession.markSpent(challengeSessionId);

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

				storedChallengeResponse = challenge;
				storedProviderApi = providerApi;
				storedProviderUrl = providerUrl;
				storedUser = user;

				updateState({
					loading: false,
				});
			},
			async () => {
				// Re-entering with the defaults would replace the real click with (0, 0).
				await start(x, y);
			},
			() => {
				resetState();
			},
			state.attemptCount,
			3,
		);

		// Retries re-enter start(), so return what the last attempt stored.
		return storedChallengeResponse;
	};

	const submitSolution = async (
		clicks: IconClick[],
		iconOrderEvents: IconOrderEvent[],
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

			const encryptedBehavioralData =
				await encryptBehavioralDataForSubmit(frictionlessState);

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

			const simdReadings = await getSimdReadingsForSubmit(frictionlessState);
			const clientMetaData = buildClientMetaData(
				getHoneypotValue?.(),
				getConfig().clientSessionId,
			);
			const verifiedSolution = await providerApi.submitIconOrderCaptchaSolution(
				challenge,
				getAccount().account.account.address,
				getDappAccount(),
				clicks,
				iconOrderEvents,
				userTimestampSignature.signature.toString(),
				encryptedBehavioralData,
				salt,
				simdReadings,
				clientMetaData,
			);
			if (lifecycle.isDisposed()) return false;

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
						[ApiParams.captchaType]: CaptchaType.iconOrder,
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
		dispose: lifecycle.dispose,
	};
};
