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
// Vite plugin to inject explanations into HTML files
import type { IndexHtmlTransformContext, Plugin } from "vite";

export default function explanationInjector(): Plugin {
	return {
		name: "explanation-injector",
		transformIndexHtml: {
			enforce: "post", // Run after other HTML transforms
			transform(html: string, ctx: IndexHtmlTransformContext): string {
				// Skip if no HTML body is found
				if (!html.includes("<body") || !html.includes("</body>")) {
					return html;
				}

				// Extract the current page name from the context
				const url = ctx.filename || "";
				const pageName = url.split("/").pop()?.split(".")[0] || "";

				// Determine CAPTCHA type from filename
				const isFrictionless = pageName.includes("frictionless");
				const isImage = pageName.includes("image");
				const isPow = pageName.includes("pow");
				const isInvisible = pageName.includes("invisible");
				const isExplicit = pageName.includes("explicit");

				// Generate the appropriate explanation based on CAPTCHA type
				let explanationHtml = "";

				if (isFrictionless) {
					explanationHtml = generateFrictionlessExplanation(
						isExplicit,
						isInvisible,
					);
				} else if (isImage) {
					explanationHtml = generateImageExplanation(isExplicit, isInvisible);
				} else if (isPow) {
					explanationHtml = generatePowExplanation(isExplicit, isInvisible);
				}

				// No explanation needed or couldn't determine type
				if (!explanationHtml) {
					return html;
				}

				// Look for an existing explanation div to replace
				if (html.includes('<div class="explanation">')) {
					// Replace the existing explanation
					const explRegex =
						/<div class="explanation">[\s\S]*?<\/div>\s*<\/div>/;
					return html.replace(explRegex, explanationHtml);
				}

				// Otherwise insert before the closing body tag
				return html.replace("</body>", `${explanationHtml}</body>`);
			},
		},
	};
}

// Helper functions to generate explanations for different CAPTCHA types
function generateFrictionlessExplanation(
	isExplicit: boolean,
	isInvisible: boolean,
): string {
	const renderType = isExplicit ? "Explicit" : "Implicit";
	const modeDesc = isInvisible ? "invisible" : "normal";

	return `
	<div class="explanation">
		<h2>How ${isInvisible ? "Invisible " : ""}Frictionless CAPTCHA Works (${renderType} Rendering)</h2>
		
		<h3>Implementation Details</h3>
		<p>This example demonstrates how to use Procaptcha in frictionless mode with ${renderType.toLowerCase()} rendering:</p>
		<ol>
			<li>Import the Procaptcha ${isExplicit ? "render function" : "script"}</li>
			<li>${isExplicit ? "Create a container for the CAPTCHA" : "Add a div with the procaptcha class"}</li>
			<li>${isExplicit ? "Render the CAPTCHA explicitly" : "Set data-* attributes to configure the CAPTCHA"}</li>
			<li>Handle the verification result in the callback function</li>
		</ol>
		
		<h3>Key Code Example</h3>
		<pre>
${
	isExplicit
		? `// Import the render function
import { render } from "%VITE_BUNDLE_URL%"
import { CaptchaType } from "@prosopo/types";

// Render CAPTCHA
const widgetId = render(document.getElementById('procaptcha-container'), {
    siteKey: import.meta.env.PROSOPO_SITE_KEY_FRICTIONLESS,
    captchaType: CaptchaType.frictionless,
    callback: handleCaptchaResponse,
    "failed-callback": handleCaptchaFailed${isInvisible ? ',\n    size: "invisible"' : ""}
});`
		: `<div
    class="procaptcha"
    data-theme="light"
    data-sitekey="%PROSOPO_SITE_KEY_FRICTIONLESS%"
    data-failed-callback="onCaptchaFailed"
    data-callback="onCaptchaVerified"
    data-captcha-type="frictionless"${isInvisible ? '\n    data-size="invisible"' : ""}
></div>`
}</pre>
		
		<h3>Execution Flow</h3>
		<ol>
			<li>On page load, ${isExplicit ? "the render function is called to initialize" : "Procaptcha scans for elements with the procaptcha class"}</li>
			<li>The CAPTCHA verification happens ${isInvisible ? "invisibly in the background" : "when the user interacts with it"}</li>
			<li>When verification is complete, the callback function is called with the token</li>
			<li>On successful verification, the form can be submitted with the token</li>
		</ol>
	</div>
	`;
}

function generateImageExplanation(
	isExplicit: boolean,
	isInvisible: boolean,
): string {
	const renderType = isExplicit ? "Explicit" : "Implicit";
	const modeDesc = isInvisible ? "invisible" : "visible";

	return `
	<div class="explanation">
		<h2>How ${isInvisible ? "Invisible " : ""}Image CAPTCHA Works (${renderType} Rendering)</h2>
		
		<h3>Implementation Details</h3>
		<p>This example demonstrates how to use Procaptcha in image mode with ${renderType.toLowerCase()} rendering:</p>
		<ol>
			<li>Import the Procaptcha ${isExplicit ? "render function" : "script"}</li>
			<li>${isExplicit ? "Create a container for the CAPTCHA" : "Add a div with the procaptcha class"}</li>
			<li>${isExplicit ? "Render the CAPTCHA explicitly" : "Set data-* attributes to configure the CAPTCHA"}</li>
			<li>Handle the verification result in the callback function</li>
		</ol>
		
		<h3>Key Code Example</h3>
		<pre>
${
	isExplicit
		? `// Import the render function
import { render } from "%VITE_BUNDLE_URL%"
import { CaptchaType } from "@prosopo/types";

// Render CAPTCHA
const widgetId = render(document.getElementById('procaptcha-container'), {
    siteKey: import.meta.env.PROSOPO_SITE_KEY_IMAGE,
    captchaType: CaptchaType.image,
    callback: handleCaptchaResponse,
    "failed-callback": handleCaptchaFailed${isInvisible ? ',\n    size: "invisible"' : ""}
});`
		: `<div
    class="procaptcha"
    data-theme="light"
    data-sitekey="%PROSOPO_SITE_KEY_IMAGE%"
    data-failed-callback="onCaptchaFailed"
    data-callback="onCaptchaVerified"
    data-captcha-type="image"${isInvisible ? '\n    data-size="invisible"' : ""}
></div>`
}</pre>
		
		<h3>Execution Flow</h3>
		<ol>
			<li>On page load, ${isExplicit ? "the render function is called to initialize" : "Procaptcha scans for elements with the procaptcha class"}</li>
			<li>The CAPTCHA challenge is rendered ${isInvisible ? "only when needed" : "in the specified container"}</li>
			<li>When the user completes the challenge, the callback function is called</li>
			<li>On successful verification, the form can be submitted with the token</li>
		</ol>
	</div>
	`;
}

function generatePowExplanation(
	isExplicit: boolean,
	isInvisible: boolean,
): string {
	const renderType = isExplicit ? "Explicit" : "Implicit";
	const modeDesc = isInvisible ? "invisible" : "visible";

	return `
	<div class="explanation">
		<h2>How ${isInvisible ? "Invisible " : ""}Proof of Work CAPTCHA Works (${renderType} Rendering)</h2>
		
		<h3>Implementation Details</h3>
		<p>This example demonstrates how to use Procaptcha in Proof of Work mode with ${renderType.toLowerCase()} rendering:</p>
		<ol>
			<li>Import the Procaptcha ${isExplicit ? "render function" : "script"}</li>
			<li>${isExplicit ? "Create a container for the CAPTCHA" : "Add a div with the procaptcha class"}</li>
			<li>${isExplicit ? "Render the CAPTCHA explicitly" : "Set data-* attributes to configure the CAPTCHA"}</li>
			<li>Handle the verification result in the callback function</li>
		</ol>
		
		<h3>Key Code Example</h3>
		<pre>
${
	isExplicit
		? `// Import the render function
import { render } from "%VITE_BUNDLE_URL%"
import { CaptchaType } from "@prosopo/types";

// Render CAPTCHA
const widgetId = render(document.getElementById('procaptcha-container'), {
    siteKey: import.meta.env.PROSOPO_SITE_KEY_POW,
    captchaType: CaptchaType.pow,
    callback: handleCaptchaResponse,
    "failed-callback": handleCaptchaFailed${isInvisible ? ',\n    size: "invisible"' : ""}
});`
		: `<div
    class="procaptcha"
    data-theme="light"
    data-sitekey="%PROSOPO_SITE_KEY_POW%"
    data-failed-callback="onCaptchaFailed"
    data-callback="onCaptchaVerified"
    data-captcha-type="pow"${isInvisible ? '\n    data-size="invisible"' : ""}
></div>`
}</pre>
		
		<h3>Execution Flow</h3>
		<ol>
			<li>On page load, ${isExplicit ? "the render function is called to initialize" : "Procaptcha scans for elements with the procaptcha class"}</li>
			<li>The Proof of Work computation happens in the browser</li>
			<li>When the computation is complete, the callback function is called</li>
			<li>On successful verification, the form can be submitted with the token</li>
		</ol>
	</div>
	`;
}
