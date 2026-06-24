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
import { MongoBinary } from "mongodb-memory-server";

// Pre-download the mongod binary once, in the parent process, before the test
// forks spawn. The integration tests each call `MongoMemoryServer.create()` in
// isolated fork processes; on a clean environment (e.g. CI) those forks would
// otherwise race to download the same binary concurrently, tripping the flaky
// lockfile mechanism in mongodb-memory-server and intermittently failing with
// lockfile errors. Ensuring the binary exists up-front means the forks always
// find it cached on disk and never download in parallel.
export default async function setup(): Promise<void> {
	await MongoBinary.getPath();
}
