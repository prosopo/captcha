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
import dotenv from "dotenv";
import {
	createBlackholeServer,
	createShutdown,
	resolvePort,
} from "./blackhole.js";

dotenv.config();

const PORT = resolvePort(process.env.PORT);

const server = createBlackholeServer(console);

server.listen(PORT, () => {
	console.log(`http-blackhole server is listening on port ${PORT}`);
});

// Graceful shutdown on Ctrl+C or kill
const shutdown = createShutdown(server, console, (code: number) => {
	process.exit(code);
});

process.on("SIGINT", shutdown); // Ctrl+C
process.on("SIGTERM", shutdown); // kill command or systemd
