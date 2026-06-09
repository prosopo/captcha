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

/** @jsxImportSource @emotion/react */

import { TestSiteKeyMode, getTestSiteKeyMode } from "@prosopo/types";
import { type FC, useEffect } from "react";

interface TestModeBannerProps {
	siteKey: string;
}

// Renders a prominent warning when the widget is configured with one of the
// reserved CI test site keys (always-pass / always-fail). Renders nothing for a
// normal site key. This is the user-facing safeguard that stops a test key from
// being shipped to production unnoticed.
export const TestModeBanner: FC<TestModeBannerProps> = ({
	siteKey,
}: TestModeBannerProps) => {
	const mode: TestSiteKeyMode | null = getTestSiteKeyMode(siteKey);

	useEffect(() => {
		if (mode !== null) {
			console.warn(
				`[Procaptcha] WARNING: site key "${siteKey}" is a TEST key that ALWAYS ${
					mode === TestSiteKeyMode.Pass ? "PASSES" : "FAILS"
				}. Never use it in production.`,
			);
		}
	}, [mode, siteKey]);

	if (mode === null) {
		return null;
	}

	const action =
		mode === TestSiteKeyMode.Pass ? "ALWAYS PASSES" : "ALWAYS FAILS";

	return (
		// biome-ignore lint/a11y/useSemanticElements: the "alert" role has no native HTML element equivalent
		<div
			role="alert"
			data-cy="test-mode-banner"
			css={{
				width: "100%",
				boxSizing: "border-box",
				padding: "6px 10px",
				backgroundColor: "#fff3cd",
				color: "#664d03",
				border: "1px solid #ffe69c",
				borderRadius: "4px",
				fontSize: "11px",
				lineHeight: "1.3",
				fontFamily:
					"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
				textAlign: "center",
			}}
		>
			{`⚠ Test mode: this site key ${action}. Do not use in production.`}
		</div>
	);
};

export default TestModeBanner;
