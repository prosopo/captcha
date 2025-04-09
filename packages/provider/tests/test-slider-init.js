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

/**
 * Simple test script to verify the SliderCaptchaManager initialization
 * and dataset loading functionality
 */

// Import the necessary modules
import { SliderCaptchaManager } from '../dist/tasks/sliderCaptcha/sliderTasks.js';
import { join } from 'path';
import { getLoggerDefault } from '@prosopo/common';

// Create a mock database with required methods
const mockDb = {
    getDatasetByType: async (type) => {
        console.log(`[TEST] Calling getDatasetByType with type=${type}`);
        return [];
    },
    storeSliderCaptchaRecord: async () => {},
    getSessionRecordBySessionId: async () => null
};

// Create a mock key pair
const mockKeyPair = {
    sign: (data) => new Uint8Array([1, 2, 3, 4])
};

// Set up logger
const logger = getLoggerDefault();
logger.info('Starting SliderCaptchaManager test');

// Initialize the SliderCaptchaManager
const sliderDatasetPath = join(process.cwd(), 'assets/slider-datasets');
const sliderAssetPath = '/assets/slider-datasets';

logger.info('Initializing SliderCaptchaManager with paths:', {
    sliderDatasetPath,
    sliderAssetPath
});

// Create the SliderCaptchaManager instance
const sliderCaptchaManager = new SliderCaptchaManager(
    mockDb,
    mockKeyPair,
    logger,
    {
        datasetPath: sliderDatasetPath,
        assetPath: sliderAssetPath
    }
);

// Wait a second to allow async initialization to complete
setTimeout(() => {
    logger.info('Test complete');
}, 1000); 