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

import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { type ButtonHTMLAttributes, type FC, useMemo, useState } from "react";

interface AudioAlternativeButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement> {
	themeColor: "light" | "dark";
	onRequestAudio: () => void;
	label: string;
}

/**
 * "Use audio instead" — the control that makes the visual challenges
 * escapable.
 *
 * Rendered by the image and puzzle widgets when the site has
 * `audioAccessibilityEnabled`. Shared rather than duplicated per widget so
 * the two paths cannot drift into offering differently-worded or
 * differently-reachable escapes.
 *
 * A text button, not an icon button like `ReloadButton`. An icon has to be
 * learned, and the people most likely to need this control are the least
 * likely to be able to inspect an unlabelled glyph to find out what it
 * does. The visible text is also the accessible name, so a screen reader
 * and a sighted user are told the same thing.
 */
export const AudioAlternativeButton: FC<AudioAlternativeButtonProps> = ({
	themeColor,
	onRequestAudio,
	label,
	...rest
}: AudioAlternativeButtonProps) => {
	const theme = useMemo(
		() => (themeColor === "light" ? lightTheme : darkTheme),
		[themeColor],
	);
	const [hover, setHover] = useState(false);
	// M3 requires a visible focus indicator; matched imperatively so the
	// ring is keyboard-only. Keyboard users are a core audience for this
	// control, so losing the ring would be a real regression rather than a
	// cosmetic one.
	const [focusVisible, setFocusVisible] = useState(false);

	const style = useMemo(
		() => ({
			border: "none",
			background: "none",
			padding: "6px 10px",
			borderRadius: "8px",
			cursor: "pointer",
			fontFamily: theme.font.fontFamily,
			fontSize: "13px",
			textDecoration: "underline",
			color: theme.palette.primary.main,
			backgroundColor: hover
				? theme.palette.primaryContainer.hover
				: "transparent",
			transition: "background-color 0.25s",
			...(focusVisible
				? {
						outline: `3px solid ${theme.palette.primary.main}`,
						outlineOffset: "2px",
					}
				: {}),
		}),
		[hover, theme, focusVisible],
	);

	return (
		<button
			type="button"
			className="audio-alternative-button"
			data-cy="prosopo-audio-alternative"
			style={style}
			onClick={onRequestAudio}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			onFocus={(event) => {
				setFocusVisible(event.target.matches(":focus-visible"));
			}}
			onBlur={() => setFocusVisible(false)}
			{...rest}
		>
			{label}
		</button>
	);
};
