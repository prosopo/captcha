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

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// Add TypeScript declaration for window.procaptcha
declare global {
	interface Window {
		procaptcha?: {
			execute: () => void;
			render: (element: Element, options: any) => void;
			ready: (callback: () => void) => void;
			reset: () => void;
		};
	}
}

interface ProcaptchaProviderProps {
	siteKey: string;
	onSuccess: (token: string) => void;
	onError: (error: string) => void;
	children: React.ReactNode;
}

export const ProcaptchaProvider: React.FC<ProcaptchaProviderProps> = ({
	siteKey,
	onSuccess,
	onError,
	children,
}) => {
	const [isInitialized, setIsInitialized] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const hasExecutedRef = useRef(false);
	const componentMountedRef = useRef(false);
	const executionInProgressRef = useRef(false);
	const widgetRenderedRef = useRef(false);
	const procaptchaContainerRef = useRef<HTMLDivElement | null>(null);

	// Use refs to store the latest callback functions
	const onSuccessRef = useRef(onSuccess);
	const onErrorRef = useRef(onError);

	// Update refs when props change
	useEffect(() => {
		onSuccessRef.current = onSuccess;
	}, [onSuccess]);

	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);

	// Initialize once and prevent re-initialization
	useEffect(() => {
		if (componentMountedRef.current) return;

		componentMountedRef.current = true;
		console.log("ProcaptchaProvider initialized with siteKey:", siteKey);
		setIsInitialized(true);

		return () => {
			componentMountedRef.current = false;
			hasExecutedRef.current = false;
			executionInProgressRef.current = false;
			widgetRenderedRef.current = false;
		};
	}, []); // Remove siteKey dependency to prevent re-initialization

	// Stable event handler that prevents multiple executions
	const handleExecuteEvent = useCallback(
		(_: Event) => {
			console.log("Received procaptcha:execute event");

			// Prevent multiple simultaneous executions
			if (executionInProgressRef.current) {
				console.log("Execution already in progress, ignoring duplicate event");
				return;
			}

			if (!componentMountedRef.current || !isReady) {
				console.log("Component not ready for execution, ignoring event");
				return;
			}

			if (!window.procaptcha?.execute) {
				console.warn("window.procaptcha.execute not available");
				return;
			}

			console.log("Executing procaptcha from event");
			executionInProgressRef.current = true;
			hasExecutedRef.current = true;

			try {
				window.procaptcha.execute();
			} catch (error) {
				console.error("Error executing procaptcha:", error);
				executionInProgressRef.current = false;
				hasExecutedRef.current = false;
			}
		},
		[isReady],
	);

	// Add event listener once when component mounts
	useEffect(() => {
		document.addEventListener("procaptcha:execute", handleExecuteEvent);

		return () => {
			document.removeEventListener("procaptcha:execute", handleExecuteEvent);
		};
	}, [handleExecuteEvent]);

	// Setup procaptcha widget using direct bundle integration
	useEffect(() => {
		if (
			!isInitialized ||
			widgetRenderedRef.current ||
			!procaptchaContainerRef.current
		) {
			return;
		}

		const setupWidget = async () => {
			// Wait for window.procaptcha to be available
			const waitForProcaptcha = (): Promise<void> => {
				return new Promise((resolve) => {
					if (window.procaptcha) {
						resolve();
						return;
					}

					const checkInterval = setInterval(() => {
						if (window.procaptcha) {
							clearInterval(checkInterval);
							resolve();
						}
					}, 100);

					// Timeout after 10 seconds
					setTimeout(() => {
						clearInterval(checkInterval);
						resolve();
					}, 10000);
				});
			};

			await waitForProcaptcha();

			if (!window.procaptcha || !procaptchaContainerRef.current) {
				console.error("Procaptcha not available or container missing");
				return;
			}

			try {
				console.log("Creating Procaptcha widget for the first time");

				await window.procaptcha.render(procaptchaContainerRef.current, {
					siteKey,
					size: "invisible",
					callback: (token: string) => {
						console.log("Procaptcha success callback received");
						hasExecutedRef.current = false;
						executionInProgressRef.current = false;
						onSuccessRef.current(token);
					},
					"error-callback": (error?: string) => {
						console.error("Procaptcha error callback:", error);
						hasExecutedRef.current = false;
						executionInProgressRef.current = false;
						onErrorRef.current(error || "Procaptcha verification failed");
					},
					"expired-callback": () => {
						console.log("Procaptcha expired");
						hasExecutedRef.current = false;
						executionInProgressRef.current = false;
						onErrorRef.current("Procaptcha token expired");
					},
				});

				console.log("Procaptcha rendered and ready");
				widgetRenderedRef.current = true;
				setIsReady(true);
			} catch (error) {
				console.error("Failed to render Procaptcha widget:", error);
				onErrorRef.current("Failed to initialize Procaptcha");
			}
		};

		setupWidget();
	}, [isInitialized, siteKey]);

	if (!isInitialized) {
		return <div>{children}</div>;
	}

	return (
		<div>
			<div
				ref={procaptchaContainerRef}
				style={{ display: "none" }} // Hide the container for invisible mode
			/>
			{children}
		</div>
	);
};
