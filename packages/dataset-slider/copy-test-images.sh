#!/bin/bash

# Create test-images directory if it doesn't exist
mkdir -p ./test-images

# Check if we already have images
TEST_IMAGES_COUNT=$(ls -1 ./test-images | wc -l)
if [ $TEST_IMAGES_COUNT -gt 0 ]; then
    echo "Test images already exist in ./test-images. Skipping copy."
    echo "Found $TEST_IMAGES_COUNT images."
    exit 0
fi

# Look for common image directories on the system
POSSIBLE_DIRS=(
    "/usr/share/backgrounds"
    "/usr/share/wallpapers"
    "/usr/share/pixmaps"
    "$HOME/Pictures"
    "$HOME/Downloads"
)

# Function to copy a few images from a directory
copy_images() {
    local src_dir=$1
    local count=0
    
    echo "Checking for images in $src_dir..."
    
    if [ -d "$src_dir" ]; then
        # Find image files in the directory
        for img in $(find "$src_dir" -type f -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" | head -5); do
            echo "Copying $img to ./test-images/"
            cp "$img" ./test-images/
            count=$((count + 1))
        done
    fi
    
    return $count
}

# Try to find and copy images
TOTAL_COPIED=0

for dir in "${POSSIBLE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        copy_images "$dir"
        COUNT=$?
        TOTAL_COPIED=$((TOTAL_COPIED + COUNT))
        
        # Stop when we have at least 5 images
        if [ $TOTAL_COPIED -ge 5 ]; then
            break
        fi
    fi
done

# If we couldn't find any images, create a simple test image
if [ $TOTAL_COPIED -eq 0 ]; then
    echo "No source images found. Creating a basic test image..."
    
    # Check if ImageMagick is installed
    if command -v convert &> /dev/null; then
        echo "Using ImageMagick to create test image..."
        convert -size 800x600 gradient:blue-red ./test-images/test-gradient.png
        convert -size 800x600 radial-gradient:yellow-green ./test-images/test-radial.png
        convert -size 800x600 plasma:purple-orange ./test-images/test-plasma.png
        TOTAL_COPIED=3
    else
        echo "ImageMagick not found. Creating simple HTML image..."
        cat > ./test-images/test.html <<EOL
<!DOCTYPE html>
<html>
<head>
    <title>Test Image</title>
    <style>
        body {
            width: 800px;
            height: 600px;
            background: linear-gradient(45deg, blue, red);
            margin: 0;
            padding: 0;
        }
    </style>
</head>
<body>
</body>
</html>
EOL
        
        # Try to convert HTML to PNG if wkhtmltoimage is available
        if command -v wkhtmltoimage &> /dev/null; then
            wkhtmltoimage ./test-images/test.html ./test-images/test.png
            rm ./test-images/test.html
            TOTAL_COPIED=1
        else
            echo "Could not create test image. Please manually add images to ./test-images/"
            echo "For example: copy some JPG or PNG files to this directory"
        fi
    fi
fi

echo "Copied $TOTAL_COPIED test images to ./test-images/"
echo "You can now run ./test-generator.sh to create a slider captcha dataset" 