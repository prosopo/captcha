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

import { builtinModules } from "node:module";
import { loadEnv } from "@prosopo/dotenv";
import { defineConfig } from "cypress";
import { configureVisualRegression } from "cypress-visual-regression";
import vitePreprocessor from "cypress-vite";

loadEnv();

const allExternal = [
	...builtinModules,
	...builtinModules.map((m) => `node:${m}`),
];

export default defineConfig({
	video: true,
	screenshotsFolder: "./cypress/snapshots/actual",
	trashAssetsBeforeRuns: true,
	headers: { "Accept-Encoding": "gzip, deflate" },
	env: {
		...process.env,
		// audio-implicit.html has a signup form wired to /signup on the
		// demo dapp server, matching how puzzle.cy.ts drives the puzzle
		// path. That /signup call is what exercises
		// prosopoServer.isVerified() → audio endpoint.
		default_page: "/audio-implicit.html",
		visualRegressionType: "regression",
		visualRegressionBaseDirectory: "cypress/snapshots/baseline",
		visualRegressionDiffDirectory: "cypress/snapshots/diff",
		visualRegressionGenerateDiff: "fail",
		visualRegressionFailSilently: false,
	},
	e2e: {
		setupNodeEvents(on, config) {
			configureVisualRegression(on);
			on(
				"file:preprocessor",
				vitePreprocessor({
					watch: false,
					esbuild: {
						platform: "browser",
					},
					server: {
						host: true,
					},
					build: {
						ssr: false,
						modulePreload: { polyfill: true },
						rollupOptions: {
							external: allExternal,
						},
					},
					plugins: [],
				}),
			);
			on("task", {
				log(message) {
					console.log(message);
					return null;
				},

				// Read the spoken transcript for a challenge straight out of
				// Mongo.
				//
				// There is no way around this: the challenge is real
				// synthesised speech and Cypress cannot listen to it. The
				// alternative would be a "make any answer pass" setting,
				// which is a backdoor in production code and would mean the
				// grading path is never actually exercised. Reading the
				// answer server-side makes the test an oracle — it knows
				// what a human listener would know — while every other
				// step (challenge issuance, single-use enforcement,
				// signature checks, grading, server verify) runs for real.
				async audioAnswer({ challenge }) {
					const { MongoClient } = await import("mongodb");
					const uri = `mongodb://${process.env.PROSOPO_DATABASE_USERNAME}:${process.env.PROSOPO_DATABASE_PASSWORD}@${process.env.PROSOPO_DATABASE_HOST}:${process.env.PROSOPO_DATABASE_PORT}/?authSource=admin`;
					const client = new MongoClient(uri);
					try {
						await client.connect();
						const record = await client
							.db(process.env.PROSOPO_DATABASE_NAME)
							// Mongoose pluralises the model name, so the
							// collection is "audiocaptchas", not the singular
							// TableNames value the provider registers with.
							.collection("audiocaptchas")
							.findOne({ challenge });
						return record?.answer ?? null;
					} finally {
						await client.close();
					}
				},
			});
		},
		specPattern: ["cypress/e2e/**/audio.cy.ts"],
	},
	component: {
		devServer: {
			framework: "create-react-app",
			bundler: "vite",
		},
	},
});
