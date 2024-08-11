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
export default {
	includeVersion: true,
	darkHighlightTheme: "material-theme-darker",
	searchInComments: true,
	excludeExternals: true,
	commentStyle: "all",
	skipErrorChecking: true, // skips errors from package dependency resolution. TODO remove this and get dependencies working
	// treatWarningsAsErrors: true, // TODO enable these when dependency resolution is fixed
	// treatValidationWarningsAsErrors: true, // TODO enable these when dependency resolution is fixed
};
