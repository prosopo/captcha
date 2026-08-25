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

import { loadI18next, useTranslation } from "@prosopo/locale";
import { buildUpdateState, useProcaptcha } from "@prosopo/procaptcha-common";
import { Checkbox, Honeypot, isEventTrusted } from "@prosopo/procaptcha-common";
import {
	type ConnectEvent,
	type GetConnectCaptchaResponse,
	ModeEnum,
	type ProcaptchaProps,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useCallback, useEffect, useRef, useState } from "react";
import { Manager } from "../services/Manager.js";
import { ConnectBoard } from "./ConnectBoard.js";

// Define the same event name as in the bundle for consistency
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

type ConnectPhase = "checkbox" | "playing" | "submitting";

const Procaptcha = (props: ProcaptchaProps) => {
	const { t, ready: isTranslationReady } = useTranslation();
	const config = props.config;
	const i18n = props.i18n;
	const theme = "light" === config.theme ? lightTheme : darkTheme;
	const frictionlessState = props.frictionlessState; // Set up Session ID and Provider if they exist
	const callbacks = props.callbacks || {};
	const [state, _updateState] = useProcaptcha(useState, useRef);
	const [loading, setLoading] = useState(false);
	const [connectPhase, setConnectPhase] = useState<ConnectPhase>("checkbox");
	const [challengeData, setChallengeData] =
		useState<GetConnectCaptchaResponse | null>(null);
	const [showRetry, setShowRetry] = useState(false);
	// get the state update mechanism
	const updateState = buildUpdateState(state, _updateState);
	const hpRef = useRef<HTMLInputElement>(null);
	const manager = useRef(
		Manager(
			config,
			state,
			updateState,
			callbacks,
			frictionlessState,
			() => hpRef.current?.value || undefined,
		),
	);
	// See ProcaptchaWidget (procaptcha-pow) — same session-invalidation
	// recovery contract with coords preservation across a re-mint.
	const lastCoordsRef = useRef<{ x: number; y: number } | null>(null);
	const sessionInvalidatedFiredRef = useRef(false);

	useEffect(() => {
		if (!config.language) return;
		if (i18n) {
			if (i18n.language !== config.language) {
				void i18n.changeLanguage(config.language);
			}
			return;
		}
		// Direct-React consumers don't go through WidgetFactory, so pass the
		// language into loadI18next — first init boots with the right language
		// (skipping browser detection), and subsequent calls reconcile via
		// changeLanguage inside loadI18next.
		void loadI18next(false, config.language);
	}, [i18n, config.language]);

	useEffect(() => {
		if (!props.autoStart) return;
		setLoading(true);
		setShowRetry(false);
		const coords = props.startCoords;
		lastCoordsRef.current = coords ?? null;
		manager.current.start(coords?.x ?? 0, coords?.y ?? 0).then(
			(challenge) => {
				if (challenge) {
					setChallengeData(challenge);
					setConnectPhase("playing");
				}
				setLoading(false);
			},
			() => setLoading(false),
		);
	}, [props.autoStart, props.startCoords]);

	useEffect(() => {
		if (!state.error) return undefined;
		setLoading(false);
		setConnectPhase("checkbox");
		setChallengeData(null);
		setShowRetry(false);
		if (state.error.key !== "CAPTCHA.NO_SESSION_FOUND") return undefined;
		if (props.onSessionInvalidated && !sessionInvalidatedFiredRef.current) {
			sessionInvalidatedFiredRef.current = true;
			const coords = lastCoordsRef.current;
			props.onSessionInvalidated(coords?.x, coords?.y);
			return undefined;
		}
		if (frictionlessState) {
			const timer = setTimeout(() => {
				frictionlessState.restart();
			}, 100);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [state.error, frictionlessState, props.onSessionInvalidated]);

	// Add event listener for the execute event (works for invisible mode)
	useEffect(() => {
		// Only set up event listener if in invisible mode
		if (config.mode === ModeEnum.invisible) {
			// Event handler for when execute() is called: fetch a challenge
			// then drive the board UI through the same phase transitions as
			// the visible checkbox flow.
			const handleExecuteEvent = async () => {
				if (loading) {
					return;
				}
				setLoading(true);
				setShowRetry(false);
				try {
					const challenge = await manager.current.start();
					if (challenge) {
						setChallengeData(challenge);
						setConnectPhase("playing");
					}
				} catch (error) {
					callbacks.onError?.(
						error instanceof Error ? error : new Error(String(error)),
					);
				} finally {
					setLoading(false);
				}
			};

			document.addEventListener(PROCAPTCHA_EXECUTE_EVENT, handleExecuteEvent);

			// Cleanup function to remove event listener
			return () => {
				document.removeEventListener(
					PROCAPTCHA_EXECUTE_EVENT,
					handleExecuteEvent,
				);
			};
		}

		// Return empty cleanup function when not in invisible mode
		return () => {};
	}, [config.mode, callbacks.onError, loading]);

	const handleMove = useCallback(
		async (
			sourceIndex: number,
			targetIndex: number,
			connectEvents: ConnectEvent[],
		) => {
			setConnectPhase("submitting");
			let verified = false;
			try {
				verified = await manager.current.submitSolution(
					sourceIndex,
					targetIndex,
					connectEvents,
				);
			} catch (error) {
				callbacks.onError?.(
					error instanceof Error ? error : new Error(String(error)),
				);
			}

			if (verified) {
				setConnectPhase("checkbox");
				setChallengeData(null);
				setShowRetry(false);
				setLoading(false);
				return;
			}

			// Failed — show retry message and fetch a new challenge
			setShowRetry(true);
			setConnectPhase("playing");

			try {
				const newChallenge = await manager.current.start();
				if (newChallenge) {
					setChallengeData(newChallenge);
				} else {
					// Couldn't get new challenge, fall back to checkbox
					setConnectPhase("checkbox");
					setChallengeData(null);
					setShowRetry(false);
				}
			} catch {
				setConnectPhase("checkbox");
				setChallengeData(null);
				setShowRetry(false);
			}
			setLoading(false);
		},
		[callbacks.onError],
	);

	const isInvisible = config.mode === ModeEnum.invisible;
	const showBoardOverlay =
		(connectPhase === "playing" || connectPhase === "submitting") &&
		challengeData;

	return (
		<>
			{frictionlessState?.hp && (
				<Honeypot ref={hpRef} encodedQuestion={frictionlessState.hp} />
			)}
			{/* Board overlay — rendered outside the shadow DOM flow via fixed
			    positioning. Shown in both visible and invisible modes once a
			    challenge has been fetched; connect is inherently interactive. */}
			{showBoardOverlay && (
				<ConnectBoard
					boardSize={challengeData.boardSize}
					tiles={challengeData.tiles}
					onComplete={handleMove}
					showRetry={showRetry}
					submitting={connectPhase === "submitting"}
					theme={theme}
					instruction={
						isTranslationReady
							? t("WIDGET.CONNECT_INSTRUCTION", {
									// Deliberately not `count`: i18next reads that as a
									// pluralisation trigger and looks for
									// CONNECT_INSTRUCTION_one / _other, which do not exist,
									// so the raw key leaks into the widget.
									length: challengeData.lineLength,
								})
							: ""
					}
					retryText={isTranslationReady ? t("WIDGET.CONNECT_RETRY") : ""}
				/>
			)}

			{/* Checkbox — only in visible mode. Invisible mode is driven by
			    the host page's execute() call (e.g. on form submit). */}
			{!isInvisible && (
				<Checkbox
					checked={state.isHuman}
					theme={theme}
					onChange={async (event: React.MouseEvent | React.TouchEvent) => {
						if (loading) {
							return;
						}
						setLoading(true);
						setShowRetry(false);

						// Capture click coordinates (mirrors POW widget) so the
						// connect solution salt records the entry-point telemetry.
						let x = 0;
						let y = 0;
						const mouseOrTouchEvent = event.nativeEvent;
						if (!isEventTrusted(mouseOrTouchEvent)) {
							// Don't capture coordinates for non-trusted events
						} else if (
							"touches" in mouseOrTouchEvent &&
							mouseOrTouchEvent.touches.length > 0 &&
							mouseOrTouchEvent.touches[0]
						) {
							x = mouseOrTouchEvent.touches[0].clientX;
							y = mouseOrTouchEvent.touches[0].clientY;
						} else if (
							"clientX" in mouseOrTouchEvent &&
							"clientY" in mouseOrTouchEvent
						) {
							x = mouseOrTouchEvent.clientX;
							y = mouseOrTouchEvent.clientY;
						}

						lastCoordsRef.current = { x, y };
						try {
							const challenge = await manager.current.start(x, y);

							if (challenge) {
								setChallengeData(challenge);
								setConnectPhase("playing");
							}
						} catch (error) {
							// The manager reports failures through state.error;
							// rethrowing here only produces an unhandled rejection,
							// since nothing awaits this handler.
							callbacks.onError?.(
								error instanceof Error ? error : new Error(String(error)),
							);
						} finally {
							// A rejected start would otherwise leave the spinner up for
							// good, with no way back to the checkbox for the user.
							setLoading(false);
						}
					}}
					labelText={isTranslationReady ? t("WIDGET.I_AM_HUMAN") : ""}
					error={state.error?.message}
					aria-label="human checkbox"
					loading={loading || connectPhase === "submitting"}
				/>
			)}
		</>
	);
};

export default Procaptcha;
