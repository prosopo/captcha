import path from "node:path";
// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";

const moduleDirs = [path.resolve("./node_modules")];

export default (mode: string) => {
	const isProduction = mode === "production";
	const libraryName = "react_app";

	return {
		resolve: {
			extensions: [".js", ".jsx", ".ts", ".tsx"],
			extensionAlias: {
				".js": [".js", ".ts"],
			},
			modules: moduleDirs,
			fullySpecified: false,
			alias: {
				"@polkadot/x-textdecoder": path.resolve(
					"../../node_modules/@polkadot/util/node_modules/@polkadot/x-textdecoder",
				),
				"@polkadot/x-textencoder": path.resolve(
					"../../node_modules/@polkadot/util/node_modules/@polkadot/x-textencoder",
				),
			},
		},
		externals: {
			"node:url": "commonjs url",
			url: "commonjs url",
		},
		entry: "./src/index.tsx",
		output: {
			filename: `${libraryName}.[name].bundle.js`,
			path: path.resolve("./dist"),
			publicPath: "/",
		},
		module: {
			rules: [
				// instead of using .babelrc, we can use babel-loader options
				{
					test: /\.(m?js|jsx|tsx|ts)$/,
					exclude: /node_modules/,
					use: {
						loader: "babel-loader",
						options: {
							plugins: [
								"@babel/plugin-transform-runtime",
								"@babel/transform-class-properties",
								"@babel/transform-object-rest-spread",
								"@babel/plugin-transform-react-jsx",
								[
									"@babel/plugin-syntax-import-attributes",
									{ deprecatedAssertSyntax: true },
								],
							],
							presets: ["@babel/preset-env", "@babel/preset-typescript"],
						},
					},
				},
				{
					include: /node_modules|src/,
					test: /\.css$/,
					resolve: {
						fullySpecified: false,
					},
					sideEffects: true,
					use: [
						MiniCssExtractPlugin.loader,
						{
							loader: require.resolve("css-loader"),
							options: {
								url: false,
							},
						},
					],
				},
				{
					test: /locale\.json$/, // match JSON files to optimize
					loader: "webpack-json-access-optimizer",
				},
				// Fix for import.meta.url
				{
					test: /packageInfo.js$/,
					loader: "string-replace-loader",
					options: {
						search: /import\.meta && import\.meta\.url/g,
						replace: "false",
					},
				},
			],
		},

		plugins: [
			new NodePolyfillPlugin(),
			new HtmlWebpackPlugin({
				template: "./src/index.html",
			}),
			new MiniCssExtractPlugin({
				filename: "extr.[contenthash].css",
			}),
		],
		optimization: {
			noEmitOnErrors: true,
			minimize: isProduction,
			minimizer: isProduction
				? [
						new TerserPlugin({
							terserOptions: {
								compress: {
									drop_console: true,
								},
							},
						}),
					]
				: [],
			usedExports: true,
		},
	};
};
