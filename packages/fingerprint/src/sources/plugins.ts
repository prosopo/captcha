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
type PluginMimeTypeData = {
	type: string;
	suffixes: string;
};

type PluginData = {
	name: string;
	description: string;
	mimeTypes: PluginMimeTypeData[];
};

export default function getPlugins(): PluginData[] | undefined {
	const rawPlugins = navigator.plugins;

	if (!rawPlugins) {
		return undefined;
	}

	const plugins: PluginData[] = [];

	// Safari 10 doesn't support iterating navigator.plugins with for...of
	for (let i = 0; i < rawPlugins.length; ++i) {
		const plugin = rawPlugins[i];
		if (!plugin) {
			continue;
		}

		const mimeTypes: PluginMimeTypeData[] = [];
		for (let j = 0; j < plugin.length; ++j) {
			const mimeType = plugin[j];
			mimeTypes.push({
				type: mimeType.type,
				suffixes: mimeType.suffixes,
			});
		}

		plugins.push({
			name: plugin.name,
			description: plugin.description,
			mimeTypes,
		});
	}

	return plugins;
}
