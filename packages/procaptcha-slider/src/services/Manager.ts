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

import { Extension, ExtensionWeb2 } from "@prosopo/account";
import { ProviderApi } from "@prosopo/api";
import { ProsopoEnvError } from "@prosopo/common";
import { getFingerprint } from "@prosopo/fingerprint";
import {
	ExtensionLoader,
	buildUpdateState,
	getDefaultEvents,
	getRandomActiveProvider,
} from "@prosopo/procaptcha-common";
import {
	type FrictionlessState,
	type MouseMovement,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigInput,
	ProcaptchaConfigSchema,
	type ProcaptchaSliderState,
	type ProcaptchaSliderStateUpdateFn,
	type SliderCaptchaResponseBody,
	type SliderVerificationResult,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { sleep } from "@prosopo/util";

// The minimum time (in milliseconds) a human should spend solving a slider captcha
const MIN_SOLVE_TIME = 1000;

// The maximum time (in milliseconds) a verified solution is valid (10 minutes)
const VERIFIED_TIMEOUT = 10 * 60 * 1000;

// The maximum time (in milliseconds) a user is allowed to solve a slider captcha (2 minutes)
const SOLUTION_TIMEOUT = 2 * 60 * 1000;

// A custom API parameter constants similar to what's used in other captcha modules
const ApiParams = {
	verified: "verified",
	timestamp: "timestamp",
	challenge: "challenge",
	user: "user",
	dapp: "dapp",
	solution: "solution",
	nonce: "nonce",
	signature: "signature",
	mouseMovements: "mouseMovements",
	solveTime: "solveTime",
	fingerprint: "fingerprint",
};

// Add debug function at the top of the file (after imports)
const DEBUG_PREFIX = "[SliderCaptcha Manager]";
const debug = (message: string, data?: any) => {
	if (data) {
		console.log(`${DEBUG_PREFIX} ${message}`, data);
	} else {
		console.log(`${DEBUG_PREFIX} ${message}`);
	}
};

// Add a custom buildUpdateState function for slider state
const buildSliderUpdateState =
	(
		state: ProcaptchaSliderState,
		onStateUpdate: ProcaptchaSliderStateUpdateFn,
	) =>
	(newState: Partial<ProcaptchaSliderState>) => {
		// Preserve the additional properties that aren't part of the base state
		const preservedState = {
			config: state.config,
			frictionlessState: state.frictionlessState,
			i18n: state.i18n,
			callbacks: state.callbacks,
			mouseMovements: state.mouseMovements,
			attemptCount: state.attemptCount,
		};

		onStateUpdate({
			...preservedState,
			...newState,
		});
	};

/**
 * Manager function for the Slider Captcha
 * Handles initialization, user creation, and verification processes
 */
export const Manager = (
	configInput: ProcaptchaClientConfigInput,
	state: ProcaptchaSliderState,
	onStateUpdate: ProcaptchaSliderStateUpdateFn,
	callbacks: ProcaptchaCallbacks,
	frictionlessState?: FrictionlessState,
) => {
	debug("Initializing Slider Captcha Manager", {
		web2: configInput.web2,
		hasUserAccount: !!configInput.userAccountAddress,
	});

	// Get default event callbacks
	const events = getDefaultEvents(callbacks);
	debug("Event handlers registered");

	/**
	 * Default state for the slider captcha
	 */
	const defaultState = (): Partial<ProcaptchaSliderState> => {
		debug("Setting default state");
		return {
			showModal: false,
			loading: false,
			isHuman: false,
			challenge: undefined,
			account: undefined,
			dappAccount: undefined,
			error: undefined,
			mouseMovements: [],
			captchaStartTime: undefined,
			attemptCount: 0,
		};
	};

	/**
	 * Clear timeout if it exists
	 */
	const clearTimeout = () => {
		debug("Clearing timeout");
		// Clear the timeout
		window.clearTimeout(Number(state.timeout));
		// Clear the timeout from the state
		updateState({ timeout: undefined });
	};

	/**
	 * Handle failed verification
	 */
	const onFailed = () => {
		debug("Verification failed");
		updateState({
			isHuman: false,
			loading: false,
		});
		debug("Calling onFailed event handler");
		events.onFailed();
		debug("Resetting state after failure");
		resetState(frictionlessState?.restart);
	};

	/**
	 * Clear successful challenge timeout
	 */
	const clearSuccessfulChallengeTimeout = () => {
		debug("Clearing successful challenge timeout");
		// Clear the timeout
		window.clearTimeout(Number(state.successfullChallengeTimeout));
		// Clear the timeout from the state
		updateState({ successfullChallengeTimeout: undefined });
	};

	/**
	 * Get the parsed configuration
	 */
	const getConfig = () => {
		debug("Getting configuration");
		const config: ProcaptchaClientConfigInput = {
			userAccountAddress: "",
			...configInput,
		};

		// Overwrite the account in use with the one in state if it exists
		if (state.account) {
			debug("Using account from state", {
				address: state.account.account.address,
			});
			config.userAccountAddress = state.account.account.address;
		}

		debug("Parsing configuration with schema");
		return ProcaptchaConfigSchema.parse(config);
	};

	/**
	 * Get the account from state
	 */
	const getAccount = () => {
		debug("Getting account");
		if (!state.account) {
			debug("Account not found in state");
			throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
				context: { error: "Account not loaded" },
			});
		}

		debug("Account found", { address: state.account.account.address });
		return { account: state.account };
	};

	/**
	 * Get the dapp account from state
	 */
	const getDappAccount = () => {
		debug("Getting dapp account");
		if (!state.dappAccount) {
			debug("Dapp account not found");
			throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
		}

		debug("Dapp account found", { dappAccount: state.dappAccount });
		return state.dappAccount;
	};

	// Wrap the update state function with debug logging
	const updateState = (newState: Partial<ProcaptchaSliderState>) => {
		debug("Updating state", newState);
		return buildSliderUpdateState(state, onStateUpdate)(newState);
	};

	/**
	 * Reset the state to defaults
	 */
	const resetState = (frictionlessRestart?: () => void) => {
		debug("Resetting state");
		// Clear timeouts
		clearTimeout();
		clearSuccessfulChallengeTimeout();

		// Reset state to defaults
		updateState(defaultState());

		// Call onReset event
		debug("Calling onReset event handler");
		events.onReset();

		// Reset the frictionless state if necessary
		if (frictionlessRestart) {
			debug("Restarting frictionless state");
			frictionlessRestart();
		}

		// Reset mouse movements and start time
		debug("Clearing mouse movement data", {
			previousCount: state.mouseMovements.length,
		});
		state.mouseMovements.length = 0;
		state.captchaStartTime = undefined;
		debug("State reset complete");
	};

	/**
	 * Set a timeout for how long the verification is valid
	 */
	const setValidChallengeTimeout = () => {
		debug("Setting valid challenge timeout", { timeoutMs: VERIFIED_TIMEOUT });
		const timeMillis: number = VERIFIED_TIMEOUT;
		const successfullChallengeTimeout = setTimeout(() => {
			debug("Challenge verification expired");
			// Human state expired, disallow user's claim to be human
			updateState({ isHuman: false });

			debug("Calling onExpired event handler");
			events.onExpired();
			debug("Resetting state after expiration");
			resetState(frictionlessState?.restart);
		}, timeMillis);

		updateState({ successfullChallengeTimeout });
		debug("Valid challenge timeout set", {
			timeout: successfullChallengeTimeout,
		});
	};

	/**
	 * Set a timeout for how long the user has to solve the captcha
	 */
	const setChallengeTimeout = () => {
		debug("Setting challenge solution timeout", {
			timeoutMs: SOLUTION_TIMEOUT,
		});
		const timeMillis: number = SOLUTION_TIMEOUT;
		const timeout = setTimeout(() => {
			debug("Challenge solution timeout occurred");
			// User took too long to solve the captcha
			updateState({
				showModal: false,
				loading: false,
			});

			debug("Calling onChallengeExpired event handler");
			events.onChallengeExpired();
			debug("Resetting state after challenge expiration");
			resetState(frictionlessState?.restart);
		}, timeMillis);

		updateState({ timeout });
		debug("Challenge solution timeout set", { timeout });
	};

	/**
	 * Track mouse movement for verification
	 */
	const trackMouseMovement = (x: number, y: number) => {
		const movement: MouseMovement = {
			x,
			y,
			time: Date.now(),
		};
		state.mouseMovements.push(movement);

		// Only log every 10th movement to reduce console spam
		if (state.mouseMovements.length % 10 === 0) {
			debug("Tracking mouse movement", {
				movement,
				totalRecorded: state.mouseMovements.length,
				timeElapsed: state.captchaStartTime
					? Date.now() - state.captchaStartTime
					: "unknown",
			});
		}
	};

	/**
	 * Verify slider captcha solution
	 */
	const verifySolution = async (
		sliderPosition: number,
		targetPosition: number,
	) => {
		debug("Verifying slider solution", {
			sliderPosition,
			targetPosition,
			difference: Math.abs(sliderPosition - targetPosition),
		});

		// If no start time was recorded, verification fails
		if (!state.captchaStartTime) {
			debug("Verification failed - No captcha start time recorded");
			return false;
		}

		// Calculate solve time
		const solveTime = Date.now() - state.captchaStartTime;
		debug("Solution time calculated", {
			solveTimeMs: solveTime,
			minRequiredTimeMs: MIN_SOLVE_TIME,
		});

		// Check if user solved too quickly (potential bot)
		if (solveTime < MIN_SOLVE_TIME) {
			debug("Verification failed - Solved too quickly (potential bot)", {
				solveTimeMs: solveTime,
				minRequiredTimeMs: MIN_SOLVE_TIME,
			});
			return false;
		}

		// Check if slider position is close enough to target
		const positionDifference = Math.abs(sliderPosition - targetPosition);
		const isPositionCorrect = positionDifference < 10;
		debug("Position verification", {
			isPositionCorrect,
			positionDifference,
			toleranceThreshold: 10,
		});

		// Check if there's enough mouse movement variance (anti-bot measure)
		let hasMouseVariance = false;
		let yVariance = 0;
		if (state.mouseMovements.length > 5) {
			// Calculate variance in Y positions (natural human movement has variance)
			const yPositions = state.mouseMovements.map((m: MouseMovement) => m.y);
			const yAvg =
				yPositions.reduce((a: number, b: number) => a + b, 0) /
				yPositions.length;
			yVariance =
				yPositions.reduce((a: number, b: number) => a + (b - yAvg) ** 2, 0) /
				yPositions.length;

			// If there's enough variance, it's likely a human
			hasMouseVariance = yVariance > 5;
			debug("Mouse movement analysis", {
				hasMouseVariance,
				yVariance,
				movementCount: state.mouseMovements.length,
				yAverage: yAvg,
				varianceThreshold: 5,
			});
		} else {
			debug("Not enough mouse movements to calculate variance", {
				movementCount: state.mouseMovements.length,
				minimumRequired: 5,
			});
		}

		// Generate a fingerprint for the user
		let fingerprint = "";
		try {
			const extension = new ExtensionWeb2();
			debug("Generating fingerprint");
			const config = getConfig();
			const account = await extension.getAccount(config);
			fingerprint = account.account.address;
		} catch (error) {
			debug("Failed to generate fingerprint", error);
		}

		// Log verification data - this is useful for debugging
		const verificationSummary = {
			isPositionCorrect,
			hasMouseVariance,
			mouseMovements: state.mouseMovements.length,
			solveTime,
			yVariance,
			positionDifference,
			fingerprint: fingerprint,
		};

		debug("Slider Captcha Verification Summary", verificationSummary);

		// For a successful verification, need position to be correct and reasonable mouse movement
		const isVerified = isPositionCorrect && hasMouseVariance;
		debug("Verification result", { isVerified });

		// Create verification data bundle (similar to other captcha modules)
		const verificationData = {
			[ApiParams.verified]: isVerified,
			[ApiParams.timestamp]: Date.now(),
			[ApiParams.challenge]: {
				target: targetPosition,
				width: 320, // Canvas width
			},
			[ApiParams.solution]: {
				position: sliderPosition,
			},
			[ApiParams.mouseMovements]: state.mouseMovements.length,
			[ApiParams.solveTime]: solveTime,
			[ApiParams.fingerprint]: fingerprint,
		};

		// Log verification data for debugging
		debug("Full verification data", verificationData);

		return isVerified;
	};

	/**
	 * Start the slider captcha process
	 */
	const start = async () => {
		debug("Starting slider captcha process");
		try {
			// Check if already loading or verified
			if (state.loading) {
				debug("Already loading, ignoring start request");
				return;
			}
			if (state.isHuman) {
				debug("Already verified as human, ignoring start request");
				return;
			}

			// Reset the state to defaults
			debug("Resetting state before starting");
			resetState();

			// Set loading state
			debug("Setting loading state");
			updateState({
				loading: true,
			});

			// Increment attempt counter
			const newAttemptCount = state.attemptCount + 1;
			debug("Incrementing attempt counter", {
				previousCount: state.attemptCount,
				newCount: newAttemptCount,
			});
			updateState({ attemptCount: newAttemptCount });

			const config = getConfig();
			debug("Got configuration", {
				web2: config.web2,
				userAccountAddress:
					config.userAccountAddress?.substring(0, 8) || "none",
			});

			// Create or get user account
			debug("Selecting account");
			const selectAccount = async () => {
				if (frictionlessState) {
					debug("Using frictionless state user account");
					return frictionlessState.userAccount;
				}

				debug("Creating anonymous account using fingerprint (web2 mode)");
				const extension = new ExtensionWeb2();
				const config = getConfig();
				const account = await extension.getAccount(config);
				return {
					account: { address: account.account.address },
				};
			};

			// Get or create user account
			debug("Getting user account");
			const user = await selectAccount();
			const userAccount = user.account.address;
			debug("User account obtained", {
				accountType: config.web2 ? "web2-anonymous" : "web3",
				addressPrefix: `${userAccount.substring(0, 8)}...`,
			});

			// Set the account in state
			debug("Setting account in state");
			updateState({
				account: { account: { address: userAccount } },
			});

			// Set dapp account in state
			debug("Setting dapp account in state", {
				dappAccount: config.account.address,
			});
			updateState({ dappAccount: config.account.address });

			// Get a random provider
			let providerResponse;
			if (frictionlessState?.provider) {
				providerResponse = frictionlessState.provider;
			} else {
				// Get a random provider
				providerResponse = await getRandomActiveProvider(getConfig());
			}

			const providerUrl = providerResponse.provider.url;
			debug("Got provider URL", { providerUrl });

			// Create provider API client with null check
			if (!config.account?.address) {
				throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING", {
					context: { error: "Dapp account address is required" },
				});
			}

			const providerApi = new ProviderApi(providerUrl, config.account.address);
			debug("Created provider API client");

			try {
				// Call the provider API to get a slider captcha challenge
				debug("Requesting slider captcha challenge from provider");

				const sliderCaptchaResponse =
					await providerApi.getSliderCaptchaChallenge(
						userAccount,
						config.account.address,
						frictionlessState?.sessionId,
					);

				debug("Received slider captcha challenge", sliderCaptchaResponse);
			} catch (err) {
				debug("Error getting slider captcha challenge", err);
				console.error("Failed to get slider captcha challenge", err);
				// Fall back to client-side generation only if API fails
				debug("Falling back to client-side captcha generation");
			}

			// Let UI catch up with loading state
			debug("Sleeping briefly to let UI catch up");
			await sleep(100);

			// Show the captcha modal
			debug("Showing captcha modal");
			updateState({
				showModal: true,
				loading: false,
			});

			// Start tracking time
			state.captchaStartTime = Date.now();
			debug("Started tracking solve time", {
				startTime: state.captchaStartTime,
			});

			// Set challenge timeout
			debug("Setting challenge timeout");
			setChallengeTimeout();

			// Now we wait for the user to solve the captcha
			debug("Waiting for user to solve the captcha");

			debug("Calling onOpen event handler");
			events.onOpen();
		} catch (error) {
			debug("Error starting slider captcha", error);
			updateState({
				loading: false,
				error: {
					message:
						error instanceof Error
							? error.message
							: "Unknown error starting captcha",
					key: "CAPTCHA.START_ERROR",
				},
			});

			debug("Resetting state after error");
			resetState(frictionlessState?.restart);
		}
	};

	/**
	 * Handle successful verification
	 */
	const onSuccess = async (sliderPosition: number, targetPosition: number) => {
		debug("Starting success handler", { sliderPosition, targetPosition });

		try {
			// Get config and accounts
			const config = getConfig();
			const userAccount = getAccount().account.account.address;
			const dappAccount = getDappAccount();

			// Generate a fingerprint for the user
			const fingerprint = await getFingerprint();

			// Calculate solve time
			const solveTime = Date.now() - (state.captchaStartTime || Date.now());

			// Get provider URL from frictionless state or get a new one
			let providerUrl;
			if (frictionlessState?.provider) {
				providerUrl = frictionlessState.provider.provider.url;
			} else {
				// Get a new provider
				const randomProvider = await getRandomActiveProvider(getConfig());
				providerUrl = randomProvider.provider.url;
			}

			// Create provider API client
			const providerApi = new ProviderApi(providerUrl, dappAccount);

			debug("Submitting slider solution to provider", {
				user: userAccount,
				dapp: dappAccount,
				position: sliderPosition,
				targetPosition: targetPosition,
				mouseMovements: state.mouseMovements.length,
				solveTime,
			});

			// Todo: get timestamp from state from provider
			const timestamp = Date.now().toString();
			// Todo: get challenge signature from state from provider
			const challengeSignature = "client-generated";

			// Make the actual API call to submit the slider solution
			const response = await providerApi.submitSliderCaptchaSolution(
				userAccount,
				dappAccount,
				sliderPosition,
				targetPosition,
				state.mouseMovements,
				solveTime,
				timestamp,
				{
					user: {
						timestamp: fingerprint,
					},
					provider: {
						challenge: challengeSignature,
					},
				},
				fingerprint,
			);

			debug("Received slider solution verification", response);

			// Check server verification result
			if (!response.verified) {
				debug("Server verification failed");
				onFailed();
				return false;
			}

			// Server verified the solution, set user as human
			updateState({
				isHuman: true,
				loading: false,
				showModal: false,
			});

			// Generate a token with verification data
			debug("Generating verification token");
			const verificationToken = encodeProcaptchaOutput({
				user: userAccount,
				dapp: dappAccount,
				challenge: targetPosition.toString(),
				timestamp: timestamp,
				signature: {
					provider: {
						// Provider signature fields
						challenge: challengeSignature,
						requestHash: undefined,
						timestamp: undefined,
					},
					user: {
						// User signature fields
						challenge: undefined,
						requestHash: undefined,
						timestamp: fingerprint, // Use fingerprint as timestamp signature for web2
					},
				},
			});
			debug("Verification token generated", {
				tokenLength: verificationToken.length,
			});

			// Call onHuman callback with token
			debug("Calling onHuman event handler with token");
			events.onHuman(verificationToken);

			// Set timeout for how long verification is valid
			debug("Setting verification validity timeout");
			setValidChallengeTimeout();

			debug("Success handling complete");
			return true;
		} catch (err) {
			debug("Error submitting slider solution", err);
			console.error("Failed to submit slider solution", err);

			// Fall back to client-side verification only if server API call fails
			debug("Falling back to client-side verification");
			const isVerified = await verifySolution(sliderPosition, targetPosition);

			if (isVerified) {
				debug("Client-side verification successful");

				// Set user as human
				updateState({
					isHuman: true,
					loading: false,
					showModal: false,
				});

				// Generate a token with verification data (client-side generated)
				debug("Generating client-side verification token");
				const fingerprint = await getFingerprint();
				debug("Fingerprint for token generated", {
					fingerprintPrefix: `${fingerprint.substring(0, 8)}...`,
				});

				const verificationToken = encodeProcaptchaOutput({
					user: getAccount().account.account.address,
					dapp: getDappAccount(),
					challenge: targetPosition.toString(),
					timestamp: Date.now().toString(),
					signature: {
						provider: {
							// Provider signature fields
							challenge: "client-verified",
							requestHash: undefined,
							timestamp: undefined,
						},
						user: {
							// User signature fields
							challenge: undefined,
							requestHash: undefined,
							timestamp: fingerprint, // Use fingerprint as timestamp signature for web2
						},
					},
				});
				debug("Client-side verification token generated", {
					tokenLength: verificationToken.length,
				});

				// Call onHuman callback with token
				debug("Calling onHuman event handler with client-side token");
				events.onHuman(verificationToken);

				// Set timeout for how long verification is valid
				debug("Setting verification validity timeout");
				setValidChallengeTimeout();

				debug("Client-side success handling complete");
				return true;
			}
			debug("Client-side verification failed");
			// Client-side verification failed
			onFailed();
			return false;
		}
	};

	debug("Manager initialized and ready");
	return {
		start,
		resetState,
		trackMouseMovement,
		onSuccess,
		verifySolution,
	};
};
