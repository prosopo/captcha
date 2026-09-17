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

// Vite plugin that adds the event log. Demo pages report what the widget is
// doing through window.updateCaptchaStatus.
import type { IndexHtmlTransformContext, Plugin } from "vite";
import { fillSlot } from "./slots.js";

export default function statusLogInjector(): Plugin {
	const statusLogJs = `
	<script type="module">
		function updateCaptchaStatus(message, type = 'info') {
			const statusContainer = document.getElementById('captcha-status');
			if (!statusContainer) return;

			const time = document.createElement('span');
			time.className = 'status-item__time';
			time.textContent = new Date().toLocaleTimeString();
			const dot = document.createElement('span');
			dot.className = 'status-item__dot';
			const text = document.createElement('span');
			text.className = 'status-item__message';
			text.textContent = message;

			const statusItem = document.createElement('div');
			statusItem.className = \`status-item status-\${type}\`;
			statusItem.append(time, dot, text);
			statusContainer.appendChild(statusItem);
			statusContainer.scrollTop = statusContainer.scrollHeight;

			console.log(\`CAPTCHA Status: \${message}\`);
		}

		window.updateCaptchaStatus = updateCaptchaStatus;

		// Wrap the page's own callbacks so every page logs the same events.
		const originalOnCaptchaFailed = window.onCaptchaFailed;
		window.onCaptchaFailed = function() {
			updateCaptchaStatus('Challenge failed - CAPTCHA verification could not be completed', 'error');
			if (originalOnCaptchaFailed) originalOnCaptchaFailed();
		};

		const originalOnCaptchaVerified = window.onCaptchaVerified;
		window.onCaptchaVerified = function(output) {
			updateCaptchaStatus('Challenge passed successfully!', 'success');
			updateCaptchaStatus(\`Token generated: \${output.substring(0, 15)}...\`, 'success');
			if (originalOnCaptchaVerified) originalOnCaptchaVerified(output);
		};

		const originalOnActionHandler = window.onActionHandler;
		window.onActionHandler = function() {
			const procaptchaElements = document.getElementsByName('procaptcha-response');

			if (!procaptchaElements.length) {
				updateCaptchaStatus('Error: No CAPTCHA response token found', 'error');
				alert("Must complete captcha");
				return;
			}

			updateCaptchaStatus('Form submission initiated with valid CAPTCHA token', 'info');
			if (originalOnActionHandler) originalOnActionHandler();
		};

		document.addEventListener('procaptcha:execute', function(e) {
			const url = window.location.pathname;
			const isFrictionless = url.includes('frictionless');
			const isImage = url.includes('image');
			const isPow = url.includes('pow');

			let captchaType = 'unknown';
			if (isFrictionless) captchaType = 'frictionless';
			else if (isImage) captchaType = 'image';
			else if (isPow) captchaType = 'pow';

			updateCaptchaStatus(\`CAPTCHA execution started: type=\${captchaType}\`, 'info');
			updateCaptchaStatus(\`Container: \${e.detail.containerId}, timestamp: \${new Date(e.detail.timestamp).toLocaleTimeString()}\`, 'info');
		});
	</script>
  `;

	const statusLogHtml = `<div id="captcha-status" class="captcha-status" aria-live="polite"></div>`;

	return {
		name: "status-log-injector",
		transformIndexHtml: {
			order: "post",
			handler(html: string, _ctx: IndexHtmlTransformContext): string {
				if (!html.includes("<body") || !html.includes("</body>")) {
					return html;
				}

				if (html.includes('id="captcha-status"')) {
					return html;
				}

				const withJs = html.replace("</head>", () => `${statusLogJs}</head>`);

				const inSlot = fillSlot(withJs, "events", statusLogHtml);
				if (inSlot) {
					return inSlot;
				}
				if (withJs.includes("</form>")) {
					return withJs.replace("</form>", () => `</form>${statusLogHtml}`);
				}
				return withJs.replace("</body>", () => `${statusLogHtml}</body>`);
			},
		},
	};
}
