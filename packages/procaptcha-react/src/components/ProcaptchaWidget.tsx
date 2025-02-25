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

/** @jsxImportSource @emotion/react */

import { loadI18next, useTranslation } from "@prosopo/locale";
import { Manager } from "@prosopo/procaptcha";
import { useProcaptcha } from "@prosopo/procaptcha-common";
import { ProcaptchaConfigSchema, type ProcaptchaProps } from "@prosopo/types";
import { Checkbox, darkTheme, lightTheme } from "@prosopo/widget";
import { useEffect, useRef, useState } from "react";
import CaptchaComponent from "./CaptchaComponent.js";
import Modal from "./Modal.js";

const ProcaptchaWidget = (props: ProcaptchaProps) => {
	const { t } = useTranslation();
	const config = ProcaptchaConfigSchema.parse(props.config);
	const frictionlessState = props.frictionlessState; // Set up Session ID and Provider if they exist
	const callbacks = props.callbacks || {};
	const [state, updateState] = useProcaptcha(useState, useRef);
	const manager = Manager(
		config,
		state,
		updateState,
		callbacks,
		frictionlessState,
	);
	const theme = "light" === props.config.theme ? lightTheme : darkTheme;

	useEffect(() => {
		if (config.language) {
			loadI18next(false).then((i18n) => {
				i18n.changeLanguage(config.language).then((r) => r);
			});
		}
	}, [config.language]);

	return (
		<div className={"image-captcha"}>
			<Modal show={state.showModal}>
				{state.challenge ? (
					<CaptchaComponent
						challenge={state.challenge}
						index={state.index}
						solutions={state.solutions}
						onSubmit={manager.submit}
						onCancel={manager.cancel}
						onClick={manager.select}
						onNext={manager.nextRound}
						onReload={manager.reload}
						themeColor={config.theme ?? "light"}
					/>
				) : (
					<div>No challenge set.</div>
				)}
			</Modal>
			<Checkbox
				theme={theme}
				onChange={manager.start}
				checked={state.isHuman}
				labelText={t("WIDGET.I_AM_HUMAN")}
				error={state.error}
				aria-label="human checkbox"
			/>
		</div>
	);
};

export default ProcaptchaWidget;
