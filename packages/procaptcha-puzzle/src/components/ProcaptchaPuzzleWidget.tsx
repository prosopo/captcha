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
import type { ProcaptchaProps } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState } from "react";
import { Manager } from "../services/Manager.js";
import type { VerifyResult } from "./PuzzleVerify.js";
import PuzzleVerify from "./PuzzleVerify.js";

const ProcaptchaPuzzleWidget = (props: ProcaptchaProps) => {
	const { ready: isTranslationReady } = useTranslation();
	const config = props.config;
	const i18n = props.i18n;
	const theme = "light" === config.theme ? lightTheme : darkTheme;
	const frictionlessState = props.frictionlessState;
	const callbacks = props.callbacks || {};

	const [state, _updateState] = useProcaptcha(useState, useRef);
	const updateState = buildUpdateState(state, _updateState);

	// Puzzle challenge data delivered by the manager
	const [imgUrl, setImgUrl] = useState<string | undefined>(undefined);
	const [destX, setDestX] = useState<number | undefined>(undefined);
	const [blockY, setBlockY] = useState<number | undefined>(undefined);
	const [showPuzzle, setShowPuzzle] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | undefined>(
		undefined,
	);

	const manager = useRef(
		Manager(
			config,
			state,
			updateState,
			callbacks,
			frictionlessState,
			(url, dx, by) => {
				setImgUrl(url);
				setDestX(dx);
				setBlockY(by);
				setShowPuzzle(true);
			},
		),
	);

	useEffect(() => {
		if (config.language) {
			const apply = (i: {
				language: string;
				changeLanguage: (l: string) => Promise<void>;
			}) => {
				if (i.language !== config.language) {
					i.changeLanguage(config.language as string).then((r) => r);
				}
			};
			if (i18n) {
				apply(i18n);
			} else {
				loadI18next(false).then((loaded) => apply(loaded));
			}
		}
	}, [i18n, config.language]);

	useEffect(() => {
		if (state.error) {
			setErrorMessage(state.error.message);
			setShowPuzzle(false);
			if (state.error.key === "CAPTCHA.NO_SESSION_FOUND" && frictionlessState) {
				setTimeout(() => frictionlessState.restart(), 100);
			}
		}
	}, [state.error, frictionlessState]);

	const handleClick = async () => {
		if (state.isHuman || state.loading) return;
		setErrorMessage(undefined);
		await manager.current.start();
	};

	const handleSuccess = async (result: VerifyResult) => {
		setShowPuzzle(false);
		await manager.current.submitSolution(result.left, result.trailY);
	};

	const handleFail = () => {
		setShowPuzzle(false);
	};

	if (state.isHuman) {
		return (
			<div
				style={{
					border: `1px solid ${theme.palette.primary.main}`,
					borderRadius: 4,
					padding: "8px 16px",
					display: "inline-flex",
					alignItems: "center",
					gap: 8,
					background: theme.palette.background.default,
					color: theme.palette.text.primary,
					cursor: "default",
				}}
			>
				<span>✓</span>
				<span>
					{isTranslationReady ? i18n?.t("WIDGET.I_AM_HUMAN") : "Verified"}
				</span>
			</div>
		);
	}

	if (
		showPuzzle &&
		imgUrl !== undefined &&
		destX !== undefined &&
		blockY !== undefined
	) {
		return (
			<PuzzleVerify
				imgUrl={imgUrl}
				serverDestX={destX}
				visible={true}
				onSuccess={handleSuccess}
				onFail={handleFail}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={state.loading}
			style={{
				border: `1px solid ${theme.palette.primary.main}`,
				borderRadius: 4,
				padding: "8px 16px",
				background: state.loading
					? (theme.palette.action?.disabledBackground ?? "#ccc")
					: theme.palette.background.default,
				color: theme.palette.text.primary,
				cursor: state.loading ? "wait" : "pointer",
				minWidth: 200,
			}}
		>
			{state.loading
				? "Loading…"
				: errorMessage
					? errorMessage
					: isTranslationReady
						? (i18n?.t("WIDGET.I_AM_HUMAN") ?? "I am human")
						: "I am human"}
		</button>
	);
};

export default ProcaptchaPuzzleWidget;
