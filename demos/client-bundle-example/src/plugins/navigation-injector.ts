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

interface CaptchaType {
	[key: string]: CaptchaTypeDetails;
}

interface CaptchaTypes {
	[key: string]: CaptchaType;
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
        max-height: 500px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
      .nav-topbar.collapsed {
        max-height: 60px;
      }
      .nav-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
        position: relative;
      }
      .nav-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        position: relative;
        z-index: 20;
      }
      .nav-title {
        color: white;
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .nav-title-text {
        margin-right: 8px;
      }
      .nav-title-hint {
        font-size: 0.875rem;
        font-weight: normal;
        opacity: 0;
        transition: opacity 0.3s ease;
        color: rgba(255,255,255,0.8);
      }
      .collapsed .nav-title-hint {
        opacity: 0.8;
      }
      .nav-toggle {
        background-color: rgba(255,255,255,0.1);
        color: white;
        border: none;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 6px;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
      }
      .nav-toggle:hover {
        background-color: rgba(255,255,255,0.2);
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
        padding: 0 0 20px 0;
        transition: opacity 0.3s ease;
      }
      .collapsed .nav-content {
        opacity: 0;
      }
      .nav-sections {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
      }
      .nav-section {
        flex: 1;
        min-width: 280px;
      }
      .nav-section h3 {
        color: white;
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.2);
      }
      .nav-group {
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .nav-group-title {
        color: rgba(255,255,255,0.9);
        font-size: 0.875rem;
        font-weight: 500;
        margin: 0 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .nav-group-links {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .nav-group-links li {
        margin: 6px 0;
      }
      .nav-group-links a {
        color: white;
        text-decoration: none;
        font-weight: 500;
        padding: 6px 8px;
        display: inline-block;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }
      .nav-group-links a:hover {
        background-color: rgba(255,255,255,0.2);
      }
      .nav-group-links .active {
        background-color: rgba(255,255,255,0.2);
        font-weight: 600;
      }
      .nav-group-links .disabled {
        color: rgba(255,255,255,0.5);
        cursor: not-allowed;
        opacity: 0.7;
      }
      
      @media (max-width: 768px) {
        .nav-container {
          padding: 0 16px;
        }
        .nav-title {
          font-size: 1.125rem;
        }
        .nav-title-hint {
          display: none;
        }
        .nav-sections {
          flex-direction: column;
          gap: 16px;
        }
        .nav-section {
          min-width: 100%;
        }
        .nav-section h3 {
          font-size: 0.875rem;
        }
        .nav-group {
          padding: 10px;
        }
        .nav-group-title {
          font-size: 0.8125rem;
        }
        .nav-group-links a {
          padding: 8px 10px;
          width: 100%;
        }
      }
      
      @media (max-width: 480px) {
        .nav-topbar {
          max-height: 60px;
        }
        .nav-topbar.collapsed {
          max-height: 60px;
        }
        .nav-title {
          font-size: 1rem;
        }
        .nav-toggle {
          padding: 6px 10px;
        }
      }
      
      .nav-group-dropdown {
        position: relative;
        display: inline-block;
      }
      
      .nav-group-dropdown-btn {
        background: none;
        border: none;
        color: white;
        font-weight: 500;
        padding: 6px 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }
      
      .nav-group-dropdown-btn:hover {
        background-color: rgba(255,255,255,0.2);
      }
      
      .nav-group-dropdown-btn svg {
        width: 16px;
        height: 16px;
        transition: transform 0.2s ease;
      }
      
      .nav-group-dropdown-btn.open svg {
        transform: rotate(180deg);
      }
      
      .nav-group-dropdown-content {
        display: none;
        position: absolute;
        background-color: rgba(33, 150, 243, 0.95);
        min-width: 160px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        z-index: 1;
        border-radius: 4px;
        padding: 8px 0;
        margin-top: 4px;
      }
      
      .nav-group-dropdown-btn.open + .nav-group-dropdown-content {
        display: block;
      }
      
      .nav-group-dropdown-content a {
        color: white;
        padding: 8px 16px;
        text-decoration: none;
        display: block;
        transition: background-color 0.2s ease;
      }
      
      .nav-group-dropdown-content a:hover {
        background-color: rgba(255,255,255,0.2);
      }
      
      .nav-group-dropdown-content a.active {
        background-color: rgba(255,255,255,0.2);
        font-weight: 600;
      }
      
      @media (max-width: 768px) {
        .nav-group-dropdown-content {
          position: static;
          box-shadow: none;
          background-color: rgba(255,255,255,0.1);
          margin-top: 8px;
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
        const isMobile = window.innerWidth <= 768;
        
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
          e.stopPropagation();
          toggleNav();
        });
        
        // Expand on toggle button hover when collapsed (desktop only)
        if (!isMobile) {
          toggleBtn.addEventListener('mouseenter', function() {
            if (navBar.classList.contains('collapsed')) {
              expandNav();
            }
          });
        }
        
        // Toggle on header click
        navHeader.addEventListener('click', function(e) {
          if (e.target.tagName === 'A') {
            return;
          }
          toggleNav();
        });
        
        // Make the header appear clickable with cursor style
        navHeader.style.cursor = 'pointer';
        
        // Handle window resize
        window.addEventListener('resize', function() {
          const newIsMobile = window.innerWidth <= 768;
          if (newIsMobile !== isMobile) {
            if (newIsMobile) {
              // On mobile, collapse the nav by default
              collapseNav();
            } else {
              // On desktop, expand the nav by default
              expandNav();
            }
          }
        });
        
        // Handle dropdown toggles
        document.querySelectorAll('.nav-group-dropdown-btn').forEach(button => {
          button.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('open');
          });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
          if (!e.target.closest('.nav-group-dropdown')) {
            document.querySelectorAll('.nav-group-dropdown-btn').forEach(button => {
              button.classList.remove('open');
            });
          }
        });
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
                <div class="nav-sections">
                  ${standardNav}
                  ${invisibleNav}
                </div>
              </div>
            </div>
          </div>
        `;

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

			// Create simple buttons for each implementation
			for (const [implName, implDetails] of Object.entries(captchaType as CaptchaType)) {
				const pagePath = implDetails.path;
				const pageExists = implDetails.exists;
				const implTitle = implName.charAt(0).toUpperCase() + implName.slice(1);

				// Calculate relative path
				let href: string;
				if (currentPath.includes("/")) {
					const depth = (currentPath.match(/\//g) || []).length;
					href = "../".repeat(depth) + pagePath;
				} else {
					href = pagePath;
				}

				if (pageExists) {
					const activeClass = currentPath === pagePath ? ' class="active"' : '';
					links.push(`<a href="${href}"${activeClass}>${implTitle}</a>`);
				} else {
					links.push(`<span class="disabled" title="Coming Soon">${implTitle}</span>`);
				}
			}

			navGroups.push(`
        <div class="nav-group">
          <div class="nav-group-title">${typeTitle}</div>
          <div class="nav-group-links">
            ${links.join('\n            ')}
          </div>
        </div>
      `);
		}

		return `
      <div class="nav-section">
        <h3>${title}</h3>
        <div class="nav-row">
          ${navGroups.join("\n          ")}
        </div>
      </div>
    `;
	}
}