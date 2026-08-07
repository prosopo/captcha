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

// Vite-specific worker imports: "?worker&inline" bundles the worker and inlines
// it (as a blob) into the consuming bundle, so no separate chunk file needs to
// be resolved at build time. The default export is a Worker constructor.
declare module "*?worker&inline" {
	const WorkerConstructor: {
		new (): Worker;
		new (options?: WorkerOptions): Worker;
	};

	export default WorkerConstructor;
}

declare module "*?worker" {
	const WorkerConstructor: {
		new (): Worker;
		new (options?: WorkerOptions): Worker;
	};

	export default WorkerConstructor;
}
