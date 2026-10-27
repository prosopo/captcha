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

// Sent by the widget with every provider request. The provider must list both
// in its CORS allowedHeaders before any widget sends them, or the browser
// rejects the preflight and the widget cannot reach the provider.
export const BUNDLE_VERSION_HEADER = "Prosopo-Bundle-Version";
export const BUNDLE_ORIGIN_HEADER = "Prosopo-Bundle-Origin";
