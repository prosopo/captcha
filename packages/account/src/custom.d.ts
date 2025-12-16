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
// For all modules ending in the Vite-specific "?raw" query parameter
declare module "*?raw" {
	// The content of the file will be imported as a string.
	const content: string;
	export default content;
}
// 1. Declare the module pattern for any file path ending in "?worker&inline"
declare module "*?worker&inline" {
	// 2. Define the type of the default export.
	// The default export is a constructor function that returns a Worker instance.

	// The syntax is: new () => Worker
	// This tells TypeScript: "This export is a class/constructor that, when called with 'new', produces an object of type Worker."
	const WorkerConstructor: {
		new (): Worker;
		// You can also add constructor overloads if you pass specific options, like { type: "module" }
		new (options?: WorkerOptions): Worker;
	};

	export default WorkerConstructor;
}

// Optional: Add the declaration for the non-inline version just in case
declare module "*?worker" {
	const WorkerConstructor: {
		new (): Worker;
		new (options?: WorkerOptions): Worker;
	};
	export default WorkerConstructor;
}
