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

import { loadI18next, useTranslation } from "@prosopo/locale";
import { buildUpdateState, useProcaptcha } from "@prosopo/procaptcha-common";
import { Checkbox } from "@prosopo/procaptcha-common";
import { Mode, ModeEnum, type ProcaptchaProps } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState } from "react";
import { Manager } from "../services/Manager.js";

// Define the same event name as in the bundle for consistency
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

const Procaptcha = (props: ProcaptchaProps) => {
	const { t } = useTranslation();
	const config = props.config;
	const theme = "light" === config.theme ? lightTheme : darkTheme;
	const frictionlessState = props.frictionlessState; // Set up Session ID and Provider if they exist
	const callbacks = props.callbacks || {};
	const [state, _updateState] = useProcaptcha(useState, useRef);
	// get the state update mechanism
	const updateState = buildUpdateState(state, _updateState);
	const manager = useRef(
		Manager(config, state, updateState, callbacks, frictionlessState),
	);

	useEffect(() => {
		if (config.language) {
			loadI18next(false).then((i18n) => {
				i18n.changeLanguage(config.language).then((r) => r);
			});
		}
	}, [config.language]);

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

	if (config.mode === ModeEnum.invisible) {
		// Return null for invisible mode - no UI needed
		return null;
	}

	return (
		<Checkbox
			checked={state.isHuman}
			onChange={manager.current.start}
			theme={theme}
			labelText={t("WIDGET.I_AM_HUMAN")}
			error={state.error}
			aria-label="human checkbox"
		/>
	);
};
export default Procaptcha;
