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
 * Script to automate the setup of shaped slider captchas for a Prosopo provider
 */
import { execSync } from 'child_process';
import { resolve, join, dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Default paths
const DEFAULT_IMAGES_DIR = './setup-images';
const DEFAULT_OUTPUT_DIR = './setup-output';
const DEFAULT_PROVIDER_DIR = '../provider';
const DEFAULT_PROVIDER_ASSETS_DIR = '../provider/assets/slider-datasets';
const DEFAULT_CONFIG_PATH = '../provider/config.json';

/**
 * Runs a command and returns its output
 */
function runCommand(command: string, options: { cwd?: string, silent?: boolean } = {}): string {
    try {
        if (!options.silent) {
            console.log(`> ${command}`);
        }
        return execSync(command, {
            cwd: options.cwd || process.cwd(),
            stdio: options.silent ? 'pipe' : 'inherit',
            encoding: 'utf-8'
        });
    } catch (error) {
        console.error(`Command failed: ${command}`);
        throw error;
    }
}

/**
 * Updates provider config to use shaped slider captchas
 */
function updateProviderConfig(configPath: string, shapedCaptchas: boolean = true): boolean {
    try {
        if (!existsSync(configPath)) {
            console.warn(`Warning: Provider config not found at ${configPath}`);
            return false;
        }

        // Read the existing config
        const configContent = readFileSync(configPath, 'utf8');
        let config: any;
        
        try {
            config = JSON.parse(configContent);
        } catch (error) {
            console.error(`Error parsing provider config: ${error}`);
            return false;
        }
        
        // Update the config
        config.slider = config.slider || {};
        config.slider.useShapedCaptchas = shapedCaptchas;
        
        // If there's an assets path, make sure it's configured
        if (existsSync(resolve(dirname(configPath), 'assets'))) {
            config.assets = config.assets || {};
            config.assets.path = config.assets.path || './assets';
        }
        
        // Write the updated config
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        console.log(`✓ Updated provider config at ${configPath}`);
        console.log(`  - Set useShapedCaptchas: ${shapedCaptchas}`);
        
        return true;
    } catch (error) {
        console.error(`Error updating provider config: ${error}`);
        return false;
    }
}

/**
 * Main setup function
 */
async function setupShapedSliderCaptchas(options: {
    imagesDir: string;
    outputDir: string;
    providerDir: string;
    targetDir: string;
    configPath: string;
    count: number;
    autoGenerate: boolean;
    shapes: string[];
    verbose: boolean;
}): Promise<void> {
    console.log('Starting Shaped Slider Captcha Setup');
    console.log('===================================');
    
    const { 
        imagesDir, 
        outputDir, 
        providerDir, 
        targetDir, 
        configPath,
        count,
        autoGenerate,
        shapes,
        verbose
    } = options;
    
    // Ensure directories exist
    if (!existsSync(imagesDir)) {
        console.log(`Creating images directory: ${imagesDir}`);
        mkdirSync(imagesDir, { recursive: true });
    }
    
    if (!existsSync(outputDir)) {
        console.log(`Creating output directory: ${outputDir}`);
        mkdirSync(outputDir, { recursive: true });
    }
    
    // Check if provider directory exists
    if (!existsSync(providerDir)) {
        console.warn(`Warning: Provider directory not found at ${providerDir}`);
        console.warn('Will continue with dataset generation but provider setup may fail.');
    }
    
    // Step 1: Generate slider captchas
    console.log('\nStep 1: Generating shaped slider captchas');
    console.log('---------------------------------------');
    
    const cliScript = join(process.cwd(), 'dist', 'cli.js');
    
    let generateCommand = `node ${cliScript} generate --images ${imagesDir} --output ${outputDir} --count ${count}`;
    
    if (autoGenerate) {
        generateCommand += ' --auto-generate';
    }
    
    if (verbose) {
        generateCommand += ' --verbose';
    }
    
    // Generate one dataset for each specified shape
    for (const shape of shapes) {
        console.log(`\nGenerating dataset for shape: ${shape}`);
        try {
            const shapeCommand = `${generateCommand} --shape ${shape}`;
            runCommand(shapeCommand);
            console.log(`✓ Successfully generated dataset for shape: ${shape}`);
        } catch (error) {
            console.error(`Failed to generate dataset for shape ${shape}: ${error}`);
        }
    }
    
    // Step 2: Deploy to provider
    console.log('\nStep 2: Deploying datasets to provider');
    console.log('---------------------------------------');
    
    try {
        const deployScript = join(process.cwd(), 'dist', 'scripts', 'deploy.js');
        const deployCommand = `node ${deployScript} --source ${outputDir} --target ${targetDir} ${verbose ? '--verbose' : ''}`;
        runCommand(deployCommand);
        console.log('✓ Successfully deployed datasets to provider');
    } catch (error) {
        console.error(`Failed to deploy datasets: ${error}`);
        console.error('Setup will continue but provider configuration may need to be done manually.');
    }
    
    // Step 3: Update provider configuration
    console.log('\nStep 3: Updating provider configuration');
    console.log('---------------------------------------');
    
    const configUpdated = updateProviderConfig(configPath, true);
    
    if (configUpdated) {
        console.log('✓ Provider configuration updated successfully');
    } else {
        console.warn('! Provider configuration update skipped or failed');
        console.warn('  You may need to update your provider config manually:');
        console.warn('  1. Add "slider": { "useShapedCaptchas": true } to your config');
        console.warn('  2. Ensure assets.path is correctly set');
    }
    
    // Done!
    console.log('\nSetup Complete!');
    console.log('==============');
    console.log('Your provider is now configured to use shaped slider captchas.');
    console.log('\nNext steps:');
    console.log('1. Restart your provider service');
    console.log('2. Test your captchas using the Procaptcha widget');
}

async function main() {
    // Parse command line arguments
    const argv = yargs(hideBin(process.argv))
        .options({
            'images': {
                alias: 'i',
                describe: 'Directory containing source images',
                type: 'string',
                default: DEFAULT_IMAGES_DIR
            },
            'output': {
                alias: 'o',
                describe: 'Output directory for the generated datasets',
                type: 'string',
                default: DEFAULT_OUTPUT_DIR
            },
            'provider': {
                alias: 'p',
                describe: 'Provider directory',
                type: 'string',
                default: DEFAULT_PROVIDER_DIR
            },
            'target': {
                alias: 't',
                describe: 'Target directory for deployment',
                type: 'string',
                default: DEFAULT_PROVIDER_ASSETS_DIR
            },
            'config': {
                alias: 'c',
                describe: 'Path to provider config file',
                type: 'string',
                default: DEFAULT_CONFIG_PATH
            },
            'count': {
                describe: 'Number of captchas to generate per shape',
                type: 'number',
                default: 5
            },
            'shapes': {
                alias: 's',
                describe: 'Shapes to generate (comma-separated)',
                type: 'string',
                default: 'star,heart,cloud,hexagon,drop'
            },
            'auto-generate': {
                alias: 'a',
                describe: 'Automatically generate test images if none exist',
                type: 'boolean',
                default: true
            },
            'verbose': {
                alias: 'v',
                describe: 'Show verbose output',
                type: 'boolean',
                default: false
            },
        })
        .help()
        .alias('help', 'h')
        .parseSync();

    try {
        // Convert comma-separated shapes to array
        const shapes = argv.shapes.split(',').map(s => s.trim()).filter(s => s);
        
        await setupShapedSliderCaptchas({
            imagesDir: resolve(argv.images),
            outputDir: resolve(argv.output),
            providerDir: resolve(argv.provider),
            targetDir: resolve(argv.target),
            configPath: resolve(argv.config),
            count: argv.count,
            autoGenerate: argv['auto-generate'],
            shapes: shapes,
            verbose: argv.verbose
        });
    } catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
}

// Run the setup script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 