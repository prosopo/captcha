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
// Vite plugin to inject navigation into HTML files
import fs from "node:fs";
import path from "node:path";
import {
	type IndexHtmlTransformContext,
	type Plugin,
	normalizePath,
} from "vite";

interface CaptchaTypeDetails {
	path: string;
	exists: boolean;
}

interface CaptchaTypes {
	[key: string]: {
		[key: string]: CaptchaTypeDetails;
	};
}

export default function navigationInjector(): Plugin {
	// Define all pages, including existing and planned
	const pageDefinitions = {
		standard: {
			image: {
				implicit: { path: "image-implicit.html", exists: true },
				explicit: { path: "image-explicit.html", exists: true },
			},
			pow: {
				implicit: { path: "pow-implicit.html", exists: true },
				explicit: { path: "pow-explicit.html", exists: true },
			},
			frictionless: {
				implicit: { path: "frictionless-implicit.html", exists: true },
				explicit: { path: "frictionless-explicit.html", exists: true },
			},
			slider: {
				implicit: { path: "slider-implicit.html", exists: true },
				explicit: { path: "slider-explicit.html", exists: true },
			},
		},
		invisible: {
			image: {
				implicit: { path: "invisible-image-implicit.html", exists: true },
				explicit: { path: "invisible-image-explicit.html", exists: true },
			},
			pow: {
				implicit: { path: "invisible-pow-implicit.html", exists: true },
				explicit: { path: "invisible-pow-explicit.html", exists: true },
			},
			frictionless: {
				implicit: {
					path: "invisible-frictionless-implicit.html",
					exists: true,
				},
				explicit: {
					path: "invisible-frictionless-explicit.html",
					exists: true,
				},
			},
			slider: {
				implicit: { path: "invisible-slider-implicit.html", exists: true },
				explicit: { path: "invisible-slider-explicit.html", exists: true },
			},
		},
	};

	// Style for the navigation bar
	const navStyle = `
    <style>
      .nav-topbar {
        background-color: #2196F3;
        padding: 0;
        margin-bottom: 20px;
        transition: all 0.3s ease;
        overflow: hidden;
        max-height: 500px; /* Initial state - visible */
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      }
      .nav-topbar.collapsed {
        max-height: 50px; /* Collapsed state - only show toggle button and title */
      }
      .nav-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 15px;
        position: relative;
      }
      .nav-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        position: relative;
        z-index: 20;
      }
      .nav-title {
        color: white;
        font-size: 18px;
        font-weight: bold;
        margin: 0;
        display: flex;
        align-items: center;
      }
      .nav-title-text {
        margin-right: 10px;
      }
      .nav-title-hint {
        font-size: 14px;
        font-weight: normal;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .collapsed .nav-title-hint {
        opacity: 0.8;
      }
      .nav-toggle {
        background-color: rgba(0,0,0,0.1);
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 4px;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nav-toggle:hover {
        background-color: rgba(0,0,0,0.2);
      }
      .nav-toggle-icon {
        width: 24px;
        height: 24px;
        display: inline-block;
        position: relative;
      }
      .nav-toggle-icon svg {
        position: absolute;
        top: 0;
        left: 0;
        transition: opacity 0.3s ease;
      }
      .nav-toggle-icon .icon-collapse {
        opacity: 1;
      }
      .nav-toggle-icon .icon-expand {
        opacity: 0;
      }
      .collapsed .nav-toggle-icon .icon-collapse {
        opacity: 0;
      }
      .collapsed .nav-toggle-icon .icon-expand {
        opacity: 1;
      }
      .nav-content {
        padding: 0 0 15px 0;
        transition: opacity 0.3s ease;
      }
      .collapsed .nav-content {
        opacity: 0;
      }
      .nav-row {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 15px;
      }
      .nav-group {
        flex: 1;
        min-width: 250px;
        margin-bottom: 10px;
        margin-right: 20px;
      }
      .nav-group-title {
        color: rgba(255,255,255,0.8);
        font-size: 0.9em;
        margin: 0 0 5px 0;
        text-transform: uppercase;
        font-weight: 500;
      }
      .nav-group-links {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .nav-group-links li {
        margin: 5px 0;
      }
      .nav-group-links a {
        color: white;
        text-decoration: none;
        font-weight: bold;
        padding: 5px 0;
        display: inline-block;
      }
      .nav-group-links a:hover {
        text-decoration: underline;
      }
      .nav-group-links .active {
        border-bottom: 2px solid white;
      }
      .nav-group-links .disabled {
        color: rgba(255,255,255,0.5);
        cursor: not-allowed;
      }
      
      @media (max-width: 768px) {
        .nav-row {
          flex-direction: column;
        }
        .nav-title-hint {
          display: none;
        }
      }
    </style>
  `;

	// JavaScript for toggling navigation
	const navScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toggleBtn = document.getElementById('nav-toggle');
        const navBar = document.getElementById('nav-topbar');
        const navHeader = document.getElementById('nav-header');
        
        // Check if navigation was previously collapsed
        const navCollapsed = localStorage.getItem('navCollapsed') === 'true';
        if (navCollapsed) {
          navBar.classList.add('collapsed');
        }
        
        // Function to expand the navigation
        function expandNav() {
          if (navBar.classList.contains('collapsed')) {
            navBar.classList.remove('collapsed');
            localStorage.setItem('navCollapsed', 'false');
          }
        }
        
        // Function to collapse the navigation
        function collapseNav() {
          if (!navBar.classList.contains('collapsed')) {
            navBar.classList.add('collapsed');
            localStorage.setItem('navCollapsed', 'true');
          }
        }
        
        // Function to toggle the navigation
        function toggleNav() {
          navBar.classList.toggle('collapsed');
          localStorage.setItem('navCollapsed', navBar.classList.contains('collapsed'));
        }
        
        // Toggle on button click
        toggleBtn.addEventListener('click', function(e) {
          e.stopPropagation(); // Prevent header click from firing
          toggleNav();
        });
        
        // Expand on toggle button hover when collapsed
        toggleBtn.addEventListener('mouseenter', function() {
          if (navBar.classList.contains('collapsed')) {
            expandNav();
          }
        });
        
        // Toggle on header click
        navHeader.addEventListener('click', function(e) {
          // Don't toggle if a link within the header was clicked
          if (e.target.tagName === 'A') {
            return;
          }
          toggleNav();
        });
        
        // Make the header appear clickable with cursor style
        navHeader.style.cursor = 'pointer';
      });
    </script>
  `;

	return {
		name: "navigation-injector",
		transformIndexHtml: {
			enforce: "pre",
			transform(html: string, ctx: IndexHtmlTransformContext): string {
				// Get the relative path from the root
				const relativePath = ctx.filename
					? normalizePath(path.relative(process.cwd(), ctx.filename))
					: "";

				// Extract the page path relative to src or dist directory
				let pagePath = "";
				const srcDir = "src/";
				const distDir = "dist/";

				if (relativePath.includes(srcDir)) {
					pagePath = relativePath.substring(
						relativePath.indexOf(srcDir) + srcDir.length,
					);
				} else if (relativePath.includes(distDir)) {
					pagePath = relativePath.substring(
						relativePath.indexOf(distDir) + distDir.length,
					);
				}

				console.log(`Processing file: ${relativePath}, pagePath: ${pagePath}`);

				// Build navigation structure
				const standardNav = buildCaptchaNavGroup(
					"Standard Captchas",
					pageDefinitions.standard,
					pagePath,
				);
				const invisibleNav = buildCaptchaNavGroup(
					"Invisible Captchas",
					pageDefinitions.invisible,
					pagePath,
				);

				const navHtml = `
          <div id="nav-topbar" class="nav-topbar">
            <div class="nav-container">
              <div id="nav-header" class="nav-header">
                <h1 class="nav-title">
                  <span class="nav-title-text">Procaptcha Demo Playground</span>
                  <span class="nav-title-hint">(Click anywhere to see more examples)</span>
                </h1>
                <button id="nav-toggle" class="nav-toggle" aria-label="Toggle navigation">
                  <span class="nav-toggle-icon">
                    <svg class="icon-collapse" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    <svg class="icon-expand" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>
              </div>
              <div class="nav-content">
                <div class="nav-row">
                  ${standardNav}
                  ${invisibleNav}
                </div>
              </div>
            </div>
          </div>
        `;

				// Replace environment variables
				const bundleUrl =
					process.env.VITE_BUNDLE_URL ||
					"https://staging-js.prosopo.io/js/procaptcha.bundle.js";

				console.log(`Using bundle URL: ${bundleUrl}`);
				html = html.replace(/%VITE_BUNDLE_URL%/g, bundleUrl);

				// Replace other environment variables
				if (process.env.PROSOPO_SITE_KEY) {
					html = html.replace(
						/%PROSOPO_SITE_KEY%/g,
						process.env.PROSOPO_SITE_KEY,
					);
				}
				if (process.env.PROSOPO_SERVER_URL) {
					html = html.replace(
						/%PROSOPO_SERVER_URL%/g,
						process.env.PROSOPO_SERVER_URL,
					);
				}

				// Inject navigation after <body> tag and script before </body>
				if (html.includes("<body>") && html.includes("</body>")) {
					return html
						.replace("</head>", `${navStyle}</head>`)
						.replace("<body>", `<body>\n${navHtml}`)
						.replace("</body>", `${navScript}\n</body>`);
				}

				return html;
			},
		},
	};

	// Helper function to build a navigation group for each captcha type
	function buildCaptchaNavGroup(
		title: string,
		captchaTypes: CaptchaTypes,
		currentPath: string,
	): string {
		const navGroups: string[] = [];

		for (const [typeName, captchaType] of Object.entries(captchaTypes)) {
			const typeTitle = typeName.charAt(0).toUpperCase() + typeName.slice(1);
			const links: string[] = [];

			for (const [implName, implDetails] of Object.entries(captchaType)) {
				const pagePath = implDetails.path;
				const pageExists = implDetails.exists;

				// Calculate relative path
				let href: string;
				if (currentPath.includes("/")) {
					// We're in a subdirectory
					const depth = (currentPath.match(/\//g) || []).length;
					href = "../".repeat(depth) + pagePath;
				} else {
					// We're in the src root
					href = pagePath;
				}

				// Mark current page as active and check if the file exists
				const isActive = currentPath === pagePath;
				const implTitle = implName.charAt(0).toUpperCase() + implName.slice(1);

				let linkHtml: string;
				if (pageExists) {
					const activeClass = isActive ? ' class="active"' : "";
					linkHtml = `<a href="${href}"${activeClass}>${implTitle}</a>`;
				} else {
					linkHtml = `<span class="disabled" title="Coming Soon">${implTitle}</span>`;
				}

				links.push(`<li>${linkHtml}</li>`);
			}

			navGroups.push(`
        <div class="nav-group">
          <div class="nav-group-title">${typeTitle}</div>
          <ul class="nav-group-links">
            ${links.join("\n            ")}
          </ul>
        </div>
      `);
		}

		return `
      <div class="nav-section">
        <h3 style="color: white; margin: 0 0 10px 0;">${title}</h3>
        <div class="nav-row">
          ${navGroups.join("\n          ")}
        </div>
      </div>
    `;
	}
}
