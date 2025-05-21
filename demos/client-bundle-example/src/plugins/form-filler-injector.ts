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
// Vite plugin to inject a form filler button into HTML files
import type { IndexHtmlTransformContext, Plugin } from "vite";

export default function formFillerInjector(): Plugin {
	// Style for the form filler button
	const buttonStyle = `
    <style>
      .form-filler-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 30px;
        padding: 12px 20px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        outline: none;
      }
      
      .form-filler-button:hover {
        background-color: #1976D2;
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
        transform: translateY(-2px);
      }
      
      .form-filler-button:active {
        transform: translateY(1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      .form-filler-button svg {
        width: 18px;
        height: 18px;
        fill: white;
      }
      
      .form-filler-button span {
        font-weight: 500;
      }
      
      @media (max-width: 768px) {
        .form-filler-button {
          bottom: 15px;
          right: 15px;
          padding: 10px 15px;
          font-size: 12px;
        }
        
        .form-filler-button svg {
          width: 14px;
          height: 14px;
        }
      }
    </style>
  `;

	// HTML for the form filler button
	const buttonHtml = `
    <button id="form-filler-button" class="form-filler-button" title="Fill all form fields with default values">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
      <span>Fill Form</span>
    </button>
  `;

	// JavaScript for form filling functionality
	const fillerScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // Create a function to fill the form with sensible default values
        function fillFormWithDefaults() {
          // Get all input elements
          const inputs = document.querySelectorAll('input, select, textarea');
          
          // Record which elements were filled for status feedback
          const filledElements = [];
          
          // Process each input
          inputs.forEach(input => {
            let filled = true;
            
            // Skip hidden inputs and those with existing values
            if (input.type === 'hidden' || (input.value && input.value.trim() !== '')) {
              filled = false;
            }
            // Handle different input types
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
                input.selectedIndex = 1 >= input.options.length ? 0 : 1; // Select second option if available, first otherwise
              }
            } 
            else if (input.tagName === 'TEXTAREA') {
              input.value = 'This is a sample text for the textarea field.';
            } 
            else {
              // For any other input types
              input.value = 'Default Value';
            }
            
            // Add to filled elements if we actually filled it
            if (filled) {
              filledElements.push(input);
              
              // Dispatch input event to trigger any listeners
              const event = new Event('input', { bubbles: true });
              input.dispatchEvent(event);
              
              // For select elements, also dispatch change event
              if (input.tagName === 'SELECT') {
                const changeEvent = new Event('change', { bubbles: true });
                input.dispatchEvent(changeEvent);
              }
            }
          });
          
          // Show a notification about what was filled
          if (filledElements.length > 0) {
            // If an updateCaptchaStatus function exists (from our other demos), use it
            if (typeof window.updateCaptchaStatus === 'function') {
              window.updateCaptchaStatus(\`Filled \${filledElements.length} form fields with default values\`, 'info');
            } else {
              console.log(\`Filled \${filledElements.length} form fields with default values\`);
            }
            
            // Highlight the filled fields briefly
            filledElements.forEach(el => {
              const originalBackground = el.style.backgroundColor;
              const originalTransition = el.style.transition;
              
              el.style.transition = 'background-color 1.5s ease';
              el.style.backgroundColor = '#e3f2fd';
              
              setTimeout(() => {
                el.style.backgroundColor = originalBackground;
                setTimeout(() => {
                  el.style.transition = originalTransition;
                }, 1500);
              }, 500);
            });
          }
        }
        
        // Add the click event listener to the form filler button
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
			enforce: "post", // Run after other HTML transforms
			transform(html: string, ctx: IndexHtmlTransformContext): string {
				// Skip if no HTML body is found
				if (!html.includes("<body") || !html.includes("</body>")) {
					return html;
				}

				// Inject style into the head
				let updatedHtml = html.replace("</head>", `${buttonStyle}</head>`);

				// Inject button and script before closing body tag
				updatedHtml = updatedHtml.replace(
					"</body>",
					`${buttonHtml}${fillerScript}</body>`,
				);

				return updatedHtml;
			},
		},
	};
}
