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

/** @jsxImportSource @emotion/react */

import { loadI18next, useTranslation } from "@prosopo/locale";
import { Manager } from "@prosopo/procaptcha";
import {
	Checkbox,
	Honeypot,
	TestModeBanner,
	useProcaptcha,
} from "@prosopo/procaptcha-common";
import { ProcaptchaConfigSchema, type ProcaptchaProps } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState } from "react";
import CaptchaComponent from "./CaptchaComponent.js";
import Modal from "./Modal.js";

// Define the same event name as in the bundle
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

const ProcaptchaWidget = (props: ProcaptchaProps) => {
	const { t, ready: isTranslationReady } = useTranslation();
	const config = ProcaptchaConfigSchema.parse(props.config);
	const frictionlessState = props.frictionlessState; // Set up Session ID and Provider if they exist
	const i18n = props.i18n;
	const callbacks = props.callbacks || {};
	const [state, updateState] = useProcaptcha(useState, useRef);
	const [loading, setLoading] = useState(false);
	const hpRef = useRef<HTMLInputElement>(null);
	// Held in a ref so the closure variables that capture the checkbox
	// click coords (set on start) survive across re-renders and are
	// still in scope when submit() runs. PoW and Puzzle widgets do the
	// same — recreating Manager on every render loses the (x,y) by the
	// time the user submits, which is why image captcha was persisting
	// coords[0] = [[0,0]] for every session.
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
	// See procaptcha-pow ProcaptchaWidget — same session-invalidation
	// recovery contract with coords preservation across a re-mint.
	const lastCoordsRef = useRef<{ x: number; y: number } | null>(null);
	const sessionInvalidatedFiredRef = useRef(false);
	const theme = "light" === props.config.theme ? lightTheme : darkTheme;

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
		manager.current.start(coords?.x ?? 0, coords?.y ?? 0).then(
			() => setLoading(false),
			() => setLoading(false),
		);
	}, [props.autoStart, props.startCoords]);

	useEffect(() => {
		if (!state.error) return;
		setLoading(false);
		if (state.error.key !== "CAPTCHA.NO_SESSION_FOUND") return;
		if (props.onSessionInvalidated && !sessionInvalidatedFiredRef.current) {
			sessionInvalidatedFiredRef.current = true;
			const coords = lastCoordsRef.current;
			props.onSessionInvalidated(coords?.x, coords?.y);
			return;
		}
		if (frictionlessState) {
			setTimeout(() => {
				frictionlessState.restart();
			}, 100);
		}
	}, [state.error, frictionlessState, props.onSessionInvalidated]);

	// Add event listener for the execute event
	useEffect(() => {
		// Event handler for when execute() is called
		const handleExecuteEvent = (event: Event) => {
			// Show the modal
			updateState({
				showModal: true,
			});

			// If we need to load a challenge or do other initialization
			if (!state.challenge && manager.current.start) {
				console.log("No challenge set, attempting to start verification");
				try {
					manager.current.start();
				} catch (error) {
					console.error("Error starting verification:", error);
				}
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
	}, [state.challenge, updateState]);

	const honeypot = frictionlessState?.hp ? (
		<Honeypot ref={hpRef} encodedQuestion={frictionlessState.hp} />
	) : null;

	if (config.mode === "invisible") {
		return (
			<>
				{honeypot}
				<Modal show={state.showModal}>
					{state.challenge ? (
						<CaptchaComponent
							challenge={state.challenge}
							index={state.index}
							solutions={state.solutions}
							onSubmit={manager.current.submit}
							onCancel={manager.current.cancel}
							onClick={manager.current.select}
							onNext={manager.current.nextRound}
							onReload={manager.current.reload}
							themeColor={config.theme ?? "light"}
						/>
					) : null}
				</Modal>
			</>
		);
	}

	return (
		<div className={"image-captcha"}>
			{honeypot}
			<Modal show={state.showModal}>
				{state.challenge ? (
					<CaptchaComponent
						challenge={state.challenge}
						index={state.index}
						solutions={state.solutions}
						onSubmit={manager.current.submit}
						onCancel={manager.current.cancel}
						onClick={manager.current.select}
						onNext={manager.current.nextRound}
						onReload={manager.current.reload}
						themeColor={config.theme ?? "light"}
					/>
				) : (
					<div>No challenge set.</div>
				)}
			</Modal>
			<TestModeBanner siteKey={config.account.address ?? ""} />
			<Checkbox
				theme={theme}
				onChange={async (event: React.MouseEvent | React.TouchEvent) => {
					if (!event.isTrusted) {
						return;
					}

					if (loading) {
						return;
					}
					setLoading(true);

					let x = 0;
					let y = 0;
					const nativeEvent = event.nativeEvent;
					if (
						"touches" in nativeEvent &&
						nativeEvent.touches.length > 0 &&
						nativeEvent.touches[0]
					) {
						x = nativeEvent.touches[0].clientX;
						y = nativeEvent.touches[0].clientY;
					} else if ("clientX" in nativeEvent && "clientY" in nativeEvent) {
						x = nativeEvent.clientX;
						y = nativeEvent.clientY;
					}

					lastCoordsRef.current = { x, y };
					await manager.current.start(x, y);
					setLoading(false);
				}}
				checked={state.isHuman}
				labelText={isTranslationReady ? t("WIDGET.I_AM_HUMAN") : ""}
				error={state.error?.message}
				aria-label="human checkbox"
				loading={loading}
			/>
		</div>
	);
};

export default ProcaptchaWidget;
