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
	type ProcaptchaOptions,
	getProcaptchaWrapper,
} from "@prosopo/procaptcha-wrapper";
import type { ProcaptchaWrapper } from "@prosopo/procaptcha-wrapper";
import React from "react";

type ProcaptchaComponentProperties = ProcaptchaOptions & {
	htmlAttributes: React.DetailedHTMLProps<
		React.HTMLAttributes<HTMLDivElement>,
		HTMLDivElement
	>;
};

class ProcaptchaComponent extends React.Component<ProcaptchaComponentProperties> {
	private readonly elementRef: React.RefObject<HTMLDivElement>;
	private readonly procaptchaWrapper: ProcaptchaWrapper;

	constructor(properties: ProcaptchaComponentProperties) {
		super(properties);

		this.elementRef = React.createRef();
		this.procaptchaWrapper = getProcaptchaWrapper();
	}

	public override componentDidMount(): void {
		this.renderProcaptcha();
	}

	public override componentDidUpdate(): void {
		this.renderProcaptcha();
	}

	public override render(): React.ReactNode {
		const { htmlAttributes = {} } = this.props;

		return <div ref={this.elementRef} {...htmlAttributes} />;
	}

	protected async renderProcaptcha(): Promise<void> {
		if (this.elementRef.current instanceof HTMLElement) {
			await this.procaptchaWrapper.renderProcaptcha(
				this.elementRef.current,
				this.props,
			);
		}
	}
}

export { ProcaptchaComponent };
