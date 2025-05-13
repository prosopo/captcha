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

import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

// Define types for links
type FileLink = {
	filePath: string;
	line: number;
	url: string;
	isInternal: boolean;
	needsTrailingSlash: boolean;
	originalText?: string; // The original text containing the URL
	replacementText?: string; // The text with trailing slash added
};

// Define the mode (check or fix)
enum Mode {
	CHECK = "check",
	FIX = "fix",
}

/**
 * Finds the workspace root directory (captcha-private)
 */
const findWorkspaceRoot = (): string => {
	const currentDir = process.cwd();
	const lintDirPattern = /(.+)\/captcha\/dev\/lint$/;
	const match = currentDir.match(lintDirPattern);

	if (match?.[1]) {
		return match[1];
	}

	const websitePath = path.join(currentDir, "packages", "prosopo-website");
	if (fs.existsSync(websitePath)) {
		return currentDir;
	}

	let dir = currentDir;
	const maxDepth = 5;

	for (let i = 0; i < maxDepth; i++) {
		const packageJsonPath = path.join(dir, "package.json");

		if (fs.existsSync(packageJsonPath)) {
			try {
				const packageJson = JSON.parse(
					fs.readFileSync(packageJsonPath, "utf8"),
				);
				if (packageJson.name === "@prosopo/captcha-private") {
					return dir;
				}
			} catch (e) {
				// Continue if there's an error
			}
		}

		const parentDir = path.dirname(dir);
		if (parentDir === dir) {
			// We've reached the root of the filesystem
			break;
		}

		dir = parentDir;
	}

	// If all approaches fail, warn but return current directory
	console.warn(
		"Warning: Could not find workspace root. Using current directory.",
	);
	return currentDir;
};

/**
 * Check if a URL is an internal link
 * @param url - The URL to check
 * @returns boolean indicating whether the URL is an internal link
 */
const isInternalLink = (url: string): boolean => {
	// Skip empty URLs, fragments, and mailto links
	if (!url || url.startsWith("#") || url.startsWith("mailto:")) {
		return false;
	}

	// Internal links don't start with a protocol (unless they go to prosopo.io)
	const hasProtocol = url.startsWith("http://") || url.startsWith("https://");

	if (!hasProtocol) {
		return true; // No protocol means internal link
	}

	// If it has a protocol but points to prosopo.io, it's still internal
	return url.includes("prosopo.io");
};

/**
 * Check if a URL needs a trailing slash
 * @param url - The URL to check
 * @returns boolean indicating whether the URL should have a trailing slash
 */
const needsTrailingSlash = (url: string): boolean => {
	// URLs that already end with a slash are fine
	if (url.endsWith("/")) {
		return false;
	}

	// Skip URLs with fragments
	if (url.includes("#")) {
		return false;
	}

	// Skip URLs with query parameters
	if (url.includes("?")) {
		return false;
	}

	// Skip Nunjucks template variables - URLs containing {{ }} syntax
	if (url.includes("{{") && url.includes("}}")) {
		return false;
	}

	// Skip URLs that end with file extensions
	const fileExtensions = [
		".html",
		".htm",
		".xml",
		".json",
		".js",
		".css",
		".jpg",
		".jpeg",
		".png",
		".gif",
		".pdf",
		".svg",
		".txt",
	];
	if (fileExtensions.some((ext) => url.endsWith(ext))) {
		return false;
	}

	return true;
};

/**
 * Extract links from markdown format
 * @param content - The file content
 * @returns Array of URLs and their line numbers
 */
const extractMarkdownLinks = (
	content: string,
): { url: string; line: number; originalText: string }[] => {
	const links: { url: string; line: number; originalText: string }[] = [];
	const lines = content.split("\n");

	// Regex for markdown links: [text](url)
	const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

	lines.forEach((line, index) => {
		let match: RegExpExecArray | null;
		match = markdownLinkRegex.exec(line);
		while (match !== null) {
			if (match[2]) {
				const urlPart = match[2];
				// Handle cases with title: [text](url "title") by getting the first part
				const url = urlPart.split(" ")[0];
				if (url) {
					links.push({
						url,
						line: index + 1, // +1 because line numbers are 1-indexed
						originalText: match[0],
					});
				}
			}
			match = markdownLinkRegex.exec(line);
		}
	});

	return links;
};

/**
 * Extract links from HTML format
 * @param content - The file content
 * @returns Array of URLs and their line numbers
 */
const extractHtmlLinks = (
	content: string,
): { url: string; line: number; originalText: string }[] => {
	const links: { url: string; line: number; originalText: string }[] = [];
	const lines = content.split("\n");

	// Regex for HTML links: <a href="url">
	const htmlLinkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/g;

	lines.forEach((line, index) => {
		let match: RegExpExecArray | null;
		match = htmlLinkRegex.exec(line);
		while (match !== null) {
			if (match[1]) {
				const url = match[1];
				links.push({
					url,
					line: index + 1,
					originalText: match[0],
				});
			}
			match = htmlLinkRegex.exec(line);
		}
	});

	return links;
};

/**
 * Extract all links from a file (both markdown and HTML)
 * @param filePath - The path to the file
 * @returns Array of links with file path, line number, and URL
 */
const extractLinksFromFile = async (filePath: string): Promise<FileLink[]> => {
	try {
		const content = fs.readFileSync(filePath, "utf8");

		// Get all links from both Markdown and HTML formats
		// (both formats could exist in either file type)
		const mdLinks = extractMarkdownLinks(content);
		const htmlLinks = extractHtmlLinks(content);

		// Combine links and check if they're internal and need trailing slashes
		const allLinks = [...mdLinks, ...htmlLinks].map((link) => {
			const internal = isInternalLink(link.url);
			const needsSlash = internal && needsTrailingSlash(link.url);

			// Create replacement text if needed
			let replacementText = link.originalText;
			if (needsSlash) {
				const urlWithSlash = `${link.url}/`;
				if (link.originalText.includes(`"${link.url}"`)) {
					replacementText = link.originalText.replace(
						`"${link.url}"`,
						`"${urlWithSlash}"`,
					);
				} else if (link.originalText.includes(`'${link.url}'`)) {
					replacementText = link.originalText.replace(
						`'${link.url}'`,
						`'${urlWithSlash}'`,
					);
				} else if (link.originalText.includes(`(${link.url})`)) {
					replacementText = link.originalText.replace(
						`(${link.url})`,
						`(${urlWithSlash})`,
					);
				} else if (link.originalText.includes(`(${link.url} `)) {
					replacementText = link.originalText.replace(
						`(${link.url} `,
						`(${urlWithSlash} `,
					);
				}
			}

			return {
				filePath,
				line: link.line,
				url: link.url,
				isInternal: internal,
				needsTrailingSlash: needsSlash,
				originalText: link.originalText,
				replacementText: replacementText,
			};
		});

		return allLinks;
	} catch (error) {
		console.error(`Error extracting links from ${filePath}:`, error);
		return [];
	}
};

/**
 * Find all markdown and nunjucks template files in the specified directory
 * @param targetDir - The directory to search in
 * @returns Array of file paths
 */
export const findTemplateFiles = async (
	targetDir: string,
): Promise<string[]> => {
	const srcPath = path.join(targetDir, "src");

	// Verify the path exists
	if (!fs.existsSync(srcPath)) {
		console.error(`Directory does not exist: ${srcPath}`);
		return [];
	}

	const filePatterns = ["**/*.md", "**/*.njk"];

	console.log(`Searching for template files in: ${srcPath}`);

	try {
		// Use fast-glob to find all .md and .njk files
		const files = await fg(filePatterns, {
			cwd: srcPath,
			onlyFiles: true,
			absolute: true,
		});

		return files;
	} catch (error) {
		console.error("Error finding template files:", error);
		return [];
	}
};

/**
 * Fix a file by adding trailing slashes to URLs
 * @param filePath - Path to the file
 * @param linksToFix - Links that need fixing in this file
 */
const fixFile = (filePath: string, linksToFix: FileLink[]): void => {
	if (linksToFix.length === 0) return;

	try {
		// Read the file content
		const content = fs.readFileSync(filePath, "utf8");

		// Group links by line number to handle multiple fixes per line
		const lineGroups = linksToFix.reduce<{ [key: number]: FileLink[] }>(
			(groups, link) => {
				const line = link.line;
				if (!groups[line]) {
					groups[line] = [];
				}
				groups[line].push(link);
				return groups;
			},
			{},
		);

		// Split content into lines
		const lines = content.split("\n");

		// Process each line that needs fixes, starting from the bottom
		// (to avoid offsets changing when we modify earlier lines)
		const lineNumbers = Object.keys(lineGroups)
			.map(Number)
			.sort((a, b) => b - a);

		for (const lineNumber of lineNumbers) {
			const linksInLine = lineGroups[lineNumber];
			if (!linksInLine) continue;

			// Get the line content
			const lineIndex = lineNumber - 1; // -1 because arrays are 0-indexed
			if (lineIndex < 0 || lineIndex >= lines.length) continue;

			let lineContent = lines[lineIndex];
			if (typeof lineContent !== "string") continue;

			// Apply all replacements for this line
			for (const link of linksInLine) {
				if (
					link.originalText &&
					link.replacementText &&
					link.originalText !== link.replacementText
				) {
					lineContent = lineContent.replace(
						link.originalText,
						link.replacementText,
					);
				}
			}

			// Update the line in the content
			lines[lineIndex] = lineContent;
		}

		// Join lines back into content
		const updatedContent = lines.join("\n");

		// Write the updated content back to the file
		if (content !== updatedContent) {
			fs.writeFileSync(filePath, updatedContent);
			console.log(`Fixed file: ${filePath}`);
		}
	} catch (error) {
		console.error(`Error fixing file ${filePath}:`, error);
	}
};

/**
 * Main function to run the redirect linting
 */
const main = async (): Promise<void> => {
	try {
		// Determine the mode (check or fix)
		const mode: Mode = process.argv[2] === "fix" ? Mode.FIX : Mode.CHECK;

		// Find the workspace root directory
		const workspaceRoot = findWorkspaceRoot();

		// The directory to check is the argument after the mode
		const targetDir = process.argv[mode === Mode.FIX ? 3 : 2];

		if (!targetDir) {
			console.error("Please provide a target directory as an argument");
			process.exit(1);
		}

		// Resolve the target directory relative to the workspace root
		const absolutePath = path.resolve(workspaceRoot, targetDir);
		console.log(`Workspace root: ${workspaceRoot}`);
		console.log(`Checking redirects in: ${absolutePath}`);
		console.log(`Mode: ${mode === Mode.FIX ? "FIX" : "CHECK"}`);

		// Find all template files
		const files = await findTemplateFiles(absolutePath);

		console.log(`\nFound ${files.length} template files.`);

		// Extract links from all files
		const allLinks: FileLink[] = [];
		for (const file of files) {
			const fileLinks = await extractLinksFromFile(file);
			allLinks.push(...fileLinks);
		}

		// Filter to only internal links
		const internalLinks = allLinks.filter((link) => link.isInternal);

		// Filter to links missing trailing slashes
		const linksWithoutSlash = allLinks.filter(
			(link) => link.needsTrailingSlash,
		);

		console.log(`\nFound ${internalLinks.length} internal links.`);

		if (linksWithoutSlash.length > 0) {
			if (mode === Mode.FIX) {
				console.log(
					`\n🔧 Fixing ${linksWithoutSlash.length} URLs without trailing slashes:`,
				);

				// Group links by file path for efficient fixing
				const fileGroups: Record<string, FileLink[]> = {};

				// Populate the file groups
				for (const link of linksWithoutSlash) {
					const filePath = link.filePath;
					if (!fileGroups[filePath]) {
						fileGroups[filePath] = [];
					}
					fileGroups[filePath].push(link);
				}

				// Fix each file
				for (const filePath of Object.keys(fileGroups)) {
					const linksToFix = fileGroups[filePath];
					if (linksToFix && linksToFix.length > 0) {
						fixFile(filePath, linksToFix);
					}
				}

				console.log(
					`\n✅ Fixed ${linksWithoutSlash.length} URLs in ${Object.keys(fileGroups).length} files.`,
				);
			} else {
				console.error("\n❌ ERROR: Found URLs without trailing slashes:");

				for (const link of linksWithoutSlash) {
					const relativePath = path.relative(workspaceRoot, link.filePath);
					console.error(
						`  - ${relativePath}:${link.line} - ${link.url} (should be ${link.url}/)`,
					);
				}

				console.error(
					`\n❌ Total URLs missing trailing slashes: ${linksWithoutSlash.length}`,
				);
				console.error(
					"\n❌ Linting failed! Please add trailing slashes to all internal URLs.",
				);
				console.error(
					'\n💡 Run "npm run lint-fix:redirects" to automatically fix these issues.',
				);
				process.exit(1);
			}
		} else {
			console.log("\n✅ All internal URLs have proper trailing slashes.");
			console.log("\n✅ Linting passed!");
		}
	} catch (error) {
		console.error("Error running redirects lint:", error);
		process.exit(1);
	}
};

// Run the main function
main();
