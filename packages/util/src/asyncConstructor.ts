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

// biome-ignore lint/suspicious/noExplicitAny: has to be any
export type Constructor<T> = new (...args: any[]) => T;

// Construct a new instance of a class by calling its constructor and then calling its async constructor method.
// The asyncConstructor() method takes the same parameters as the constructor to avoid having to hold temporary values between constructor and asyncConstructor invocation.
export async function anew<
	T extends {
		// Asynchronously initialise an object
		ctor(...args: ConstructorParameters<Constructor<T>>): Promise<void>;
	},
>(Clas: Constructor<T>, ...args: ConstructorParameters<Constructor<T>>) {
	// construct instance via normal constructor (non-async)
	const inst = new Clas(...args);
	// call async constructor with the same args as the normal ctor
	await inst.ctor(...args);
	return inst;
}
