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

import fs from "node:fs";
import { getLogger } from "@prosopo/logger";

const DEFAULT_PHRASE_BANK_PATH = "/app/data/honeypot-phrases.json";
const logger = getLogger("info", "honeypot-phrase-bank");

let cachedPhrases: string[] | null = null;

const resolvePath = (): string =>
	process.env.PROSOPO_HONEYPOT_PHRASE_BANK_PATH ?? DEFAULT_PHRASE_BANK_PATH;

const loadPhrases = (): string[] => {
	const path = resolvePath();
	try {
		const raw = fs.readFileSync(path, "utf-8");
		const parsed: unknown = JSON.parse(raw);
		if (
			parsed &&
			typeof parsed === "object" &&
			"phrases" in parsed &&
			Array.isArray((parsed as { phrases: unknown }).phrases)
		) {
			const phrases = (parsed as { phrases: unknown[] }).phrases.filter(
				(p): p is string => typeof p === "string" && p.trim().length > 0,
			);
			logger.info(() => ({
				msg: "Loaded honeypot phrase bank",
				data: { path, count: phrases.length },
			}));
			return phrases;
		}
		logger.warn(() => ({
			msg: "Honeypot phrase bank missing `phrases` array",
			data: { path },
		}));
		return [];
	} catch (err) {
		logger.warn(() => ({
			msg: "Failed to load honeypot phrase bank — fallback questions disabled",
			data: { path, err: err instanceof Error ? err.message : String(err) },
		}));
		return [];
	}
};

/**
 * Returns a random phrase from the loaded bank, or `undefined` if the bank
 * is empty / unloadable. Loads lazily on first call so startup ordering
 * doesn't matter and tests can swap the env var before first use.
 */
export const getRandomPhrase = (): string | undefined => {
	if (cachedPhrases === null) cachedPhrases = loadPhrases();
	if (cachedPhrases.length === 0) return undefined;
	const idx = Math.floor(Math.random() * cachedPhrases.length);
	return cachedPhrases[idx];
};

// Test/dev hook: reset the cache so a subsequent call reloads from disk.
export const resetPhraseBankCache = (): void => {
	cachedPhrases = null;
};
