// Vite plugin to inject navigation into HTML files
import fs from 'fs';
import path from 'path';
import { normalizePath, Plugin, IndexHtmlTransformContext } from 'vite';

export default function navigationInjector(): Plugin {
  // Map of demo pages and their names
  const pageNames: Record<string, string> = {
    'index.html': 'Standard',
    'pow.html': 'Proof of Work',
    'frictionless.html': 'Frictionless',
    'invisible/frictionless-implicit.html': 'Invisible Frictionless',
    'invisible/pow.html': 'Invisible PoW'
  };

  // Style for the navigation bar
  const navStyle = `
    <style>
      .nav-topbar {
        background-color: #2196F3;
        padding: 10px 0;
        margin-bottom: 20px;
      }
      .nav-topbar ul {
        display: flex;
        justify-content: center;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .nav-topbar li {
        margin: 0 15px;
      }
      .nav-topbar a {
        color: white;
        text-decoration: none;
        font-weight: bold;
      }
      .nav-topbar a:hover {
        text-decoration: underline;
      }
      .nav-topbar .active {
        border-bottom: 2px solid white;
      }
    </style>
  `;

  return {
    name: 'navigation-injector',
    transformIndexHtml: {
      enforce: 'pre',
      transform(html: string, ctx: IndexHtmlTransformContext): string {
        // Get the relative path from the root
        const relativePath = ctx.filename ? normalizePath(path.relative(process.cwd(), ctx.filename)) : '';
        
        // Extract the page path relative to src directory
        const srcDir = 'src/';
        let pagePath = '';
        
        if (relativePath.includes(srcDir)) {
          pagePath = relativePath.substring(relativePath.indexOf(srcDir) + srcDir.length);
        }
        
        // Create navigation HTML
        const navLinks: string[] = [];
        
        for (const [page, name] of Object.entries(pageNames)) {
          // Calculate relative path
          let href;
          if (pagePath.includes('/')) {
            // We're in a subdirectory
            href = '../' + page;
          } else {
            // We're in the src root
            href = page;
          }
          
          // Mark current page as active
          const isActive = pagePath === page;
          const activeClass = isActive ? ' class="active"' : '';
          
          navLinks.push(`<li><a href="${href}"${activeClass}>${name}</a></li>`);
        }
        
        const navHtml = `
          <div class="nav-topbar">
            <ul>
              ${navLinks.join('\n              ')}
            </ul>
          </div>
        `;
        
        // Inject navigation after <body> tag
        if (html.includes('<body>')) {
          return html
            .replace('</head>', `${navStyle}</head>`)
            .replace('<body>', `<body>\n${navHtml}`);
        }
        
        return html;
      }
    }
  };
} 