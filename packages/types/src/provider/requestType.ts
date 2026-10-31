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
 * Which kind of request record a stored row is. Separate from `CaptchaType`
 * because a session record has no challenge, and because it describes the
 * record shape rather than what was served. Lets every record identify itself
 * ahead of the per-type collections being merged into one.
 */
export enum RequestType {
	session = "session",
	powcaptcha = "powcaptcha",
	imagecaptcha = "imagecaptcha",
	puzzlecaptcha = "puzzlecaptcha",
	audiocaptcha = "audiocaptcha",
	iconordercaptcha = "iconordercaptcha",
}

export const RequestTypeSchema = nativeEnum(RequestType);
