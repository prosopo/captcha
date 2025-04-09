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

import {
	type ProcaptchaRenderOptions,
	renderProcaptcha,
} from "@prosopo/procaptcha-wrapper";
import {
	type DetailedHTMLProps,
	type HTMLAttributes,
	type MutableRefObject,
	type ReactNode,
	useEffect,
	useRef,
} from "react";

type ProcaptchaComponentProperties = ProcaptchaRenderOptions & {
	htmlAttributes: DetailedHTMLProps<
		HTMLAttributes<HTMLDivElement>,
		HTMLDivElement
	>;
};

const ProcaptchaComponent = (
	properties: ProcaptchaComponentProperties,
): ReactNode => {
	const { htmlAttributes = {} } = properties;

	const elementReference: MutableRefObject<HTMLDivElement | null> =
		useRef(null);

	useEffect(() => {
		if (elementReference.current instanceof HTMLElement) {
			renderProcaptcha(elementReference.current, properties);
		}
	}, [properties]);

	return <div ref={elementReference} {...htmlAttributes} />;
};

export { ProcaptchaComponent };
