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

import { z } from "zod";

const u8 = z.number().int().min(0).max(255);
const u16 = z.number().int().min(0).max(65_535);
const u32 = z.number().int().min(0).max(4_294_967_295);
// Kernel counters are u64 on the wire; past 2^53 JSON.parse rounds them, which
// only costs nanoseconds of precision, so Number.isSafeInteger must not apply.
const u64 = z
	.number()
	.min(0)
	.max(2 ** 64);
const hex = z
	.string()
	.max(512)
	.regex(/^[0-9a-f]*$/);
const ip = z.string().max(45);

// Field names stay as tcp-probe emits them, so a stored record reads the same
// as the wire format. Bounds mirror the capture limits in tcp-probe-common.
const TcpProbeSynSchema = z.object({
	ttl: u8,
	tos: u8,
	total_len: u16,
	ip_id: u32,
	frag_flags: u16,
	flow_label: u32,
	ip_options: hex,
	seq: u32,
	data_offset_resv: u8,
	tcp_flags: u8,
	window: u16,
	urg_ptr: u16,
	opts: z.array(z.object({ kind: u8, data: hex })).max(40),
	opts_malformed: z.boolean(),
	raw: hex,
});

const TcpProbeInfoSchema = z.record(z.string().max(32), u64);

export const TcpProbeHitSchema = z.object({
	v: z.literal(2),
	hit: z.literal(true),
	flags: u16,
	remote_ip: ip,
	remote_port: u16,
	local_ip: ip,
	local_port: u16,
	is_v6: z.boolean(),
	syn_ns: u64,
	est_ns: u64,
	est_srtt_us: u32,
	est_mss: u32,
	ack_window: u32,
	ack_tsval: u32,
	ack_tsecr: u32,
	retrans: u32,
	last_state: u32,
	rtt_us: z.array(u32).max(8),
	pkts: z
		.array(
			z.object({
				ns: u64,
				tsval: u32,
				len: u32,
				window: u32,
				flags: u32,
			}),
		)
		.max(16),
	syn: TcpProbeSynSchema.optional(),
	tcp_info: TcpProbeInfoSchema.optional(),
});

export const TcpProbeMissSchema = z.object({
	v: z.literal(2),
	hit: z.literal(false),
	reason: z.string().max(32),
});

export const TcpProbeRecordSchema = z.discriminatedUnion("hit", [
	TcpProbeHitSchema,
	TcpProbeMissSchema,
]);

export type TcpProbeHit = z.infer<typeof TcpProbeHitSchema>;
export type TcpProbeMiss = z.infer<typeof TcpProbeMissSchema>;
export type TcpProbeRecord = z.infer<typeof TcpProbeRecordSchema>;
