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

/**
 * Intelligibility needs ears, not a unit test. Writes challenges, per-digit
 * references and an HTML page with the answers behind a reveal button.
 * `--clean` turns off noise, babble and reverb to judge the synthesiser alone.
 *
 *   npm -w @prosopo/audio-assets run preview -- --count 12 --out ./preview
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
	type AudioRenderSettings,
	DEFAULT_RENDER_SETTINGS,
	DIGITS,
	SAMPLE_RATE,
	createPrng,
	createSeed,
	encodeWav,
	randomVoice,
	renderAudioChallenge,
	synthesiseUtterance,
} from "../src/index.js";

interface Args {
	count: number;
	out: string;
	clean: boolean;
}

const parseArgs = (argv: readonly string[]): Args => {
	const args: Args = { count: 12, out: "./preview", clean: false };
	for (let i = 0; i < argv.length; i++) {
		const flag = argv[i];
		if (flag === "--count") {
			const value = argv[++i];
			if (value) args.count = Number.parseInt(value, 10);
		} else if (flag === "--out") {
			const value = argv[++i];
			if (value) args.out = value;
		} else if (flag === "--clean") {
			args.clean = true;
		}
	}
	return args;
};

const main = async (): Promise<void> => {
	const args = parseArgs(process.argv.slice(2));
	const outDir = resolve(args.out);
	mkdirSync(outDir, { recursive: true });

	const settings: AudioRenderSettings = args.clean
		? {
				...DEFAULT_RENDER_SETTINGS,
				noiseSnrDb: 60,
				babbleGain: 0,
				babbleVoices: 0,
				reverbMix: 0,
			}
		: DEFAULT_RENDER_SETTINGS;

	const prng = createPrng(createSeed());
	const referenceVoice = randomVoice(prng);
	const references: string[] = [];
	for (const digit of DIGITS) {
		const buffer = synthesiseUtterance(
			digit,
			referenceVoice,
			prng,
			SAMPLE_RATE,
		);
		const name = `digit-${digit.answer}.wav`;
		writeFileSync(join(outDir, name), encodeWav(buffer));
		references.push(
			`<figure><figcaption>${digit.answer}</figcaption><audio controls src="${name}"></audio></figure>`,
		);
	}

	const challenges: string[] = [];
	for (let i = 0; i < args.count; i++) {
		const challenge = renderAudioChallenge(settings);
		const name = `challenge-${String(i).padStart(2, "0")}.wav`;
		writeFileSync(join(outDir, name), challenge.wav);
		challenges.push(
			`<figure>
				<audio controls src="${name}"></audio>
				<figcaption>
					<button type="button" data-answer="${challenge.answer}">reveal</button>
					<span>${(challenge.wav.length / 1024).toFixed(0)} KB · ${(challenge.durationMs / 1000).toFixed(1)}s</span>
				</figcaption>
			</figure>`,
		);
	}

	const html = `<!doctype html>
<meta charset="utf-8">
<title>audio-assets preview${args.clean ? " (clean)" : ""}</title>
<style>
	body { font: 15px/1.5 system-ui, sans-serif; margin: 2rem; max-width: 60rem; }
	h2 { margin-top: 2rem; }
	.grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); }
	figure { margin: 0; padding: .75rem; border: 1px solid #ccc; border-radius: .5rem; }
	figcaption { display: flex; gap: .75rem; align-items: center; margin-top: .5rem; font-size: .85em; color: #666; }
	audio { width: 100%; }
	button { font: inherit; cursor: pointer; }
</style>
<h1>audio-assets preview${args.clean ? " — clean (no noise, babble or reverb)" : ""}</h1>
<p>Settings: ${JSON.stringify(settings)}</p>
<h2>Challenges</h2>
<p>Listen before revealing — that is the only honest way to judge whether these are solvable.</p>
<div class="grid">${challenges.join("\n")}</div>
<h2>Digit references (clean, one voice)</h2>
<div class="grid">${references.join("\n")}</div>
<script>
	for (const button of document.querySelectorAll("button[data-answer]")) {
		button.addEventListener("click", () => {
			button.textContent = button.dataset.answer;
			button.disabled = true;
		});
	}
</script>`;

	writeFileSync(join(outDir, "index.html"), html);
	process.stdout.write(`wrote ${args.count} challenges to ${outDir}\n`);
};

await main();
