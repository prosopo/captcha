#!/bin/bash

# Create test directories if they don't exist
mkdir -p ./test-images
mkdir -p ./test-output

# Check if we have any test images
TEST_IMAGES_COUNT=$(ls -1 ./test-images | wc -l)
if [ $TEST_IMAGES_COUNT -eq 0 ]; then
    echo "No test images found in ./test-images directory"
    echo "Please add some JPG or PNG images to the ./test-images directory first"
    exit 1
fi

# Get the absolute path to the assets directory for the asset URL
CWD=$(pwd)
ASSETS_URL="file://$CWD/test-output/assets/"

# Run the generator script
npx tsx src/cli.ts \
    --images ./test-images \
    --output ./test-output \
    --count 5 \
    --width 80 \
    --height 80 \
    --asset-url "$ASSETS_URL" \
    --verbose

echo ""
echo "You can view the generated dataset at ./test-output/dataset.json"
echo "The assets are in ./test-output/assets/"
echo ""
echo "To verify the dataset, you can run this command:"
echo "  cat ./test-output/dataset.json | jq" 