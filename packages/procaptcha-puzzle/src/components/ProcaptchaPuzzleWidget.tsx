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

import { css } from "@emotion/react";
import { loadI18next, useTranslation } from "@prosopo/locale";
import { buildUpdateState, useProcaptcha } from "@prosopo/procaptcha-common";
import type { ProcaptchaProps } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Manager } from "../services/Manager.js";
import type { VerifyResult } from "./PuzzleVerify.js";
import PuzzleVerify from "./PuzzleVerify.js";

type ModalProps = {
	show: boolean;
	children: React.ReactNode;
};

const ModalInnerDivCSS = css`
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	max-width: 500px;
	background-color: transparent;
	border: none;
	border-radius: 4px;
	z-index: 2147483647;
	align-self: center;
	box-shadow: rgba(0, 0, 0, 0.2) 0px 11px 15px -7px,
		rgba(0, 0, 0, 0.14) 0px 24px 38px 3px,
		rgba(0, 0, 0, 0.12) 0px 9px 46px 8px;
	box-sizing: border-box;
	/* iOS only */
    @supports (-webkit-touch-callout: none) {
		transform: translate(-50%, -100%);
    }
`;

const ModalComponent = ({ show, children }: ModalProps) => {
	const display = show ? "flex" : "none";
	const ModalOuterDivCss = {
		position: "fixed" as const,
		zIndex: 2147483646,
		inset: 0,
		display,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		minHeight: "100vh",
	};

	return createPortal(
		<div className="prosopo-modalOuter" style={ModalOuterDivCss}>
			<div className="prosopo-modalInner" css={ModalInnerDivCSS}>
				{children}
			</div>
		</div>,
		document.body,
	);
};

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
		await manager.current.submitSolution(result.left);
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
					color: theme.palette.background.contrastText,
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
			<ModalComponent show={showPuzzle}>
				<PuzzleVerify
					imgUrl={imgUrl}
					serverDestX={destX}
					visible={true}
					onSuccess={handleSuccess}
					onFail={handleFail}
				/>
			</ModalComponent>
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
				background: theme.palette.background.default,
				color: theme.palette.background.contrastText,
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
