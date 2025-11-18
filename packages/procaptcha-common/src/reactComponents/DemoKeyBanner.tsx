// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { css } from "@emotion/react";
import type { FC } from "react";

interface DemoKeyBannerProps {
	behavior: "always_pass" | "always_fail";
}

const bannerStyles = css`
	width: 100%;
	background-color: #dc2626;
	color: white;
	padding: 6px 12px;
	font-size: 12px;
	font-weight: 700;
	text-align: center;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	line-height: 1.5;
	border: 2px solid #991b1b;
	border-radius: 4px;
	margin-bottom: 8px;
`;

const linkStyles = css`
	color: #fef3c7;
	text-decoration: underline;
	font-weight: 700;
	&:hover {
		color: #fde68a;
		text-decoration: none;
	}
`;

export const DemoKeyBanner: FC<DemoKeyBannerProps> = ({ behavior }) => {
	const behaviorText =
		behavior === "always_pass" ? "ALWAYS PASS" : "ALWAYS FAIL";
	const docsUrl = process.env.PROSOPO_DOCS_URL || "https://docs.prosopo.io";

	return (
		<div css={bannerStyles} data-testid="demo-key-banner">
			⚠️ DEMO MODE ({behaviorText}) - NOT FOR PRODUCTION •{" "}
			<a
				href={`${docsUrl}/demo-keys`}
				target="_blank"
				rel="noopener noreferrer"
				css={linkStyles}
			>
				Learn More
			</a>
		</div>
	);
};

export default DemoKeyBanner;
