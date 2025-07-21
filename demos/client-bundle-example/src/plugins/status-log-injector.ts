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
// Vite plugin to inject CAPTCHA status log into HTML files
import type { IndexHtmlTransformContext, Plugin } from "vite";

export default function statusLogInjector(): Plugin {
	// CSS for status log styling
	const statusLogCss = `
	<style>
		.captcha-status {
			margin-top: 20px;
			padding: 15px;
			background-color: #f0f8ff;
			border: 2px solid #2196F3;
			border-radius: 5px;
			font-family: monospace;
			font-size: 14px;
		}
		.status-item {
			margin: 5px 0;
			padding: 5px;
		}
		.status-success {
			color: #4CAF50;
			font-weight: bold;
		}
		.status-error {
			color: #F44336;
			font-weight: bold;
		}
		.status-info {
			color: #2196F3;
		}
		.status-warning {
			color: #FF9800;
		}
		.status-title {
			font-weight: bold;
			margin-bottom: 10px;
			border-bottom: 1px solid #2196F3;
			padding-bottom: 5px;
		}
		.console-output {
			margin-top: 20px;
			padding: 10px;
			background-color: #f5f5f5;
			border: 1px solid #ddd;
			border-radius: 4px;
			font-family: monospace;
			white-space: pre-wrap;
			max-height: 200px;
			overflow-y: auto;
		}
	</style>
  `;

	// JavaScript for status log functionality
	const statusLogJs = `
	<script type="module">
		// Function to update CAPTCHA status display
		function updateCaptchaStatus(message, type = 'info') {
			const statusContainer = document.getElementById('captcha-status');
			if (!statusContainer) return;
			
			const timestamp = new Date().toLocaleTimeString();
			const statusItem = document.createElement('div');
			statusItem.className = \`status-item status-\${type}\`;
			statusItem.innerHTML = \`[\${timestamp}] \${message}\`;
			statusContainer.appendChild(statusItem);
			
			// Also log to console
			console.log(\`CAPTCHA Status: \${message}\`);
		}

		// Make updateCaptchaStatus available globally
		window.updateCaptchaStatus = updateCaptchaStatus;

		// Override the original callbacks with enhanced versions that use status logging
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
		window.onActionHandler = function(token) {
			console.log('status-log-injector onActionHandler called with token:', token);
			
			const procaptchaElements = document.getElementsByName('procaptcha-response');
			
			if (!procaptchaElements.length) {
				updateCaptchaStatus('Error: No CAPTCHA response token found', 'error');
				alert("Must complete captcha");
				return;
			}
			
			updateCaptchaStatus('Form submission initiated with valid CAPTCHA token', 'info');
			if (originalOnActionHandler) {
				console.log('status-log-injector calling original onActionHandler with token:', token);
				originalOnActionHandler(token);
			}
		};

		document.addEventListener('DOMContentLoaded', function() {
			updateCaptchaStatus('Page loaded - Initializing CAPTCHA system', 'info');
			
			// Monitor DOM for CAPTCHA initialization
			const observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.addedNodes.length) {
						for (let i = 0; i < mutation.addedNodes.length; i++) {
							const node = mutation.addedNodes[i];
							if (node.classList && (node.classList.contains('procaptcha') || 
								node.querySelector && node.querySelector('.procaptcha'))) {
								updateCaptchaStatus('CAPTCHA DOM elements initialized', 'info');
								observer.disconnect();
								break;
							}
						}
					}
				});
			});
			
			observer.observe(document.body, { childList: true, subtree: true });
		});
		
		// Create a method to show CAPTCHA execution events
		document.addEventListener('procaptcha:execute', function(e) {
			// Determine captcha type from the page URL
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

	// HTML for status log container
	const statusLogHtml = `
	<!-- CAPTCHA Status Display -->
	<div id="captcha-status" class="captcha-status">
		<div class="status-title">CAPTCHA Status Log</div>
	</div>
	
	<!-- Console output display area -->
	<div id="console-output" class="console-output" style="display: none;"></div>
  `;

	return {
		name: "status-log-injector",
		transformIndexHtml: {
			enforce: "post", // Run after other HTML transforms
			transform(html: string, ctx: IndexHtmlTransformContext): string {
				// Skip if no HTML body is found
				if (!html.includes("<body") || !html.includes("</body>")) {
					return html;
				}

				// Skip if status log already exists
				if (html.includes('id="captcha-status"')) {
					return html;
				}

				// Add CSS to head
				let updatedHtml = html.replace("</head>", `${statusLogCss}</head>`);

				// Add JavaScript to head
				updatedHtml = updatedHtml.replace("</head>", `${statusLogJs}</head>`);

				// Add status log container after the form or before the closing body if no form
				if (updatedHtml.includes("</form>")) {
					return updatedHtml.replace("</form>", `</form>${statusLogHtml}`);
				}
				return updatedHtml.replace("</body>", `${statusLogHtml}</body>`);
			},
		},
	};
}
