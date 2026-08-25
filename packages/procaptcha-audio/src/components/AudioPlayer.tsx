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

import type { Ti18n } from "@prosopo/locale";
import type { AudioEvent } from "@prosopo/types";
import type { Theme } from "@prosopo/widget-skeleton";
import { useCallback, useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
	/** RIFF/WAVE clip as a data URI. */
	clip: string;
	/** How many characters the user must type. */
	characterCount: number;
	onComplete: (
		answer: string,
		replays: number,
		audioEvents: AudioEvent[],
	) => void;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
	t: Ti18n["t"];
}

const CONTAINER_WIDTH = 320;

const SHAKE_KEYFRAMES = `
@keyframes prosopo-audio-shake {
	0%, 100% { transform: translateX(0); }
	10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
	20%, 40%, 60%, 80% { transform: translateX(4px); }
}
`;

/**
 * The audio challenge UI.
 *
 * Accessibility is the point of this widget, not a finishing touch, so a
 * few things here are load-bearing rather than cosmetic:
 *
 * - Everything is a real `<button>` and a real `<input>`. No div-with-a-
 *   click-handler, no custom focus management. A screen reader and a
 *   keyboard get the native semantics for free, and they are better than
 *   anything reimplemented here.
 * - The `<audio>` element is present but visually hidden with its own
 *   controls suppressed, and driven by our buttons. Native controls vary
 *   wildly between browsers and several of them expose a download link,
 *   which would hand an attacker the clip as a file.
 * - Status changes are announced through an `aria-live` region. Without
 *   it a screen-reader user gets no feedback that a wrong answer was
 *   rejected and a new clip is playing — the visual shake is invisible
 *   to them.
 * - Autoplay is never attempted. Browsers block audio without a user
 *   gesture, and a blocked play() looks identical to a broken widget.
 *   The user presses play.
 */
export const AudioPlayer = ({
	clip,
	characterCount,
	onComplete,
	showRetry,
	submitting,
	theme,
	t,
}: AudioPlayerProps) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [answer, setAnswer] = useState("");
	const [playing, setPlaying] = useState(false);
	const [visible, setVisible] = useState(false);
	const [shaking, setShaking] = useState(false);
	const [announcement, setAnnouncement] = useState("");

	// Telemetry. `replays` counts plays after the first, so 0 means "heard
	// it once and typed the answer" — which is the value a solver that
	// never renders audio will always report.
	const replays = useRef(0);
	const events = useRef<AudioEvent[]>([]);
	const startedAt = useRef<number>(Date.now());

	const record = useCallback((kind: AudioEvent["kind"]) => {
		events.current.push({ kind, t: Date.now() - startedAt.current });
	}, []);

	// Reset per challenge. The clip URI is the identity of the challenge,
	// so a new clip means a new attempt and the counters must start over —
	// otherwise a retry inherits the previous attempt's replay count and the
	// provider sees telemetry from a challenge the user has already failed.
	//
	// The effect also stops the outgoing clip. Swapping `src` resets the
	// element, but not before the browser has had a chance to keep playing
	// the old audio for a frame or two — which, on a retry, means the user
	// hears the end of the challenge they just got wrong while being shown
	// the new one.
	useEffect(() => {
		const audio = audioRef.current;
		if (audio && audio.src !== clip) {
			audio.pause();
			audio.currentTime = 0;
		}
		setAnswer("");
		setPlaying(false);
		replays.current = 0;
		events.current = [];
		startedAt.current = Date.now();
	}, [clip]);

	useEffect(() => {
		const frame = requestAnimationFrame(() => setVisible(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	// Move focus to the input when a challenge appears, so a keyboard user
	// lands where the work is instead of at the top of the page.
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		if (!showRetry) return undefined;
		setShaking(true);
		setAnnouncement(t("WIDGET.AUDIO_INCORRECT"));
		const timer = setTimeout(() => setShaking(false), 500);
		return () => clearTimeout(timer);
	}, [showRetry, t]);

	const play = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const isReplay = replays.current > 0 || audio.currentTime > 0;
		audio.currentTime = 0;
		record(isReplay ? "replay" : "play");
		if (isReplay) replays.current += 1;
		void audio.play().then(
			() => {
				setPlaying(true);
				setAnnouncement(t("WIDGET.AUDIO_PLAYING"));
			},
			() => {
				// play() rejects when the browser blocks playback or the
				// device has no audio output. Say so — a silent failure
				// here is indistinguishable from a broken challenge, and
				// this is the one widget where the user cannot fall back
				// to looking at it.
				setPlaying(false);
				setAnnouncement(t("WIDGET.AUDIO_PLAYBACK_FAILED"));
			},
		);
	}, [record, t]);

	const submit = useCallback(() => {
		if (submitting || answer.length === 0) return;
		onComplete(answer, replays.current, events.current);
	}, [answer, onComplete, submitting]);

	const surface = theme.palette.surface;
	const onSurface = theme.palette.onSurface;
	const accent = showRetry
		? theme.palette.error.main
		: theme.palette.primary.main;

	const buttonStyle = {
		fontFamily: theme.font.fontFamily,
		fontSize: "14px",
		padding: "10px 16px",
		borderRadius: "8px",
		border: `1px solid ${accent}`,
		backgroundColor: "transparent",
		color: accent,
		cursor: "pointer",
	} as const;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 2147483646,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: visible ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0)",
				transition: "background-color 0.3s ease",
			}}
		>
			<style>{SHAKE_KEYFRAMES}</style>

			{/* Labelled as a dialog so assistive tech announces it as a
			    distinct region rather than as loose text appended to the page. */}
			<section
				aria-label={t("WIDGET.AUDIO_CHALLENGE_LABEL")}
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "14px",
					width: `${CONTAINER_WIDTH}px`,
					boxSizing: "border-box",
					padding: "20px",
					borderRadius: "20px",
					backgroundColor: surface,
					color: onSurface,
					fontFamily: theme.font.fontFamily,
					zIndex: 2147483647,
					opacity: visible ? 1 : 0,
					transform: visible ? "scale(1)" : "scale(0.9)",
					transition: "opacity 0.3s ease, transform 0.3s ease",
					animation: shaking ? "prosopo-audio-shake 0.5s ease" : "none",
				}}
			>
				<p
					style={{
						margin: 0,
						fontSize: "14px",
						color: showRetry ? theme.palette.error.main : onSurface,
					}}
				>
					{showRetry
						? t("WIDGET.AUDIO_INCORRECT")
						: t("WIDGET.AUDIO_INSTRUCTIONS", { count: characterCount })}
				</p>

				{/*
				  `controls` is deliberately absent. Native controls differ
				  per browser and several expose a download affordance,
				  which would hand the clip over as a file. `preload="auto"`
				  because the clip is already a data URI — there is nothing
				  to fetch, and it means play() responds immediately.
				*/}
				{/* biome-ignore lint/a11y/useMediaCaption: a caption would be
				    the transcript, which is the answer. */}
				<audio
					ref={audioRef}
					src={clip}
					preload="auto"
					data-cy="prosopo-audio-clip"
					style={{ display: "none" }}
					onEnded={() => {
						setPlaying(false);
						setAnnouncement(t("WIDGET.AUDIO_FINISHED"));
					}}
					onPause={() => setPlaying(false)}
				/>

				<div style={{ display: "flex", gap: "8px" }}>
					<button
						type="button"
						onClick={play}
						data-cy="prosopo-audio-play"
						style={{ ...buttonStyle, flex: 1 }}
					>
						{playing
							? t("WIDGET.AUDIO_PLAYING")
							: replays.current > 0 || answer.length > 0
								? t("WIDGET.AUDIO_REPLAY")
								: t("WIDGET.AUDIO_PLAY")}
					</button>
				</div>

				{/*
				  `inputMode="numeric"` brings up a number pad on mobile
				  without the validation baggage of `type="number"` (which
				  also strips leading zeros — fatal when the answer can
				  start with one). `autoComplete="off"` keeps password
				  managers and previous answers out of the field.
				*/}
				<input
					ref={inputRef}
					type="text"
					inputMode="numeric"
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					maxLength={characterCount * 2}
					value={answer}
					data-cy="prosopo-audio-answer"
					aria-label={t("WIDGET.AUDIO_INPUT_LABEL", {
						count: characterCount,
					})}
					onChange={(event) => {
						record("key");
						setAnswer(event.target.value);
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							submit();
						}
					}}
					disabled={submitting}
					style={{
						fontFamily: theme.font.fontFamily,
						fontSize: "18px",
						letterSpacing: "0.3em",
						textAlign: "center",
						padding: "10px",
						borderRadius: "8px",
						border: `1px solid ${accent}`,
						backgroundColor: "transparent",
						color: onSurface,
					}}
				/>

				<button
					type="button"
					onClick={submit}
					disabled={submitting || answer.length === 0}
					data-cy="prosopo-audio-submit"
					style={{
						...buttonStyle,
						// Always the primary fill, even on retry. The error
						// palette carries no `contrastText`, and more to the
						// point a red "Verify" button reads as a destructive
						// action rather than "your last answer was wrong" —
						// the message, the shake and the input border already
						// say that.
						backgroundColor: theme.palette.primary.main,
						borderColor: theme.palette.primary.main,
						color: theme.palette.primary.contrastText,
						opacity: submitting || answer.length === 0 ? 0.5 : 1,
						cursor:
							submitting || answer.length === 0 ? "not-allowed" : "pointer",
					}}
				>
					{submitting ? t("WIDGET.AUDIO_CHECKING") : t("WIDGET.AUDIO_SUBMIT")}
				</button>

				{/*
				  Status announcements. `polite` rather than `assertive` so
				  it does not interrupt the user mid-sentence while typing;
				  the messages are feedback, not emergencies.
				*/}
				<div
					aria-live="polite"
					aria-atomic="true"
					style={{
						position: "absolute",
						width: "1px",
						height: "1px",
						overflow: "hidden",
						clip: "rect(0 0 0 0)",
						clipPath: "inset(50%)",
						whiteSpace: "nowrap",
					}}
				>
					{announcement}
				</div>
			</section>
		</div>
	);
};
