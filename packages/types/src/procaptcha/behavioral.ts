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

/**
 * Mouse movement point captured during user interaction
 */
export interface MouseMovementPoint {
	x: number;
	y: number;
	timestamp: number;
}

/**
 * Touch event point captured during user interaction on touch devices
 */
export interface TouchEventPoint {
	x: number;
	y: number;
	timestamp: number;
	eventType: "touchstart" | "touchmove" | "touchend" | "touchcancel";
	touchCount: number; // Number of simultaneous touches
	force?: number; // Touch pressure (if available)
}

/**
 * Click event point captured during user interaction
 */
export interface ClickEventPoint {
	x: number;
	y: number;
	timestamp: number;
	eventType: "mousedown" | "mouseup" | "click" | "dblclick" | "contextmenu";
	button: number; // 0 = left, 1 = middle, 2 = right
	targetElement?: string; // Tag name of clicked element
	ctrlKey?: boolean; // Was Ctrl held during click
	shiftKey?: boolean; // Was Shift held during click
	altKey?: boolean; // Was Alt held during click
}

/**
 * Behavioral data collected from user interactions
 */
export interface BehavioralData {
	collector1: MouseMovementPoint[];
	collector2: TouchEventPoint[];
	collector3: ClickEventPoint[];
	deviceCapability: string;
}

/**
 * Packed behavioral data in compressed format
 */
export interface PackedBehavioralData {
	c1: unknown[];
	c2: unknown[];
	c3: unknown[];
	d: string;
}
