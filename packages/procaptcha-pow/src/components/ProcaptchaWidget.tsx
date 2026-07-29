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
import { Checkbox, Honeypot } from "@prosopo/procaptcha-common";
import { ModeEnum, type ProcaptchaProps } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState } from "react";
import { Manager } from "../services/Manager.js";

// Define the same event name as in the bundle for consistency
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

const Procaptcha = (props: ProcaptchaProps) => {
	const { t, ready: isTranslationReady } = useTranslation();
	const config = props.config;
	const i18n = props.i18n;
	const theme = "light" === config.theme ? lightTheme : darkTheme;
	const frictionlessState = props.frictionlessState; // Set up Session ID and Provider if they exist
	const callbacks = props.callbacks || {};
	const [state, _updateState] = useProcaptcha(useState, useRef);
	const [loading, setLoading] = useState(false);
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
			props.onEscalate,
			() => hpRef.current?.value || undefined,
		),
	);
	// Coordinates of the last `manager.start(x, y)` invocation from this widget
	// instance — either the checkbox click, or a `startCoords` handoff from a
	// prior `onSessionInvalidated` cycle. Held in a ref so the current values
	// survive re-renders and are readable from the `state.error` effect.
	const lastCoordsRef = useRef<{ x: number; y: number } | null>(null);
	// One-shot guard: a widget instance only escalates a single NO_SESSION_FOUND
	// to `onSessionInvalidated`. If the retry also fails, we fall through to
	// the pre-existing `frictionlessState.restart()` path instead of looping.
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
		const coords = props.startCoords;
		lastCoordsRef.current = coords ?? null;
		manager.current.start(coords?.x ?? 0, coords?.y ?? 0).finally(() => {
			setLoading(false);
		});
	}, [props.autoStart, props.startCoords]);

	useEffect(() => {
		if (!state.error) return;
		setLoading(false);
		if (state.error.key !== "CAPTCHA.NO_SESSION_FOUND") return;
		if (props.onSessionInvalidated && !sessionInvalidatedFiredRef.current) {
			// Preserve the checkbox coords across the retry so the resumed
			// submit still carries the real entry-point telemetry. The
			// frictionless wrapper mints a fresh session and re-mounts this
			// widget with matching `autoStart` + `startCoords`.
			sessionInvalidatedFiredRef.current = true;
			const coords = lastCoordsRef.current;
			props.onSessionInvalidated(coords?.x, coords?.y);
			return;
		}
		if (frictionlessState) {
			// Fallback for widgets not mounted under a recovery-aware parent,
			// or a second NO_SESSION_FOUND after we've already retried once.
			setTimeout(() => {
				frictionlessState.restart();
			}, 100);
		}
	}, [state.error, frictionlessState, props.onSessionInvalidated]);

	// Add event listener for the execute event (works for invisible mode)
	useEffect(() => {
		// Only set up event listener if in invisible mode
		if (config.mode === ModeEnum.invisible) {
			// Event handler for when execute() is called
			const handleExecuteEvent = (event: Event) => {
				// Directly start the verification process without showing any UI
				try {
					// Start the PoW verification process
					manager.current.start();
				} catch (error) {
					console.error("Error starting PoW verification:", error);
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
	}, [config.mode]);

	const honeypot = frictionlessState?.hp ? (
		<Honeypot ref={hpRef} encodedQuestion={frictionlessState.hp} />
	) : null;

	if (config.mode === ModeEnum.invisible) {
		// Invisible mode renders no checkbox, but we still render the honeypot
		// so bots that scan the DOM for inputs find a tempting target.
		return honeypot;
	}

	return (
		<>
			{honeypot}
			<Checkbox
				checked={state.isHuman}
				theme={theme}
				onChange={async (event: React.MouseEvent | React.TouchEvent) => {
					if (loading) {
						return;
					}
					setLoading(true);

					// Capture click coordinates
					let x = 0;
					let y = 0;

					// Try to get coordinates from the change event's underlying mouse event
					// The original mouse event might be available in the event chain
					const mouseOrTouchEvent = event.nativeEvent;
					if (!mouseOrTouchEvent.isTrusted) {
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
					await manager.current.start(x, y);
					setLoading(false);
				}}
				labelText={isTranslationReady ? t("WIDGET.I_AM_HUMAN") : ""}
				error={state.error?.message}
				aria-label="human checkbox"
				loading={loading}
			/>
		</>
	);
};

export default Procaptcha;
