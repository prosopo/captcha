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
import { Checkbox } from "@prosopo/procaptcha-common";
import {
	type GetPuzzleCaptchaResponse,
	ModeEnum,
	type ProcaptchaProps,
	type PuzzleEvent,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useCallback, useEffect, useRef, useState } from "react";
import { Manager } from "../services/Manager.js";
import { PuzzleCanvas } from "./PuzzleCanvas.js";

// Define the same event name as in the bundle for consistency
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

type PuzzlePhase = "checkbox" | "dragging" | "submitting";

const Procaptcha = (props: ProcaptchaProps) => {
	const { t, ready: isTranslationReady } = useTranslation();
	const config = props.config;
	const i18n = props.i18n;
	const theme = "light" === config.theme ? lightTheme : darkTheme;
	const frictionlessState = props.frictionlessState; // Set up Session ID and Provider if they exist
	const callbacks = props.callbacks || {};
	const [state, _updateState] = useProcaptcha(useState, useRef);
	const [loading, setLoading] = useState(false);
	const [puzzlePhase, setPuzzlePhase] = useState<PuzzlePhase>("checkbox");
	const [challengeData, setChallengeData] =
		useState<GetPuzzleCaptchaResponse | null>(null);
	const [showRetry, setShowRetry] = useState(false);
	// get the state update mechanism
	const updateState = buildUpdateState(state, _updateState);
	const manager = useRef(
		Manager(config, state, updateState, callbacks, frictionlessState),
	);

	useEffect(() => {
		if (config.language) {
			if (i18n) {
				if (i18n.language !== config.language) {
					i18n.changeLanguage(config.language).then((r) => r);
				}
			} else {
				loadI18next(false).then((i18n) => {
					if (i18n.language !== config.language)
						i18n.changeLanguage(config.language).then((r) => r);
				});
			}
		}
	}, [i18n, config.language]);

	useEffect(() => {
		if (!state.error) return undefined;
		setLoading(false);
		setPuzzlePhase("checkbox");
		setChallengeData(null);
		setShowRetry(false);
		if (state.error.key === "CAPTCHA.NO_SESSION_FOUND" && frictionlessState) {
			const timer = setTimeout(() => {
				frictionlessState.restart();
			}, 100);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [state.error, frictionlessState]);

	// Add event listener for the execute event (works for invisible mode)
	useEffect(() => {
		// Only set up event listener if in invisible mode
		if (config.mode === ModeEnum.invisible) {
			// Event handler for when execute() is called
			const handleExecuteEvent = () => {
				// Directly start the verification process without showing any UI
				try {
					manager.current.start();
				} catch (error) {
					callbacks.onError?.(
						error instanceof Error ? error : new Error(String(error)),
					);
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
	}, [config.mode, callbacks.onError]);

	const handlePuzzleComplete = useCallback(
		async (finalX: number, finalY: number, puzzleEvents: PuzzleEvent[]) => {
			setPuzzlePhase("submitting");
			let verified = false;
			try {
				verified = await manager.current.submitSolution(
					finalX,
					finalY,
					puzzleEvents,
				);
			} catch (error) {
				callbacks.onError?.(
					error instanceof Error ? error : new Error(String(error)),
				);
			}

			if (verified) {
				setPuzzlePhase("checkbox");
				setChallengeData(null);
				setShowRetry(false);
				setLoading(false);
				return;
			}

			// Failed — show retry message and fetch a new challenge
			setShowRetry(true);
			setPuzzlePhase("dragging");

			try {
				const newChallenge = await manager.current.start();
				if (newChallenge) {
					setChallengeData(newChallenge);
				} else {
					// Couldn't get new challenge, fall back to checkbox
					setPuzzlePhase("checkbox");
					setChallengeData(null);
					setShowRetry(false);
				}
			} catch {
				setPuzzlePhase("checkbox");
				setChallengeData(null);
				setShowRetry(false);
			}
			setLoading(false);
		},
		[callbacks.onError],
	);

	if (config.mode === ModeEnum.invisible) {
		// Return null for invisible mode - no UI needed
		return null;
	}

	return (
		<>
			{/* Puzzle overlay — rendered outside the shadow DOM flow via fixed positioning */}
			{(puzzlePhase === "dragging" || puzzlePhase === "submitting") &&
				challengeData && (
					<PuzzleCanvas
						originX={challengeData.originX}
						originY={challengeData.originY}
						targetX={challengeData.targetX}
						targetY={challengeData.targetY}
						onComplete={handlePuzzleComplete}
						showRetry={showRetry}
						submitting={puzzlePhase === "submitting"}
					/>
				)}

			{/* Checkbox — always rendered so transitions are smooth */}
			<Checkbox
				checked={state.isHuman}
				theme={theme}
				onChange={async (_event: React.MouseEvent | React.TouchEvent) => {
					if (loading) {
						return;
					}
					setLoading(true);
					setShowRetry(false);

					const challenge = await manager.current.start();

					if (challenge) {
						setChallengeData(challenge);
						setPuzzlePhase("dragging");
					}

					setLoading(false);
				}}
				labelText={isTranslationReady ? t("WIDGET.I_AM_HUMAN") : ""}
				error={state.error?.message}
				aria-label="human checkbox"
				loading={loading || puzzlePhase === "submitting"}
			/>
		</>
	);
};

export default Procaptcha;
