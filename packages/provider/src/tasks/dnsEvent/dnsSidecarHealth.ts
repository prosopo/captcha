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

// Tracks whether this provider's DNS sidecar is currently delivering events,
// so decision machines can tell "this request bypassed the edge" (no
// dnsEvent while the sidecar is working) from "the sidecar is broken" (no
// dnsEvent for anyone). A broken sidecar must not deny real users: on
// 2026-10-05 an expired sidecar admin JWT made every POST /admin/dns/event
// 401, no session got a dnsEvent, and the `no-dns-event` rule denied ~97% of
// twickets traffic for five hours.
//
// Each pronode's sidecar posts to its own provider (DNS_EVENT_SINK_URL =
// http://provider1:9229/...), so a per-process timestamp describes the
// sidecar that feeds this provider's sessions. Only authenticated batches
// reach the endpoint, so an auth failure leaves the timestamp stale.
//
// The sidecar flushes every SHIPPER_FLUSH_MS (1s) but only when it has
// events, so a quiet node goes "unhealthy" after the window. That fails
// open, which is the point: unknown health means no deny.
export const DNS_SIDECAR_HEALTHY_WINDOW_MS = 5 * 60 * 1000;

let lastBatchAt: Date | undefined;

export const recordDnsSidecarBatch = (at: Date): void => {
	lastBatchAt = at;
};

export const isDnsSidecarHealthy = (now: Date): boolean =>
	lastBatchAt !== undefined &&
	now.getTime() - lastBatchAt.getTime() <= DNS_SIDECAR_HEALTHY_WINDOW_MS;

// Exported for unit tests.
export const resetDnsSidecarHealth = (): void => {
	lastBatchAt = undefined;
};
