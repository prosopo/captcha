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
import { startCollector } from "@prosopo/procaptcha";
import { type Component, createElement } from "@prosopo/procaptcha-common";
import type {
	Account,
	ProsopoKeyboardEvent,
	ProsopoMouseEvent,
	ProsopoTouchEvent,
	StoredEvents,
} from "@prosopo/types";

export interface CollectorProps {
	onProcessData: (data: StoredEvents) => void;
	sendData: boolean;
	account: Account | undefined;
}

type StateUpdater<T> = (update: T[] | ((previous: T[]) => T[])) => void;

/**
 * `startCollector` speaks the React setState shape (value or updater fn), so
 * this adapts a plain array to it rather than changing the collector's
 * signature — it is shared with the direct-consumer entry points.
 */
const arrayUpdater = <T>(target: T[]): StateUpdater<T> => {
	return (update: T[] | ((previous: T[]) => T[])) => {
		const next =
			"function" === typeof update ? update([...target]) : [...update];
		target.length = 0;
		target.push(...next);
	};
};

export const mountCollector = (
	container: HTMLElement,
	initialProps: CollectorProps,
): Component<CollectorProps> => {
	let props = initialProps;
	const mouseEvents: ProsopoMouseEvent[] = [];
	const touchEvents: ProsopoTouchEvent[] = [];
	const keyboardEvents: ProsopoKeyboardEvent[] = [];

	const root = createElement("div");
	container.appendChild(root);

	startCollector(
		arrayUpdater(mouseEvents),
		arrayUpdater(touchEvents),
		arrayUpdater(keyboardEvents),
		root,
	);

	// Reporting is keyed on the account, deliberately: a re-render mid-collection
	// is not a send, so the manager sees one report per account rather than one
	// per state change.
	let lastAccount: Account | undefined;
	let lastOnProcessData: CollectorProps["onProcessData"] | undefined;

	const emit = () => {
		if (
			props.account === lastAccount &&
			props.onProcessData === lastOnProcessData
		) {
			return;
		}
		lastAccount = props.account;
		lastOnProcessData = props.onProcessData;
		if (props.account) {
			props.onProcessData({ mouseEvents, touchEvents, keyboardEvents });
		}
	};

	emit();

	return {
		update: (nextProps: CollectorProps) => {
			props = nextProps;
			emit();
		},
		destroy: () => {
			// `startCollector` attaches its listeners to the dapp's enclosing form
			// with anonymous handlers and returns nothing, so there is no way to
			// detach them from here — the React version leaked them on unmount for
			// the same reason. Removing the root is all this component can undo;
			// giving `startCollector` a disposer is a change to @prosopo/procaptcha.
			root.parentNode?.removeChild(root);
		},
	};
};

export default mountCollector;
