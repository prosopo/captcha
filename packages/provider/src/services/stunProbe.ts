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

import { type Socket, createConnection, isIPv4 } from "node:net";
import { Address6 } from "ip-address";
import { z } from "zod";

// Wire format: protect/tcp-probe/stun-probe/src/lookup.rs.
const MAGIC = Buffer.from("SPv1");
const REQUEST_LEN = 22;
const LOOKUP_TIMEOUT_MS = 100;
const MAX_RESPONSE_LEN = 4096;

const StunProbeResponseSchema = z.discriminatedUnion("hit", [
	z.object({
		v: z.literal(1),
		hit: z.literal(true),
		count: z.number().int().min(0),
		first_ms: z.number().int().min(0),
		last_ms: z.number().int().min(0),
	}),
	z.object({ v: z.literal(1), hit: z.literal(false), reason: z.string() }),
]);

export type StunProbeResponse = z.infer<typeof StunProbeResponseSchema>;

export type StunProbeLookup = (
	ip: string,
	port: number,
) => Promise<StunProbeResponse>;

// IPv4 as ::ffff:a.b.c.d. The byte array drops leading zero bytes, so pad it.
const addressBytes = (ip: string): Buffer => {
	const addr = isIPv4(ip) ? Address6.fromAddress4(ip) : new Address6(ip);
	const bytes = Buffer.from(addr.toUnsignedByteArray());
	return Buffer.concat([Buffer.alloc(16 - bytes.length), bytes]);
};

export const encodeLookupRequest = (ip: string, port: number): Buffer => {
	const out = Buffer.alloc(REQUEST_LEN);
	MAGIC.copy(out, 0);
	addressBytes(ip).copy(out, 4);
	out.writeUInt16BE(port, 20);
	return out;
};

// One connection per batch of lookups: the probe serves requests in order on a
// reused connection, so answers come back in the order they were asked.
class LookupConnection {
	private buffer = Buffer.alloc(0);
	private waiting: Array<{
		resolve: (r: StunProbeResponse) => void;
		reject: (e: Error) => void;
	}> = [];

	constructor(private readonly socket: Socket) {
		socket.on("data", (chunk: Buffer) => this.onData(chunk));
		socket.on("error", (err: Error) => this.failAll(err));
		socket.on("close", () => this.failAll(new Error("stun-probe closed")));
	}

	lookup(ip: string, port: number): Promise<StunProbeResponse> {
		return new Promise((resolve, reject) => {
			this.waiting.push({ resolve, reject });
			this.socket.write(encodeLookupRequest(ip, port));
		});
	}

	close(): void {
		this.socket.destroy();
	}

	private onData(chunk: Buffer): void {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		while (this.buffer.length >= 4) {
			const len = this.buffer.readUInt32BE(0);
			if (len > MAX_RESPONSE_LEN) {
				this.failAll(new Error("stun-probe response too large"));
				return;
			}
			if (this.buffer.length < 4 + len) return;
			const body = this.buffer.subarray(4, 4 + len).toString("utf8");
			this.buffer = this.buffer.subarray(4 + len);
			const next = this.waiting.shift();
			if (!next) continue;
			try {
				next.resolve(StunProbeResponseSchema.parse(JSON.parse(body)));
			} catch (err) {
				next.reject(err instanceof Error ? err : new Error(String(err)));
			}
		}
	}

	private failAll(err: Error): void {
		for (const w of this.waiting.splice(0)) w.reject(err);
	}
}

/**
 * Runs `work` with a lookup function bound to one connection, bounded by
 * LOOKUP_TIMEOUT_MS overall. Rejects when the probe cannot be reached.
 */
export const withStunProbe = async <T>(
	socketPath: string,
	work: (lookup: StunProbeLookup) => Promise<T>,
): Promise<T> => {
	const socket = createConnection(socketPath);
	const connection = new LookupConnection(socket);
	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			work((ip, port) => connection.lookup(ip, port)),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new Error("stun-probe lookup timed out")),
					LOOKUP_TIMEOUT_MS,
				);
			}),
		]);
	} finally {
		clearTimeout(timer);
		connection.close();
	}
};
