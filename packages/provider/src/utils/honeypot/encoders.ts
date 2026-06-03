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

import { EncodingType } from "@prosopo/types";

const MORSE_MAP: Record<string, string> = {
	a: ".-",
	b: "-...",
	c: "-.-.",
	d: "-..",
	e: ".",
	f: "..-.",
	g: "--.",
	h: "....",
	i: "..",
	j: ".---",
	k: "-.-",
	l: ".-..",
	m: "--",
	n: "-.",
	o: "---",
	p: ".--.",
	q: "--.-",
	r: ".-.",
	s: "...",
	t: "-",
	u: "..-",
	v: "...-",
	w: ".--",
	x: "-..-",
	y: "-.--",
	z: "--..",
	"0": "-----",
	"1": ".----",
	"2": "..---",
	"3": "...--",
	"4": "....-",
	"5": ".....",
	"6": "-....",
	"7": "--...",
	"8": "---..",
	"9": "----.",
};

// Semaphore: each letter is a pair of arrows approximating the two flag
// positions of the corresponding semaphore character, viewed from the
// observer's perspective (left arrow = observer-left arm, right arrow =
// observer-right arm). Mapping is bijective so a decoder can recover the
// letter; positions roughly track the standard A–G "right arm sweeps,
// left arm down" / H–N "both arms" structure of flag semaphore.
const SEMAPHORE_MAP: Record<string, string> = {
	a: "↙↓",
	b: "←↓",
	c: "↖↓",
	d: "↑↓",
	e: "↓↘",
	f: "↓→",
	g: "↓↗",
	h: "↙←",
	i: "↙↖",
	j: "↓↑",
	k: "↑←",
	l: "↗←",
	m: "←↖",
	n: "←↑",
	o: "↖↑",
	p: "↑↗",
	q: "↗→",
	r: "→↘",
	s: "↘↓",
	t: "↓↙",
	u: "↘↗",
	v: "→↑",
	w: "↘↑",
	x: "↙↗",
	y: "→↗",
	z: "↘→",
};

const encodeMorse = (text: string): string => {
	const words = text.toLowerCase().split(/\s+/).filter(Boolean);
	return words
		.map((word) =>
			[...word]
				.map((ch) => MORSE_MAP[ch])
				.filter((code): code is string => Boolean(code))
				.join(" "),
		)
		.filter(Boolean)
		.join(" / ");
};

const encodeSemaphore = (text: string): string => {
	const words = text.toLowerCase().split(/\s+/).filter(Boolean);
	return words
		.map((word) =>
			[...word]
				.map((ch) => SEMAPHORE_MAP[ch])
				.filter((code): code is string => Boolean(code))
				.join(" "),
		)
		.filter(Boolean)
		.join(" / ");
};

export const encodeHoneypotQuestion = (
	text: string,
	encoding: EncodingType,
): string => {
	const encoded =
		encoding === EncodingType.morse ? encodeMorse(text) : encodeSemaphore(text);
	// Wrap in base64 so the wire/DOM value looks like any other opaque token
	// rather than recognisable morse / semaphore. The widget renders the
	// base64 string into the hidden input verbatim — bots that auto-fill see
	// an opaque blob, not a morse code they can pattern-match against and skip.
	return Buffer.from(encoded, "utf-8").toString("base64");
};
