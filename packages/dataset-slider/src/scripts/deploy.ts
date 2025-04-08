#!/usr/bin/env node
/**
 * Script to deploy slider captcha datasets to a provider's assets directory
 */
import { existsSync, mkdirSync, copyFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';

// Use a more direct approach to find all files
function findAllFiles(directory: string, pattern: string): string[] {
    const files: string[] = [];
    
    function traverseDirectory(dir: string) {
        try {
            const items = readdirSync(dir);
            
            for (const item of items) {
                const fullPath = join(dir, item);
                const stats = statSync(fullPath);
                
                if (stats.isDirectory()) {
                    traverseDirectory(fullPath);
                } else if (stats.isFile() && fullPath.endsWith(pattern)) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dir}:`, error);
        }
    }
    
    traverseDirectory(directory);
    return files;
}

// Parse command line arguments
const args = process.argv.slice(2);
let sourceDir = './output';
let targetDir = '../provider/assets/slider-datasets';
let verbose = false;

for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' || arg === '-s') {
        const nextArg = args[++i];
        if (nextArg) sourceDir = nextArg;
    } else if (arg === '--target' || arg === '-t') {
        const nextArg = args[++i];
        if (nextArg) targetDir = nextArg;
    } else if (arg === '--verbose' || arg === '-v') {
        verbose = true;
    } else if (arg === '--help' || arg === '-h') {
        console.log(`
Usage: node deploy.js [options]

Options:
  --source, -s     Source directory containing datasets (default: ./output)
  --target, -t     Target directory to deploy to (default: ../provider/assets/slider-datasets)
  --verbose, -v    Show verbose output
  --help, -h       Show this help
`);
        process.exit(0);
    }
}

// Ensure source directory exists
if (!existsSync(sourceDir)) {
    console.error(`Error: Source directory '${sourceDir}' does not exist`);
    process.exit(1);
}

// Ensure target directory exists or create it
if (!existsSync(targetDir)) {
    console.log(`Creating target directory: ${targetDir}`);
    mkdirSync(targetDir, { recursive: true });
}

// Function to copy a dataset
async function deployDataset(datasetPath: string): Promise<boolean> {
    try {
        // Read the dataset file
        const datasetContent = readFileSync(datasetPath, 'utf8');
        const dataset = JSON.parse(datasetContent);
        
        // Create a directory for this dataset
        const datasetName = basename(datasetPath, '.json');
        const datasetDir = join(targetDir, datasetName);
        
        if (!existsSync(datasetDir)) {
            mkdirSync(datasetDir, { recursive: true });
        }
        
        // Create assets subdirectory
        const assetsDir = join(datasetDir, 'assets');
        if (!existsSync(assetsDir)) {
            mkdirSync(assetsDir, { recursive: true });
        }
        
        // Copy the dataset file
        const targetDatasetPath = join(datasetDir, 'dataset.json');
        copyFileSync(datasetPath, targetDatasetPath);
        
        if (verbose) {
            console.log(`Copied dataset: ${datasetPath} -> ${targetDatasetPath}`);
        }
        
        // Get the assets directory from the source dataset
        const sourceAssetsDir = join(dirname(datasetPath), 'assets');
        
        // Copy all assets referenced in the dataset
        const assetsCopied = new Set<string>();
        
        for (const captcha of dataset.captchas) {
            // Copy base image
            const baseImagePath = captcha.baseImage.data;
            const sourceBaseImage = join(sourceAssetsDir, baseImagePath);
            const targetBaseImage = join(assetsDir, baseImagePath);
            
            if (existsSync(sourceBaseImage) && !assetsCopied.has(baseImagePath)) {
                copyFileSync(sourceBaseImage, targetBaseImage);
                assetsCopied.add(baseImagePath);
                
                if (verbose) {
                    console.log(`Copied asset: ${sourceBaseImage} -> ${targetBaseImage}`);
                }
            }
            
            // Copy puzzle piece
            const puzzlePiecePath = captcha.puzzlePiece.data;
            const sourcePuzzlePiece = join(sourceAssetsDir, puzzlePiecePath);
            const targetPuzzlePiece = join(assetsDir, puzzlePiecePath);
            
            if (existsSync(sourcePuzzlePiece) && !assetsCopied.has(puzzlePiecePath)) {
                copyFileSync(sourcePuzzlePiece, targetPuzzlePiece);
                assetsCopied.add(puzzlePiecePath);
                
                if (verbose) {
                    console.log(`Copied asset: ${sourcePuzzlePiece} -> ${targetPuzzlePiece}`);
                }
            }
        }
        
        console.log(`✓ Deployed dataset '${datasetName}' with ${assetsCopied.size} assets`);
        return true;
    } catch (error) {
        console.error(`Error deploying dataset ${datasetPath}:`, error);
        return false;
    }
}

// Find all dataset files in the source directory
async function main() {
    const absoluteSourceDir = resolve(sourceDir);
    console.log(`Deploying slider captcha datasets from: ${absoluteSourceDir}`);
    console.log(`Target directory: ${resolve(targetDir)}`);
    
    const datasetFiles = findAllFiles(absoluteSourceDir, 'dataset.json');
    
    if (datasetFiles.length === 0) {
        console.log('No dataset files found.');
        return;
    }
    
    console.log(`Found ${datasetFiles.length} dataset files`);
    
    let successCount = 0;
    
    for (const datasetPath of datasetFiles) {
        const success = await deployDataset(datasetPath);
        if (success) {
            successCount++;
        }
    }
    
    console.log(`\nDeployment complete: ${successCount}/${datasetFiles.length} datasets deployed successfully`);
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
}); 