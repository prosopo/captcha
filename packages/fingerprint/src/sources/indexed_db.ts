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
import { isEdgeHTML, isTrident } from "../utils/browser";

export default function getIndexedDB(): boolean | undefined {
	// IE and Edge don't allow accessing indexedDB in private mode, therefore IE and Edge will have different
	// visitor identifier in normal and private modes.
	if (isTrident() || isEdgeHTML()) {
		return undefined;
	}
	try {
		return !!window.indexedDB;
	} catch (e) {
		/* SecurityError when referencing it means it exists */
		return true;
	}
}
