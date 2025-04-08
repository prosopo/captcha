#!/usr/bin/env node
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