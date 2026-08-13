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

import type { Theme } from "@prosopo/widget-skeleton";
import type { FC } from "react";

interface RetryBannerProps {
	/** Message to show. Callers pass the translated string. */
	message: string;
	theme: Theme;
	/**
	 * Test-only hook. Gated by the caller on `NODE_ENV !== "production"` where
	 * the surrounding widget hides its selectors from scripted solvers.
	 */
	dataCy?: string;
}

const BANNER_KEYFRAMES = `
@keyframes prosopo-retry-banner-in {
	from { opacity: 0; transform: translateY(-4px); }
	to { opacity: 1; transform: translateY(0); }
}
`;

/**
 * The shared "you got it wrong, here's another one" prompt for the image and
 * puzzle captchas. Both fetch a fresh challenge automatically on a failed
 * attempt, so this states the outcome rather than offering a button: there is
 * nothing for the user to click, the next challenge is already on screen.
 *
 * Uses the M3 error-container role rather than the bolder `error.main`, so a
 * wrong answer reads as a recoverable step in the flow and not as a breakage.
 */
export const RetryBanner: FC<RetryBannerProps> = ({
	message,
	theme,
	dataCy,
}: RetryBannerProps) => {
	return (
		// biome-ignore lint/a11y/useSemanticElements: the "alert" role has no native HTML element equivalent
		<div
			role="alert"
			// Announce the change without stealing focus from the challenge.
			aria-live="polite"
			{...(dataCy ? { "data-cy": dataCy } : {})}
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "8px",
				width: "100%",
				boxSizing: "border-box",
				padding: "10px 14px",
				backgroundColor: theme.palette.error.container,
				color: theme.palette.error.onContainer,
				borderRadius: theme.shape.header,
				fontFamily: theme.font.fontFamily,
				...theme.typography.bodyMedium,
				fontWeight: 500,
				textAlign: "center",
				animation: "prosopo-retry-banner-in 0.25s ease",
			}}
		>
			<style>{BANNER_KEYFRAMES}</style>
			{/* Decorative — the message alone carries the meaning, so the icon is
			    hidden from assistive tech rather than read out as "warning". */}
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
				focusable="false"
				style={{ flexShrink: 0 }}
			>
				<circle
					cx="12"
					cy="12"
					r="9"
					stroke="currentColor"
					strokeWidth="2"
					fill="none"
				/>
				<path
					d="M12 7.5v5"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				/>
				<circle cx="12" cy="16.25" r="1.25" fill="currentColor" />
			</svg>
			<span>{message}</span>
		</div>
	);
};

export default RetryBanner;
