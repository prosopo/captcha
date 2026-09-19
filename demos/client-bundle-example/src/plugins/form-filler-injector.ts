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

// Vite plugin to inject a button that fills the demo form with sample values.
import type { IndexHtmlTransformContext, Plugin } from "vite";
import { fillSlot } from "./slots.js";

export default function formFillerInjector(): Plugin {
	// No type attribute: specs probe button[type='button']:nth-of-type(2).
	const buttonHtml = `
    <button id="form-filler-button" class="form-filler-button" title="Fill the form with sample values">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
      <span>Fill form</span>
    </button>
  `;

	const fillerScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        function fillFormWithDefaults() {
          const inputs = document.querySelectorAll('input, select, textarea');
          const filledElements = [];

          inputs.forEach(input => {
            let filled = true;

            if (input.type === 'hidden' || (input.value && input.value.trim() !== '')) {
              filled = false;
            }
            else if (input.type === 'text') {
              if (input.id.toLowerCase().includes('name') || input.name.toLowerCase().includes('name')) {
                input.value = 'John Doe';
              } else {
                input.value = 'Default Text';
              }
            }
            else if (input.type === 'email') {
              input.value = 'test@example.com';
            }
            else if (input.type === 'password') {
              input.value = 'Password123!';
            }
            else if (input.type === 'tel') {
              input.value = '+1234567890';
            }
            else if (input.type === 'number') {
              input.value = '42';
            }
            else if (input.type === 'url') {
              input.value = 'https://example.com';
            }
            else if (input.type === 'date') {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              input.value = \`\${yyyy}-\${mm}-\${dd}\`;
            }
            else if (input.type === 'time') {
              input.value = '12:00';
            }
            else if (input.type === 'checkbox' || input.type === 'radio') {
              input.checked = true;
            }
            else if (input.tagName === 'SELECT') {
              if (input.options.length > 0) {
                input.selectedIndex = 1 >= input.options.length ? 0 : 1;
              }
            }
            else if (input.tagName === 'TEXTAREA') {
              input.value = 'This is a sample text for the textarea field.';
            }
            else {
              input.value = 'Default Value';
            }

            if (filled) {
              filledElements.push(input);
              input.dispatchEvent(new Event('input', { bubbles: true }));
              if (input.tagName === 'SELECT') {
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          });

          if (filledElements.length > 0) {
            if (typeof window.updateCaptchaStatus === 'function') {
              window.updateCaptchaStatus(\`Filled \${filledElements.length} form fields with default values\`, 'info');
            } else {
              console.log(\`Filled \${filledElements.length} form fields with default values\`);
            }

            filledElements.forEach(el => {
              const originalBackground = el.style.backgroundColor;
              const originalTransition = el.style.transition;

              el.style.transition = 'background-color 1.5s ease';
              el.style.backgroundColor = '#EDECF5';

              setTimeout(() => {
                el.style.backgroundColor = originalBackground;
                setTimeout(() => {
                  el.style.transition = originalTransition;
                }, 1500);
              }, 500);
            });
          }
        }

        const formFillerButton = document.getElementById('form-filler-button');
        if (formFillerButton) {
          formFillerButton.addEventListener('click', fillFormWithDefaults);
        }
      });
    </script>
  `;

	return {
		name: "form-filler-injector",
		transformIndexHtml: {
			order: "post",
			handler(html: string, _ctx: IndexHtmlTransformContext): string {
				if (!html.includes("<body") || !html.includes("</body>")) {
					return html;
				}

				const withButton =
					fillSlot(html, "toolbar", buttonHtml) ??
					html.replace("</body>", () => `${buttonHtml}</body>`);

				return withButton.replace("</body>", () => `${fillerScript}</body>`);
			},
		},
	};
}
