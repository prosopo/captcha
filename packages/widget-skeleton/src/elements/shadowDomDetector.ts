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

export interface ShadowDomDetectorOptions {
	/** The web component element to monitor */
	element: HTMLElement;
	/** Callback to trigger when automated Shadow DOM access is detected */
	onAutomatedAccess: () => void;
	/** Optional callback for logging Shadow DOM interactions */
	onInteraction?: (type: 'click' | 'access' | 'attach', target: Element) => void;
	/** Optional custom tag name to specifically monitor (defaults to element's tagName) */
	targetTagName?: string;
}

export interface ShadowDomDetector {
	/** Start monitoring Shadow DOM interactions */
	start(): void;
	/** Stop monitoring and cleanup */
	stop(): void;
	/** Check if detector is currently active */
	isActive(): boolean;
}

/**
 * Creates a Shadow DOM detector that monitors for automated access and interactions
 * with the specified web component element.
 */
export function createShadowDomDetector(options: ShadowDomDetectorOptions): ShadowDomDetector {
	const { element, onAutomatedAccess, onInteraction, targetTagName } = options;
	const monitoredTagName = targetTagName || element.tagName.toLowerCase();
	
	let isMonitoring = false;
	let originalShadowRootGetter: PropertyDescriptor | undefined;
	let originalAttachShadow: typeof Element.prototype.attachShadow;
	let clickListener: ((event: Event) => void) | null = null;

	const log = (type: 'click' | 'access' | 'attach', target: Element, message: string) => {
		console.warn(`[ShadowDOM Detector] ${message}`, target);
		onInteraction?.(type, target);
	};

	const handleShadowRootAccess = function (this: Element) {
		const isTargetElement = this.tagName.toLowerCase() === monitoredTagName;
		
		if (isTargetElement) {
			log('access', this, `⚠️ Automated shadowRoot access detected on ${this.tagName}`);
			// Trigger the frictionless restart callback for automated access
			onAutomatedAccess();
		} else {
			log('access', this, `shadowRoot accessed on ${this.tagName}`);
		}
		
		// Call the original getter
		return originalShadowRootGetter?.get?.call(this);
	};

	const handleAttachShadow = function (this: Element, ...args: Parameters<typeof Element.prototype.attachShadow>) {
		const isTargetElement = this.tagName.toLowerCase() === monitoredTagName;
		
		if (isTargetElement) {
			log('attach', this, `⚠️ Automated attachShadow detected on ${this.tagName}`);
			// This could indicate spoofing or injection attempts
			onAutomatedAccess();
		} else {
			log('attach', this, `attachShadow called on ${this.tagName}`);
		}
		
		// Call the original method
		return originalAttachShadow.apply(this, args);
	};

	const handleDocumentClick = (event: Event) => {
		const target = event.target as Element;
		if (!target) return;

		const rootNode = target.getRootNode();
		
		// Check if the click occurred inside a Shadow DOM
		if (rootNode instanceof ShadowRoot) {
			const hostElement = rootNode.host;
			const isTargetElement = hostElement.tagName.toLowerCase() === monitoredTagName;
			
			if (isTargetElement) {
				log('click', target, `Click inside monitored Shadow DOM: ${hostElement.tagName}`);
				// Note: Real user clicks inside Shadow DOM are normal behavior
				// We only log this for monitoring purposes, not as automated access
			} else {
				log('click', target, `Click inside Shadow DOM: ${hostElement.tagName}`);
			}
		}
	};

	const start = () => {
		if (isMonitoring) {
			console.warn('[ShadowDOM Detector] Already monitoring');
			return;
		}

		try {
			// 1. Override Element.prototype.shadowRoot Access
			originalShadowRootGetter = Object.getOwnPropertyDescriptor(Element.prototype, 'shadowRoot');
			
			if (originalShadowRootGetter) {
				Object.defineProperty(Element.prototype, 'shadowRoot', {
					get: handleShadowRootAccess,
					configurable: true,
					enumerable: true,
				});
			}

			// 2. Monitor attachShadow() Calls
			originalAttachShadow = Element.prototype.attachShadow;
			Element.prototype.attachShadow = handleAttachShadow;

			// 3. Monitor clicks inside Shadow DOM
			clickListener = handleDocumentClick;
			document.addEventListener('click', clickListener, true);

			isMonitoring = true;
			console.log(`[ShadowDOM Detector] Started monitoring for element: ${monitoredTagName}`);
			
		} catch (error) {
			console.error('[ShadowDOM Detector] Failed to start monitoring:', error);
		}
	};

	const stop = () => {
		if (!isMonitoring) {
			return;
		}

		try {
			// Restore original shadowRoot getter
			if (originalShadowRootGetter) {
				Object.defineProperty(Element.prototype, 'shadowRoot', originalShadowRootGetter);
			}

			// Restore original attachShadow method
			if (originalAttachShadow) {
				Element.prototype.attachShadow = originalAttachShadow;
			}

			// Remove click listener
			if (clickListener) {
				document.removeEventListener('click', clickListener, true);
				clickListener = null;
			}

			isMonitoring = false;
			console.log('[ShadowDOM Detector] Stopped monitoring');
			
		} catch (error) {
			console.error('[ShadowDOM Detector] Failed to stop monitoring:', error);
		}
	};

	const isActive = () => isMonitoring;

	return {
		start,
		stop,
		isActive,
	};
}