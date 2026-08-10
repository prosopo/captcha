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

// Converted a chunk at a time rather than byte-by-byte: appending to a single
// string per byte reallocates on every iteration, and spreading the whole
// buffer into String.fromCharCode blows the argument limit (and the stack) on
// large inputs. 0x8000 stays well inside the engine's argument cap.
const CHUNK_SIZE = 0x8000;

/** Encodes an ArrayBuffer as a base64 string. */
export function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
	const bytes = new Uint8Array(arrayBuffer);
	const chunks: string[] = [];
	for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
		chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE)));
	}
	return btoa(chunks.join(""));
}
