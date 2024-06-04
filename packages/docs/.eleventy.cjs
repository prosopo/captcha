const filters = require('./utils/filters.cjs')
const transforms = require('./utils/transforms.cjs')
const markdownIt = require('markdown-it');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function (eleventyConfig) {
	// Folders to copy to build dir (See. 1.1)
	eleventyConfig.addPassthroughCopy("src/static");
	eleventyConfig.addPassthroughCopy('src/assets/scripts');


	// Filters
	Object.keys(filters).forEach((filterName) => {
		eleventyConfig.addFilter(filterName, filters[filterName])
	})

	// Transforms
	Object.keys(transforms).forEach((transformName) => {
		eleventyConfig.addTransform(transformName, transforms[transformName])
	})

	// This allows Eleventy to watch for file changes during local development.
	eleventyConfig.setUseGitIgnore(false);

	// Get released articles only
	eleventyConfig.addCollection("releasedArticles", function(collectionApi) {

		return collectionApi.getFilteredByTag("article").filter(p => {
			let now = new Date().getTime();
			return now >= p.date.getTime();
		});
	});

	eleventyConfig.addPlugin(syntaxHighlight);
	eleventyConfig.addLayoutAlias('contact', '_layouts/contact.njk');
	eleventyConfig.addLayoutAlias('about', '_layouts/about.njk');

	let options = {
		html: true,
		breaks: false,
		linkify: true,
		langPrefix: "language-",
	};

	eleventyConfig.setLibrary("md", markdownIt(options));
	// Main RSS Plugin Base
	eleventyConfig.addPlugin(pluginRss, {posthtmlRenderOptions: {}});

	// JSON Feed required functions
	eleventyConfig.addJavaScriptFunction("absoluteUrl", pluginRss.absoluteUrl);
	eleventyConfig.addJavaScriptFunction("htmlToAbsoluteUrls", pluginRss.convertHtmlToAbsoluteUrls);
	eleventyConfig.addJavaScriptFunction("dateToRfc3339", pluginRss.dateToRfc3339);

	// Put robots.txt in root
	eleventyConfig.addPassthroughCopy({ 'src/robots.txt': '/robots.txt' });

	return {
		dir: {
			input: "src",
			output: "dist",
			includes: "_includes",
			layouts: "_layouts"
		},
		templateFormats: ["html", "md", "njk"],
		htmlTemplateEngine: "njk",
		markdownTemplateEngine: "njk",

		// 1.1 Enable eleventy to pass dirs specified above
		passthroughFileCopy: true
	};
};
