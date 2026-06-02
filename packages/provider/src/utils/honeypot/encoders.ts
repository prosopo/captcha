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

// Semaphore: Unicode "Flags" approximations from the Miscellaneous Symbols
// and Pictographs block. Picked for distinctness (each letter renders as
// something visually different) rather than for true semaphore-flag glyph
// accuracy — the goal is "string of opaque symbols", not signaller training.
const SEMAPHORE_MAP: Record<string, string> = {
	a: "🚩",
	b: "🏁",
	c: "🏴",
	d: "🏳",
	e: "⛳",
	f: "🎌",
	g: "🚩",
	h: "🏁",
	i: "🏴",
	j: "🏳",
	k: "⛳",
	l: "🎌",
	m: "🚩",
	n: "🏁",
	o: "🏴",
	p: "🏳",
	q: "⛳",
	r: "🎌",
	s: "🚩",
	t: "🏁",
	u: "🏴",
	v: "🏳",
	w: "⛳",
	x: "🎌",
	y: "🚩",
	z: "🏁",
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
	return [...text.toLowerCase()]
		.map((ch) => (ch === " " ? " " : SEMAPHORE_MAP[ch]))
		.filter((glyph): glyph is string => Boolean(glyph))
		.join("");
};

export const encodeHoneypotQuestion = (
	text: string,
	encoding: EncodingType,
): string => {
	switch (encoding) {
		case EncodingType.morse:
			return encodeMorse(text);
		case EncodingType.semaphore:
			return encodeSemaphore(text);
	}
};
