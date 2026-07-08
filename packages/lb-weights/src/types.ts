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

// Bunny DNS record types (subset). Numeric values match the Bunny API enum.
export enum BunnyRecordType {
	A = 0,
	AAAA = 1,
	CNAME = 2,
	TXT = 3,
	MX = 4,
	Redirect = 5,
	Flatten = 6,
	PullZone = 7,
	SRV = 8,
	CAA = 9,
	PTR = 10,
	Script = 11,
	NS = 12,
}

// Smart routing strategy applied across records sharing a Name + Type.
export enum SmartRoutingType {
	None = 0, // round-robin, weight-only
	Latency = 1, // latency / geo based
	Geo = 2,
}

export const bunnyRecordSchema = z.object({
	Id: z.number(),
	Type: z.nativeEnum(BunnyRecordType),
	Name: z.string(),
	Value: z.string(),
	Weight: z.number(),
	Ttl: z.number(),
	SmartRoutingType: z.nativeEnum(SmartRoutingType),
});

export type BunnyRecord = z.infer<typeof bunnyRecordSchema>;

export const bunnyZoneSchema = z.object({
	Id: z.number(),
	Domain: z.string(),
	Records: z.array(bunnyRecordSchema),
});

export type BunnyZone = z.infer<typeof bunnyZoneSchema>;

// A single weight change to apply to one record.
export interface WeightUpdate {
	recordId: number;
	weight: number;
}
