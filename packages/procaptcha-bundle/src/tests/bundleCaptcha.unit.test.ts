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

import type { Ti18n } from "@prosopo/locale";
import type {
	mountProcaptchaFrictionless as MountFrictionless,
	ProcaptchaFrictionlessHandle,
} from "@prosopo/procaptcha-frictionless";
import type {
	ProcaptchaClientConfigInput,
	ProcaptchaFrictionlessProps,
} from "@prosopo/types";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mounts = vi.hoisted(() => ({
	props: [] as ProcaptchaFrictionlessProps[],
	destroyed: 0,
}));

vi.mock("@prosopo/procaptcha-frictionless", () => {
	const mountProcaptchaFrictionless: typeof MountFrictionless = (
		_target: HTMLElement,
		props: ProcaptchaFrictionlessProps,
	): ProcaptchaFrictionlessHandle => {
		mounts.props.push(props);
		return {
			destroy: () => {
				mounts.destroyed += 1;
			},
		};
	};
	return { mountProcaptchaFrictionless };
});

const { mountBundleCaptcha } = await import(
	"../util/captcha/components/bundleCaptcha.js"
);

const i18n: Ti18n = {
	language: "en",
	isInitialized: true,
	t: (key: string) => key,
	changeLanguage: () => Promise.resolve(),
	hasLoadedNamespace: () => true,
	on: () => undefined,
	off: () => undefined,
};

const config: ProcaptchaClientConfigInput = {
	account: { address: "site-key" },
};

const mountOnce = (): void => {
	const target = document.createElement("div");
	mountBundleCaptcha(target, {
		config,
		callbacks: {},
		i18n,
		container: target,
	});
};

const lastProps = (): ProcaptchaFrictionlessProps => {
	const props = mounts.props.at(-1);
	if (!props) throw new Error("expected the frictionless widget to be mounted");
	return props;
};

beforeEach(() => {
	mounts.props.length = 0;
	mounts.destroyed = 0;
});

describe("restart", () => {
	test("mounts the first widget without a wrong-answer notice", () => {
		mountOnce();
		expect(lastProps().startShowRetry).toBeUndefined();
	});

	test("remounts with the notice when the restart asks for it", () => {
		mountOnce();
		lastProps().restart({ showRetry: true });
		expect(mounts.destroyed).toBe(1);
		expect(mounts.props).toHaveLength(2);
		expect(lastProps().startShowRetry).toBe(true);
	});

	test("remounts without the notice on a plain restart", () => {
		mountOnce();
		lastProps().restart({ showRetry: true });
		lastProps().restart();
		expect(lastProps().startShowRetry).toBeUndefined();
	});
});
