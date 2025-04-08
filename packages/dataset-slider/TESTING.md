# Testing the Slider Captcha Dataset Generator

This guide will help you test the `@prosopo/dataset-slider` package locally.

## Quick Start

1. Make sure you have Node.js v20 or higher installed
2. From the package directory, run:

```bash
# Install dependencies
npm install

# Run in test mode (automatically generates test images and creates one captcha for each shape)
npm run generate:test
```

This will:
1. Create test images automatically if none exist
2. Generate a slider captcha dataset with one captcha for each of the 10 shapes
3. Save the results to `./test-output/`

## Manual Testing

If you want more control over the process:

```bash
# Run with specific options
npm run generate -- --images ./my-images --output ./my-output --count 10 --verbose

# Automatically generate test images if none exist
npm run generate -- --auto-generate --images ./test-images

# Use a specific asset URL
npm run generate -- --asset-url "file://$(pwd)/output/assets/"

# Generate captchas with a specific shape
npm run generate -- --shape heart

# List all available shapes
npm run generate -- --help
```

## Testing Different Shapes

The package includes 10 different puzzle piece shapes that you can test:

```bash
# Test individual shapes
npm run generate -- --shape classic --count 2
npm run generate -- --shape star --count 2
npm run generate -- --shape heart --count 2
npm run generate -- --shape cloud --count 2
npm run generate -- --shape hexagon --count 2
```

For a complete test of all shapes, you can use the test mode:

```bash
npm run generate:test
```

This will automatically generate one captcha for each shape in a single dataset, making it easy to compare all shapes at once.

Alternatively, you can test each shape in a separate directory:

```bash
for shape in classic cloud hexagon star heart roundedNotch bubble gear drop key; do
  npm run generate -- --shape $shape --count 1 --output "./test-output-$shape"
done
```

## Building and Running from dist/

```bash
# Build the package
npm run build

# Run the CLI from the built version
node dist/cli.js --test
```

## Verifying the Results

After running the generator, you should find:

1. A `dataset.json` file in the output directory
2. An `assets` subdirectory containing:
   - Base images with shape cutouts (named `base_*`)
   - Puzzle pieces with the corresponding shapes (named `piece_*`)

You can visually inspect the generated pieces to verify that:
- The pieces have the correct shape
- The base images have matching cutouts
- The pieces fit correctly into their cutouts

## Troubleshooting

If you encounter issues:

1. **No source images**: Use the `--auto-generate` flag to automatically create test images
2. **Empty or missing assets directory**: Make sure you have proper permissions to write to the output directory
3. **Base images not showing cutouts**: Check the console output for any errors during image processing
4. **File URLs not working**: Use absolute paths with `file:///` protocol for local testing
5. **Shape issues**: If a particular shape is not rendering correctly, try using a different shape with `--shape`

## Sample Dataset Format

The generated dataset will have this structure:

```json
{
  "datasetId": "random-id-hash",
  "captchas": [
    {
      "salt": "random-salt-hash",
      "baseImage": {
        "hash": "image-hash",
        "data": "file:///path/to/base_image.png",
        "type": "sliderBase"
      },
      "puzzlePiece": {
        "hash": "piece-hash",
        "data": "file:///path/to/piece_image.png",
        "type": "sliderPiece",
        "position": {
          "x": 150,
          "y": 100
        }
      },
      "solved": false,
      "timeLimitMs": 30000
    },
    // More captchas...
  ],
  "format": "slider"
}
```

The `position` values indicate where the puzzle piece should be placed on the base image. 