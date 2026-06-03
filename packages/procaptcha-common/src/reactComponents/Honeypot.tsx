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

import { type CSSProperties, forwardRef, useId, useMemo } from "react";

interface HoneypotProps {
	encodedQuestion: string;
}

const offscreenStyle: CSSProperties = {
	position: "absolute",
	left: "-9999px",
	top: "-9999px",
	width: "1px",
	height: "1px",
	overflow: "hidden",
	opacity: 0,
};

// Server wraps morse/semaphore in base64 (utf-8) for the wire. Strip the
// base64 layer here so the rendered label is the raw morse/semaphore an agent
// can recognise and engage with.
const decodeBase64Utf8 = (b64: string): string => {
	const binary = atob(b64);
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
};

// The decoded question is rendered as the input's <label>, not as the input's
// value. Naive form-fillers leave the empty input alone — no signal, no false
// positives. Agents that read the DOM as a prompt may decode the label and
// write an answer into the empty field; that response is what we capture and
// persist via clientMetaData.hp.
export const Honeypot = forwardRef<HTMLInputElement, HoneypotProps>(
	({ encodedQuestion }, ref) => {
		const id = useId();
		const question = useMemo(
			() => decodeBase64Utf8(encodedQuestion),
			[encodedQuestion],
		);
		return (
			<div aria-hidden="true" style={offscreenStyle}>
				<label htmlFor={id}>{question}</label>
				<input
					ref={ref}
					id={id}
					type="text"
					name="email_confirm"
					defaultValue=""
					tabIndex={-1}
					autoComplete="off"
					aria-hidden="true"
				/>
			</div>
		);
	},
);

Honeypot.displayName = "Honeypot";
