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
import http from "node:http";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 8080;

const server = http.createServer(
	(req: http.IncomingMessage, res: http.ServerResponse) => {
		console.log(`Received request: ${req.method} ${req.url}`);
		// Do nothing: simulate an unresponsive server
		// Keep the socket open forever
		req.socket.setTimeout(0); // Disable socket timeout
		req.socket.setKeepAlive(true); // Keep the socket alive
		// do nothing, the connection will remain open forever until the client timeouts - if the client does not timeout, the connection will remain open forever

		// Listen for client closing the connection
		req.socket.on("close", () => {
			console.log(`Connection closed by client: ${req.method} ${req.url}`);
		});
	},
);

server.listen(PORT, () => {
	console.log(`http-blackhole server is listening on port ${PORT}`);
});

// Graceful shutdown on Ctrl+C or kill
const shutdown = () => {
	console.log("\nShutting down http-blackhole server...");
	server.close(() => {
		console.log("Server closed. Exiting.");
		process.exit(0);
	});
};

process.on("SIGINT", shutdown); // Ctrl+C
process.on("SIGTERM", shutdown); // kill command or systemd
