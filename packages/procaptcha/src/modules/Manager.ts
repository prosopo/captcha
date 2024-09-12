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
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { randomAsHex } from "@polkadot/util-crypto/random";
import { stringToHex } from "@polkadot/util/string";
import { ExtensionWeb2, ExtensionWeb3 } from "@prosopo/account";
import { ProviderApi } from "@prosopo/api";
import {
	ProsopoDatasetError,
	ProsopoEnvError,
	ProsopoError,
} from "@prosopo/common";
import { loadBalancer } from "@prosopo/load-balancer";
import {
	buildUpdateState,
	getDefaultEvents,
	getRandomActiveProvider,
	providerRetry,
} from "@prosopo/procaptcha-common";
import {
	type Account,
	ApiParams,
	type CaptchaResponseBody,
	type CaptchaSolution,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigInput,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
	type ProcaptchaState,
	type ProcaptchaStateUpdateFn,
	type TCaptchaSubmitResult,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { at, hashToHex } from "@prosopo/util";
import { sleep } from "../utils/utils.js";
import ProsopoCaptchaApi from "./ProsopoCaptchaApi.js";
import storage from "./storage.js";

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

/**
 * The state operator. This is used to mutate the state of Procaptcha during the captcha process. State updates are published via the onStateUpdate callback. This should be used by frontends, e.g. react, to maintain the state of Procaptcha across renders.
 */
export function Manager(
	configOptional: ProcaptchaClientConfigOutput,
	state: ProcaptchaState,
	onStateUpdate: ProcaptchaStateUpdateFn,
	callbacks: ProcaptchaCallbacks,
	score = 0,
) {
	const events = getDefaultEvents(onStateUpdate, state, callbacks);

	// get the state update mechanism
	const updateState = buildUpdateState(state, onStateUpdate);

	/**
	 * Build the config on demand, using the optional config passed in from the outside. State may override various
	 * config values depending on the state of the captcha process. E.g. if the process has been started using account
	 * "ABC" and then the user changes account to "DEF" via the optional config prop, the account in use will not change.
	 * This is because the captcha process has already been started using account "ABC".
	 * @returns the config for procaptcha
	 */
	const getConfig = () => {
		const config: ProcaptchaClientConfigInput = {
			userAccountAddress: "",
			...configOptional,
		};
		// overwrite the account in use with the one in state if it exists. Reduces likelihood of bugs where the user
		// changes account in the middle of the captcha process.
		if (state.account) {
			config.userAccountAddress = state.account.account.address;
		}
		return ProcaptchaConfigSchema.parse(config);
	};

	/**
	 * Called on start of user verification. This is when the user ticks the box to claim they are human.
	 */
	const start = async () => {
		events.onOpen();
		await providerRetry(
			async () => {
				if (state.loading) {
					return;
				}
				if (state.isHuman) {
					return;
				}
				await cryptoWaitReady();

				resetState();
				// set the loading flag to true (allow UI to show some sort of loading / pending indicator while we get the captcha process going)
				updateState({ loading: true });
				updateState({
					attemptCount: state.attemptCount ? state.attemptCount + 1 : 1,
				});

				// snapshot the config into the state
				const config = getConfig();
				updateState({ dappAccount: config.account.address });

				// allow UI to catch up with the loading state
				await sleep(100);

				const account = await loadAccount();

				// get a random provider
				const getRandomProviderResponse = await getRandomActiveProvider(
					getConfig(),
				);

				const providerUrl = getRandomProviderResponse.provider.url;
				// get the provider api inst
				const providerApi = await loadProviderApi(providerUrl);

				const captchaApi = new ProsopoCaptchaApi(
					account.account.address,
					getRandomProviderResponse,
					providerApi,
					config.web2,
					config.account.address || "",
				);
				updateState({ captchaApi });

				const challenge = await captchaApi.getCaptchaChallenge();

				if (challenge.error) {
					updateState({
						loading: false,
						error: challenge.error,
					});
				} else {
					if (challenge.captchas.length <= 0) {
						throw new ProsopoDatasetError("DEVELOPER.PROVIDER_NO_CAPTCHA");
					}

					// setup timeout, taking the timeout from the individual captcha or the global default
					const timeMillis: number = challenge.captchas
						.map(
							(captcha) =>
								captcha.timeLimitMs || config.captchas.image.challengeTimeout,
						)
						.reduce((a: number, b: number) => a + b);
					const timeout = setTimeout(() => {
						events.onChallengeExpired();
						// expired, disallow user's claim to be human
						updateState({ isHuman: false, showModal: false, loading: false });
					}, timeMillis);

					// update state with new challenge
					updateState({
						index: 0,
						solutions: challenge.captchas.map(() => []),
						challenge,
						showModal: true,
						timeout,
					});
				}
			},
			start,
			resetState,
			state.attemptCount,
			10,
		);
	};

	const submit = async () => {
		await providerRetry(
			async () => {
				// disable the time limit, user has submitted their solution in time
				clearTimeout();

				if (!state.challenge) {
					throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
						context: { error: "Cannot submit, no Captcha found in state" },
					});
				}

				// hide the modal, no further input required from user
				updateState({ showModal: false });

				const challenge: CaptchaResponseBody = state.challenge;
				const salt = randomAsHex();

				// append solution to each captcha in the challenge
				const captchaSolution: CaptchaSolution[] = state.challenge.captchas.map(
					(captcha, index) => {
						const solution = at(state.solutions, index);
						return {
							captchaId: captcha.captchaId,
							captchaContentId: captcha.captchaContentId,
							salt,
							solution,
						};
					},
				);

				const account = getAccount();
				const signer = getExtension(account).signer;

				const first = at(challenge.captchas, 0);
				if (!first.datasetId) {
					throw new ProsopoDatasetError("CAPTCHA.INVALID_CAPTCHA_ID", {
						context: { error: "No datasetId set for challenge" },
					});
				}

				const captchaApi = state.captchaApi;

				if (!captchaApi) {
					throw new ProsopoError("CAPTCHA.INVALID_TOKEN", {
						context: { error: "No Captcha API found in state" },
					});
				}

				if (!signer || !signer.signRaw) {
					throw new ProsopoEnvError("GENERAL.CANT_FIND_KEYRINGPAIR", {
						context: {
							error:
								"Signer is not defined, cannot sign message to prove account ownership",
						},
					});
				}

				const userRequestHashSignature = await signer.signRaw({
					address: account.account.address,
					data: stringToHex(challenge.requestHash),
					type: "bytes",
				});

				// send the commitment to the provider
				const submission: TCaptchaSubmitResult =
					await captchaApi.submitCaptchaSolution(
						userRequestHashSignature.signature,
						challenge.requestHash,
						captchaSolution,
						challenge.timestamp,
						challenge.signature.provider.requestHash,
						score,
					);

				// mark as is human if solution has been approved
				const isHuman = submission[0].verified;

				if (!isHuman) {
					// user failed the captcha for some reason according to the provider
					events.onFailed();
				}

				// update the state with the result of the submission
				updateState({
					submission,
					isHuman,
					loading: false,
				});
				if (state.isHuman) {
					const providerUrl = captchaApi.provider.provider.url;
					// cache this provider for future use
					storage.setProcaptchaStorage({
						...storage.getProcaptchaStorage(),
						providerUrl,
					});
					events.onHuman(
						encodeProcaptchaOutput({
							[ApiParams.providerUrl]: providerUrl,
							[ApiParams.user]: account.account.address,
							[ApiParams.dapp]: getDappAccount(),
							[ApiParams.commitmentId]: hashToHex(submission[1]),
							[ApiParams.timestamp]: challenge.timestamp,
							[ApiParams.signature]: {
								[ApiParams.provider]: {
									[ApiParams.requestHash]:
										challenge.signature.provider.requestHash,
								},
								[ApiParams.user]: {
									[ApiParams.requestHash]: userRequestHashSignature.signature,
								},
							},
						}),
					);
					setValidChallengeTimeout();
				}
			},
			start,
			resetState,
			state.attemptCount,
			10,
		);
	};

	const cancel = async () => {
		// disable the time limit
		clearTimeout();
		// abandon the captcha process
		resetState();
		// trigger the onClose event
		events.onClose();
	};

	/**
	 * (De)Select an image from the solution for the current round. If the hash is already in the solutions list, it will be removed (deselected) and if not it will be added (selected).
	 * @param hash the hash of the image
	 */
	const select = (hash: string) => {
		if (!state.challenge) {
			throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
				context: { error: "Cannot select, no Captcha found in state" },
			});
		}
		if (state.index >= state.challenge.captchas.length || state.index < 0) {
			throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
				context: {
					error: "Cannot select, index is out of range for this Captcha",
				},
			});
		}
		const index = state.index;
		const solutions = state.solutions;
		const solution = at(solutions, index);
		if (solution.includes(hash)) {
			// remove the hash from the solution
			solution.splice(solution.indexOf(hash), 1);
		} else {
			// add the hash to the solution
			solution.push(hash);
		}
		updateState({ solutions });
	};

	/**
	 * Proceed to the next round of the challenge.
	 */
	const nextRound = () => {
		if (!state.challenge) {
			throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
				context: { error: "Cannot select, no Captcha found in state" },
			});
		}
		if (state.index + 1 >= state.challenge.captchas.length) {
			throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
				context: {
					error: "Cannot select, index is out of range for this Captcha",
				},
			});
		}

		updateState({ index: state.index + 1 });
	};

	const loadProviderApi = async (providerUrl: string) => {
		const config = getConfig();
		if (!config.account.address) {
			throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
		}
		return new ProviderApi(providerUrl, config.account.address);
	};

	const clearTimeout = () => {
		// clear the timeout
		window.clearTimeout(state.timeout);
		// then clear the timeout from the state
		updateState({ timeout: undefined });
	};

	const setValidChallengeTimeout = () => {
		const timeMillis: number = configOptional.captchas.image.solutionTimeout;
		const successfullChallengeTimeout = setTimeout(() => {
			// Human state expired, disallow user's claim to be human
			updateState({ isHuman: false });

			events.onExpired();
		}, timeMillis);

		updateState({ successfullChallengeTimeout });
	};

	const resetState = () => {
		// clear timeout just in case a timer is still active (shouldn't be)
		clearTimeout();
		updateState(defaultState());
	};

	/**
	 * Load the account using address specified in config, or generate new address if not found in local storage for web2 mode.
	 */
	const loadAccount = async () => {
		const config = getConfig();
		// check if account has been provided in config (doesn't matter in web2 mode)
		if (!config.web2 && !config.userAccountAddress) {
			throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
				context: { error: "Account address has not been set for web3 mode" },
			});
		}

		// check if account exists in extension
		const ext = config.web2 ? new ExtensionWeb2() : new ExtensionWeb3();
		const account = await ext.getAccount(config);
		// Store the account in local storage
		storage.setAccount(account.account.address);

		updateState({ account });

		return getAccount();
	};

	const getAccount = () => {
		if (!state.account) {
			throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
				context: { error: "Account not loaded" },
			});
		}
		const account: Account = state.account;
		return account;
	};

	const getDappAccount = () => {
		if (!state.dappAccount) {
			throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
		}

		const dappAccount: string = state.dappAccount;
		return dappAccount;
	};

	const getExtension = (possiblyAccount?: Account) => {
		const account = possiblyAccount || getAccount();
		if (!account.extension) {
			throw new ProsopoEnvError("ACCOUNT.NO_POLKADOT_EXTENSION", {
				context: { error: "Extension not loaded" },
			});
		}

		return account.extension;
	};

	return {
		start,
		cancel,
		submit,
		select,
		nextRound,
	};
}
