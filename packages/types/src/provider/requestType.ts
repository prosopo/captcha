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
import { nativeEnum } from "zod";

/**
 * Discriminator for the kind of captcha request a stored record represents.
 *
 * This is an orthogonal axis to {@link CaptchaType}: `CaptchaType` describes the
 * challenge served to the user (image / pow / puzzle / frictionless), whereas
 * `RequestType` describes which record collection / shape the row belongs to.
 * A `session` record has no `CaptchaType` equivalent, which is why this is a
 * separate enum rather than an extension of `CaptchaType`.
 *
 * Records are currently stored in separate physical collections; `requestType`
 * makes each record self-describing ahead of consolidating them into a single
 * `requests` collection. The discriminator is stamped on every record kind via
 * the mongoose schema default; the physical collections are unchanged until the
 * later consolidation phase.
 */
export enum RequestType {
	session = "session",
	powcaptcha = "powcaptcha",
	imagecaptcha = "imagecaptcha",
	// Puzzle records keep their existing shape and collection; the discriminator
	// is stamped so they can join the unified collection without a backfill.
	puzzlecaptcha = "puzzlecaptcha",
}

export const RequestTypeSchema = nativeEnum(RequestType);
