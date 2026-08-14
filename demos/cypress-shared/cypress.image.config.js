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

const allExternal = [
	...builtinModules,
	...builtinModules.map((m) => `node:${m}`),
];
loadEnv();

export default defineConfig({
	video: true,
	screenshotsFolder: "./cypress/snapshots/actual",
	trashAssetsBeforeRuns: true,
	headers: { "Accept-Encoding": "gzip, deflate" },
	env: {
		...process.env,
		// For the client-example, the default page is the captcha type. For the client-bundle-example, the default_page
		// is sometimes passed via --env default_page='/THE_PAGE.html'" inside package.json scripts.
		default_page: "/",
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
				}),
			);
			// Add task event for logging to the terminal
			on("task", {
				log(message) {
					console.log(message);
					return null; // Cypress requires tasks to return something
				},
			});
		},
		excludeSpecPattern: [
			"cypress/e2e/**/frictionless.cy.ts",
			"cypress/e2e/**/invisible.cy.ts",
			"cypress/e2e/**/pow.cy.ts",
			// Puzzle spec drives puzzle-explicit.html and expects the puzzle
			// canvas to render — swaps the site key to puzzle mode via a
			// bespoke lax-tolerance registration. Runs under its own
			// cypress.puzzle.config.js.
			"cypress/e2e/**/puzzle.cy.ts",
			// Escalation spec drives the frictionless flow + installs a
			// dapp-scoped routing machine; it has its own
			// cypress.escalation.config.js and must not be pulled into
			// the image config's catch-all.
			"cypress/e2e/**/escalation.cy.ts",
			// Frictionless-phase routing / post-PoW puzzle escalation /
			// decision-machine deny / access-policy specs each have their
			// own config with the right default_page + captcha type. The
			// image config's catch-all would otherwise mount them under
			// CAPTCHA_TYPE=image with the wrong sitekey + demo page and
			// fail before the actual test logic runs.
			"cypress/e2e/**/routingFrictionless.cy.ts",
			"cypress/e2e/**/postPowPuzzle.cy.ts",
			"cypress/e2e/**/decisionMachineDeny.cy.ts",
			"cypress/e2e/**/decisionMachineDenyPow.cy.ts",
			"cypress/e2e/**/decisionMachineDenyPuzzle.cy.ts",
			"cypress/e2e/**/accessPolicy.cy.ts",
			"cypress/e2e/**/accessPolicyRestrict.cy.ts",
			"cypress/e2e/**/accessPolicyConflicts.cy.ts",
			// Frictionless-scoped specs — every widget mount fires
			// /frictionless (bundleCaptcha unconditionally mounts
			// ProcaptchaFrictionless), but these specs assert on a
			// specific /frictionless response (captchaType=pow from
			// a routing machine) that only fires when the demo page
			// embeds `PROSOPO_SITE_KEY_FRICTIONLESS`. Under the image
			// config's `default_page: "/"` the sitekey is
			// `PROSOPO_SITE_KEY_IMAGE`, /frictionless returns
			// captchaType=image, and the subsequent pow-flow
			// assertions never see the requests they wait on. Each
			// spec has its own config with the right default_page.
			"cypress/e2e/**/sessionCaptchaTypeConsistency.cy.ts",
			"cypress/e2e/**/frictionlessNoCaptchaTypeCascade.cy.ts",
			"cypress/e2e/**/escalationPuzzle.cy.ts",
		],
	},
	component: {
		devServer: {
			framework: "create-react-app",
			bundler: "vite",
		},
	},
});
