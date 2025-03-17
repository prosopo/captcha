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
import type { ProcaptchaProps } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState } from "react";
import { Manager } from "../services/Manager.js";

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
