#!/bin/bash

# Create test directories if they don't exist
mkdir -p ./test-images
mkdir -p ./test-output

# Check if we have any test images
TEST_IMAGES_COUNT=$(ls -1 ./test-images/*.{jpg,png,jpeg} 2>/dev/null | wc -l)
if [ $TEST_IMAGES_COUNT -eq 0 ]; then
    echo "No test images found in ./test-images directory"
    echo "Please run the following command to get some test images:"
    echo "  bash copy-test-images.sh"
    echo "Or manually add some JPG or PNG images to the ./test-images directory"
    exit 1
fi

# Make the test scripts executable
chmod +x copy-test-images.sh

echo "Found $TEST_IMAGES_COUNT images in ./test-images directory"

# Clear previous test output
if [ -d "./test-output" ]; then
    echo "Clearing previous test output..."
    rm -rf ./test-output/assets
    rm -f ./test-output/dataset.json
fi

# Get the absolute path to the assets directory for the asset URL
CWD=$(pwd)
ASSETS_URL="file://$CWD/test-output/assets/"

echo "Generating slider captcha dataset..."
echo "Using source images from: $CWD/test-images"
echo "Output will be saved to: $CWD/test-output"
echo "Asset URL: $ASSETS_URL"

# Run the generator script
npx tsx src/cli.ts \
    --images ./test-images \
    --output ./test-output \
    --count 5 \
    --width 80 \
    --height 80 \
    --asset-url "$ASSETS_URL" \
    --verbose

if [ $? -eq 0 ]; then
    echo ""
    echo "Generation completed successfully!"
    echo "You can view the generated dataset at ./test-output/dataset.json"
    echo "The assets are in ./test-output/assets/"
    echo ""
    
    # Count the number of generated files
    ASSET_COUNT=$(ls -1 ./test-output/assets/*.png 2>/dev/null | wc -l)
    echo "Generated $ASSET_COUNT asset files"
    
    # Check if jq is available
    if command -v jq &> /dev/null; then
        echo "To view the dataset structure, run:"
        echo "  cat ./test-output/dataset.json | jq"
    else
        echo "To inspect the dataset, open:"
        echo "  $CWD/test-output/dataset.json"
    fi
else
    echo ""
    echo "Error: Dataset generation failed"
    echo "Check the error messages above for more information"
fi 