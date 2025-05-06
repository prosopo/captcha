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
	// Explanation content for Invisible POW CAPTCHA (Implicit Rendering)
	const powImplicitExplanation = `
    <div class="explanation">
        <h2>How Invisible Proof of Work CAPTCHA Works (Implicit Rendering)</h2>
        
        <h3>Implementation Details</h3>
        <p>This demo shows how to implement invisible Proof of Work CAPTCHA directly on a button using implicit rendering:</p>
        <ol>
            <li>Include the Procaptcha script</li>
            <li>Add the <code>procaptcha</code> class to your submit button</li>
            <li>Set <code>data-sitekey</code> with your PoW site key</li>
            <li>Set <code>data-callback</code> to the function that will receive the token</li>
            <li>Add <code>data-captcha-type="pow"</code> to specify the type</li>
            <li>Add <code>data-size="invisible"</code> to enable invisible mode</li>
        </ol>
        
        <h3>Key Button Attributes</h3>
        <pre>
&lt;button 
    class="mui-btn mui-btn--raised procaptcha" 
    data-sitekey="%PROSOPO_SITE_KEY_POW%" 
    data-callback="onSubmit"
    data-captcha-type="pow"
    data-size="invisible"&gt;
    Submit
&lt;/button&gt;</pre>
        
        <h3>Execution Flow</h3>
        <ol>
            <li>When the page loads, Procaptcha scans for elements with the <code>procaptcha</code> class</li>
            <li>For buttons, it adds an event listener that triggers on click</li>
            <li>When the button is clicked, the Proof of Work challenge starts invisibly</li>
            <li>The script dispatches a <code>procaptcha:execute</code> event</li>
            <li>When verification is complete, the <code>data-callback</code> function is called with the token</li>
            <li>Your callback function can then handle the form submission with the token</li>
        </ol>
    </div>
  `;

	// CAPTCHA Status checker CSS for index.html
	const captchaStatusStyle = `
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

	// CAPTCHA Status checker script for index.html
	const captchaStatusScript = `
	<script type="module">
		// Override console.log to capture output
		function setupConsoleCapture() {
			const originalConsoleLog = console.log;
			const consoleOutput = document.getElementById('console-output');
			
			console.log = function() {
				originalConsoleLog.apply(console, arguments);
				
				// Format and display the arguments in our custom console
				const args = Array.from(arguments).map(arg => {
					if (typeof arg === 'object') {
						try {
							return JSON.stringify(arg, null, 2);
						} catch (e) {
							return "[Object cannot be stringified]";
						}
					}
					return String(arg);
				});
				
				consoleOutput.innerHTML += args.join(' ') + '<br>';
				consoleOutput.style.display = 'block';
			};
			
			console.log("Console logging captured and redirected to display");
		}

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

		document.addEventListener('DOMContentLoaded', function() {
			setupConsoleCapture();
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
			updateCaptchaStatus(\`CAPTCHA execution started: type=image\`, 'info');
			updateCaptchaStatus(\`Container: \${e.detail.containerId}, timestamp: \${new Date(e.detail.timestamp).toLocaleTimeString()}\`, 'info');
		});
	</script>
  `;

	// CAPTCHA Status HTML for index.html
	const captchaStatusHtml = `
	<!-- CAPTCHA Status Display -->
	<div id="captcha-status" class="captcha-status">
		<div class="status-title">CAPTCHA Status Log</div>
	</div>
	
	<!-- Console output display area -->
	<div id="console-output" class="console-output" style="display: none;"></div>
  `;

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

				// Logic for invisible-pow-explicit.html
				if (pageName === "invisible-pow-explicit") {
					// For invisible-pow-explicit.html, replace its current explanation with the POW implicit one
					if (html.includes('<div style="margin-top: 20px;">')) {
						return html.replace(
							/<div style="margin-top: 20px;">[\s\S]*?<h3>Event-Based Communication System[\s\S]*?<\/div>/,
							powImplicitExplanation,
						);
					}
				}

				// Logic for index.html
				if (pageName === "index") {
					// Add style to head
					let updatedHtml = html.replace(
						"</head>",
						`${captchaStatusStyle}</head>`,
					);

					// Add script to head
					updatedHtml = updatedHtml.replace(
						"</head>",
						`${captchaStatusScript}</head>`,
					);

					// Add status display after form
					if (updatedHtml.includes("</form>")) {
						return updatedHtml.replace(
							"</form>",
							`</form>${captchaStatusHtml}`,
						);
					}

					return updatedHtml;
				}

				return html;
			},
		},
	};
}
