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
 *
 * Enhanced with behavioral analysis properties (Phase 2):
 * - pauseDuration: Time gap since last movement (if > threshold)
 * - isDirectionChange: Whether movement changed direction significantly
 * - velocity: Movement speed in pixels/second
 */
export interface MouseMovementPoint {
	x: number;
	y: number;
	timestamp: number;
	// Enhanced properties (Phase 2)
	pauseDuration?: number;      // ms since last movement (if > 100ms)
	isDirectionChange?: boolean; // Significant angle change (> 30°)
	velocity?: number;           // pixels/second
}

/**
 * Touch event point captured during user interaction on touch devices
 *
 * Enhanced with behavioral analysis properties (Phase 2):
 * - touchId: Unique identifier for multi-touch tracking
 * - radiusX/Y: Contact ellipse dimensions (touch area)
 * - rotationAngle: Contact ellipse rotation
 * - forceDelta: Change in pressure from last touch
 * - forceVelocity: Rate of pressure change
 * - swipeVelocity: Swipe speed (on touchend)
 * - swipeDirection: Swipe direction (on touchend)
 */
export interface TouchEventPoint {
	x: number;
	y: number;
	timestamp: number;
	eventType: "touchstart" | "touchmove" | "touchend" | "touchcancel";
	touchCount: number; // Number of simultaneous touches
	force?: number; // Touch pressure (if available)
	// Enhanced properties (Phase 2)
	touchId?: number;           // Touch identifier for multi-touch
	radiusX?: number;           // Contact ellipse X radius
	radiusY?: number;           // Contact ellipse Y radius
	rotationAngle?: number;     // Contact ellipse rotation
	forceDelta?: number;        // Change from last force
	forceVelocity?: number;     // Rate of pressure change
	swipeVelocity?: number;     // Swipe speed (px/sec)
	swipeDirection?: string;    // 'left'|'right'|'up'|'down'
}

/**
 * Click event point captured during user interaction
 *
 * Enhanced with behavioral analysis properties (Phase 2):
 * - hoverDuration: Time spent hovering before click
 * - timeSinceLastClick: Time since previous click
 * - clickSequenceIndex: Position in click sequence
 * - isRapidClick: Whether click was rapid (< 200ms)
 * - distanceFromTarget: Distance from element center
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
	// Enhanced properties (Phase 2)
	hoverDuration?: number;       // ms hovering before click
	timeSinceLastClick?: number;  // ms since previous click
	clickSequenceIndex?: number;  // Position in click sequence
	isRapidClick?: boolean;       // Click < 200ms after previous
	distanceFromTarget?: number;  // Pixels from element center
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
