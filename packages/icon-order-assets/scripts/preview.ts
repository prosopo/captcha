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

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { encodePng } from "@prosopo/puzzle-assets";
import sharp from "sharp";
import {
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	renderIconOrder,
} from "../src/index.js";

/** Writes sample challenges to `preview/` as PNG, so codec artefacts don't hide generator output. */
const main = async (): Promise<void> => {
	const outDir = path.resolve("preview");
	await mkdir(outDir, { recursive: true });

	for (let i = 0; i < 4; i++) {
		const challenge = await renderIconOrder(
			DEFAULT_GEOMETRY,
			DEFAULT_RENDER_SETTINGS,
		);
		const background = await sharp(challenge.background)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		const legend = await sharp(challenge.legend)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		await writeFile(
			path.join(outDir, `frame-${i}.png`),
			await encodePng({
				data: background.data,
				width: background.info.width,
				height: background.info.height,
			}),
		);
		await writeFile(
			path.join(outDir, `legend-${i}.png`),
			await encodePng({
				data: legend.data,
				width: legend.info.width,
				height: legend.info.height,
			}),
		);
		console.log(
			"frame-%d: targets %s",
			i,
			challenge.targets
				.map((t) => `${t.kind}@${Math.round(t.x)},${Math.round(t.y)}`)
				.join(" "),
		);
	}
};

main().catch((err: unknown) => {
	console.error(err);
	process.exit(1);
});
