# @prosopo/dataset-slider

This package provides functionality for generating and validating slider captcha datasets for the Prosopo CAPTCHA system.

## Features

- Generate slider captcha datasets with base images and puzzle pieces
- Extract puzzle pieces from images and create matching cutouts
- Validate slider captcha datasets
- Support for custom puzzle piece sizes and tolerances
- Configurable time limits for captcha solving
- Command-line interface for quick dataset generation

## How It Works

The slider captcha works by:
1. Taking a source image and extracting a piece from it at a random position
2. Creating a base image with a cutout where the piece was extracted
3. Presenting the base image with the cutout and the extracted piece to the user
4. The user slides the piece to match the cutout position
5. The solution is verified if the piece position is within tolerance of the target position

## Installation

```bash
npm install @prosopo/dataset-slider
```

## Usage

### Generating a Dataset Programmatically

```typescript
import { SliderDatasetGenerator } from "@prosopo/dataset-slider";

const generator = new SliderDatasetGenerator({
    outputDir: "./output",
    count: 100,
    baseImageDir: "./images",
    puzzlePieceSize: {
        width: 100,
        height: 100,
    },
    tolerance: 50,
    timeLimitMs: 30000,
});

await generator.generate();
```

### Using the CLI

```bash
# Basic usage
npx dataset-slider --output ./my-datasets --images ./my-photos --count 20

# With all options
npx dataset-slider \
    --output ./my-datasets \
    --images ./my-photos \
    --count 50 \
    --width 80 \
    --height 80 \
    --tolerance 15 \
    --time-limit 60000
```

### Validating a Dataset

```typescript
import { SliderDatasetValidator } from "@prosopo/dataset-slider";

const validator = new SliderDatasetValidator();
const isValid = validator.validate(dataset);
```

## Dataset Format

The generated dataset follows this structure:

```typescript
{
    datasetId: string;
    captchas: Array<{
        salt: string;
        baseImage: {
            hash: string;
            data: string; // filename of the base image
            type: "sliderBase";
        };
        puzzlePiece: {
            hash: string;
            data: string; // filename of the puzzle piece
            type: "sliderPiece";
            position: {
                x: number;
                y: number;
            };
        };
        solved?: boolean;
        timeLimitMs?: number;
    }>;
    format: "slider";
}
```

## Examples

Check the `src/examples` directory for detailed example implementations:

- `basic-usage.ts`: Simple example of generating and validating a dataset
- `image-processing.ts`: Example of the image processing techniques used
- `dataset-generation.ts`: Complete example of generating a dataset with multiple captchas

## Integration with Prosopo

To use the generated slider captcha datasets with Prosopo:

1. Generate a dataset using this package
2. Move the asset files (images) to your provider's assets directory
3. Register the dataset in the Prosopo network
4. Update your provider configuration to serve the new slider captcha type

## License

Apache-2.0 