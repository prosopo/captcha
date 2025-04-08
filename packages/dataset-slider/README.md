# @prosopo/dataset-slider

A tool for generating and managing shaped slider captcha datasets for the Prosopo system.

## Quick Start

The fastest way to set up shaped slider captchas for your provider:

```bash
# Install the package
npm install @prosopo/dataset-slider

# Initialize a provider with shaped slider captchas
node ./dist/cli.js init-provider --provider /path/to/provider/directory
```

This command will:
1. Generate shaped slider captchas with multiple shapes
2. Deploy them to your provider's assets directory
3. Update your provider configuration to use shaped captchas

## Detailed Setup Steps

If you prefer to go through the setup steps manually:

### 1. Generate Slider Captcha Datasets

Generate datasets with shaped puzzle pieces:

```bash
# Generate a dataset with a specific shape
node ./dist/cli.js generate --shape star --images ./my-images --output ./my-datasets --count 20

# Or generate datasets with random shapes
node ./dist/cli.js generate --images ./my-images --output ./my-datasets --count 20

# Test with auto-generated images (one captcha for each shape)
node ./dist/cli.js --test
```

### 2. Deploy Datasets to Provider

Deploy the generated datasets to your provider:

```bash
node ./dist/scripts/deploy.js --source ./my-datasets --target /path/to/provider/assets/slider-datasets
```

### 3. Configure Provider

Update your provider configuration to use shaped slider captchas:

```javascript
// In your provider config
{
  "assets": {
    "path": "./assets"
  },
  "slider": {
    "useShapedCaptchas": true
  }
}
```

## Available Scripts

- `node ./dist/cli.js generate` - Generate slider captcha datasets
- `node ./dist/cli.js --test` - Generate a test dataset with one captcha for each shape
- `node ./dist/scripts/deploy.js` - Deploy datasets to a provider
- `node ./dist/cli.js init-provider` - Automated setup for a provider (all steps in one command)
- `node ./dist/scripts/setup.js` - Run the setup script directly with custom options

## CLI Options

### Generate Command

```bash
node ./dist/cli.js generate [options]
```

| Option              | Description                        | Default    |
| ------------------- | ---------------------------------- | ---------- |
| `--images`, `-i`    | Directory containing source images | `./images` |
| `--output`, `-o`    | Output directory for the dataset   | `./output` |
| `--count`, `-c`     | Number of captchas to generate     | `10`       |
| `--width`, `-w`     | Width of puzzle piece in pixels    | `60`       |
| `--height`          | Height of puzzle piece in pixels   | `60`       |
| `--tolerance`, `-t` | Tolerance in pixels for matching   | `10`       |
| `--time-limit`      | Time limit in milliseconds         | `30000`    |
| `--shape`, `-s`     | Specific puzzle piece shape to use | (random)   |
| `--asset-url`, `-u` | Base URL for assets in the dataset | (auto)     |
| `--auto-generate`   | Automatically generate test images | `false`    |
| `--verbose`, `-v`   | Show verbose output                | `false`    |
| `--test`            | Run in test mode                   | `false`    |

### Deploy Command

```bash
node ./dist/scripts/deploy.js [options]
```

| Option            | Description                          | Default                              |
| ----------------- | ------------------------------------ | ------------------------------------ |
| `--source`, `-s`  | Source directory containing datasets | `./output`                           |
| `--target`, `-t`  | Target directory to deploy to        | `../provider/assets/slider-datasets` |
| `--verbose`, `-v` | Show verbose output                  | `false`                              |

### Init Provider Command

```bash
node ./dist/cli.js init-provider [options]
```

| Option                  | Description                          | Default                              |
| ----------------------- | ------------------------------------ | ------------------------------------ |
| `--images`, `-i`        | Directory containing source images   | `./setup-images`                     |
| `--output`, `-o`        | Output directory for datasets        | `./setup-output`                     |
| `--provider`, `-p`      | Provider directory path              | `../provider`                        |
| `--target`, `-t`        | Target directory for deployment      | `../provider/assets/slider-datasets` |
| `--config`, `-c`        | Path to provider config file         | `../provider/config.json`            |
| `--count`               | Number of captchas per shape         | `5`                                  |
| `--shapes`, `-s`        | Shapes to generate (comma-separated) | `star,heart,cloud,hexagon,drop`      |
| `--auto-generate`, `-a` | Automatically generate test images   | `true`                               |
| `--verbose`, `-v`       | Show verbose output                  | `false`                              |

## Features

- Generate slider captcha datasets from your own images
- Extract properly shaped puzzle pieces using 10 different SVG shapes
- Apply matching cutouts to base images
- Auto-generate test gradient images for quick testing
- Validate slider captcha datasets
- Custom configuration options
- CLI tool for quick dataset generation
- Deploy generated datasets to a provider's assets directory

## Installation

### Local Installation

```bash
npm install @prosopo/dataset-slider
```

### Global Installation

```bash
npm install -g @prosopo/dataset-slider
```

## Usage

### CLI

For global installation:

```bash
dataset-slider --images ./my-images --output ./my-datasets
```

Using npx:

```bash
npx @prosopo/dataset-slider --images ./my-images --output ./my-datasets
```

Using local package scripts:

```bash
npm run generate -- --images ./my-images --output ./my-datasets
```

#### CLI Options

| Option            | Default     | Description                                                                                             |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `--images`        | `./images`  | Directory containing source images                                                                      |
| `--output`        | `./output`  | Directory to save generated datasets                                                                    |
| `--count`         | `10`        | Number of captchas to generate                                                                          |
| `--width`         | `60`        | Width of puzzle piece in pixels                                                                         |
| `--height`        | `60`        | Height of puzzle piece in pixels                                                                        |
| `--tolerance`     | `5`         | Allowed tolerance in pixels for captcha solving                                                         |
| `--time-limit`    | `30000`     | Time limit in milliseconds for solving the captcha                                                      |
| `--asset-url`     | `undefined` | Base URL path for assets in the dataset                                                                 |
| `--shape`         | `random`    | Shape of the puzzle piece (classic, cloud, hexagon, star, heart, roundedNotch, bubble, gear, drop, key) |
| `--auto-generate` | `false`     | Auto-generate test images if none exist                                                                 |
| `--verbose`       | `false`     | Verbose output                                                                                          |
| `--test`          | `false`     | Run in test mode (generates one captcha for each shape)                                                 |
| `--help`          | -           | Show help                                                                                               |
| `--version`       | -           | Show version number                                                                                     |

### Quick Test Mode

To quickly test the generator with automatically created test images:

```bash
node ./dist/cli.js --test
```

This will generate a test dataset with one captcha for each of the 10 available shapes and save it to `./test-output/`.

## Deploying Generated Datasets to a Provider

After generating your slider captcha datasets, you can deploy them to a Prosopo provider's assets directory using the included deployment script:

```bash
node ./dist/scripts/deploy.js --source ./my-datasets --target /path/to/provider/assets/slider-datasets
```

The deploy script copies all dataset files and their associated assets to the target directory structure required by the provider. By default, it deploys to `../provider/assets/slider-datasets` relative to the package directory.

### Deploy Script Options

| Option      | Default                              | Description                              |
| ----------- | ------------------------------------ | ---------------------------------------- |
| `--source`  | `./output`                           | Source directory with generated datasets |
| `--target`  | `../provider/assets/slider-datasets` | Target directory in provider assets      |
| `--verbose` | `false`                              | Show detailed output during deployment   |
| `--help`    | -                                    | Show help message                        |

## Programmatic Usage

### Generate Dataset

```typescript
import { SliderDatasetGenerator } from '@prosopo/dataset-slider';

const generator = new SliderDatasetGenerator({
  baseImageDir: './my-images',
  outputDir: './my-datasets',
  count: 10,
  puzzlePieceSize: { width: 60, height: 60 },
  tolerance: 5,
  timeLimitMs: 30000,
  selectedShapeName: 'star' // Optional: select a specific shape
});

await generator.generate();
```

### Validate Dataset

```typescript
import { SliderDatasetValidator } from '@prosopo/dataset-slider';

const validator = new SliderDatasetValidator({
  datasetPath: './my-datasets/dataset.json'
});

const validationResult = await validator.validate();
console.log(validationResult.isValid);
console.log(validationResult.errors);
```

## Dataset Format

The generator produces a dataset with the following format:

```json
{
  "datasetId": "randomDatasetId",
  "captchas": [
    {
      "id": "captchaId1",
      "salt": "randomSalt",
      "baseImage": {
        "hash": "imageHash",
        "data": "base_image.png",
        "type": "sliderBase"
      },
      "puzzlePiece": {
        "hash": "pieceHash",
        "data": "puzzle_piece.png",
        "type": "sliderPiece",
        "position": {
          "x": 123,
          "y": 45
        }
      },
      "solved": false,
      "timeLimitMs": 30000
    }
  ],
  "format": "slider"
}
```

## Integration with Prosopo

To use the generated datasets with Prosopo:

1. Generate datasets with proper shaped puzzle pieces:
   ```bash
   node ./dist/cli.js generate --shape classic --images ./my-images --output ./my-datasets
   ```

2. Deploy the generated datasets to your provider:
   ```bash
   node ./dist/scripts/deploy.js --source ./my-datasets --target /path/to/provider/assets/slider-datasets
   ```

3. Ensure your provider is configured to use shaped slider captchas by checking the dataset path exists.

4. Restart your provider to load the new captcha datasets.

## License

Apache-2.0

# Loading Slider Captcha Datasets into a Provider

Here's a comprehensive guide to generating and loading shaped slider captcha datasets into your Prosopo provider:

## Option 1: Automated Setup (Recommended)

The fastest way is to use the init-provider command which automates the entire process:

```bash
# Make sure the dataset-slider package is built
cd captcha/packages/dataset-slider
npm run build

# Run the init-provider command
node ./dist/cli.js init-provider --provider ../provider
```

This automated setup:
1. Generates datasets with multiple shapes (star, heart, cloud, hexagon, drop by default)
2. Deploys them to your provider's assets directory
3. Updates the provider's configuration to use shaped slider captchas

## Option 2: Manual Process

If you prefer more control over each step:

### Step 1: Generate a Slider Captcha Dataset

First build the package and generate a dataset:

```bash
cd captcha/packages/dataset-slider
npm run build

# Generate with a specific shape
node ./dist/cli.js generate --shape star --images ./my-images --output ./my-datasets --count 10

# Or use auto-generated test images
node ./dist/cli.js generate --auto-generate --images ./test-images --output ./my-datasets --count 10
```

### Step 2: Deploy the Dataset to Your Provider

Deploy the generated dataset to your provider's assets directory:

```bash
node ./dist/scripts/deploy.js --source ./my-datasets --target ../provider/assets/slider-datasets
```

### Step 3: Update Your Provider Configuration

Edit your provider's `config.json` to enable shaped slider captchas:

```json
{
  "assets": {
    "path": "./assets"
  },
  "slider": {
    "useShapedCaptchas": true
  }
}
```

### Step 4: Restart Your Provider

Restart your provider service to load the new datasets:

```bash
cd ../provider
npm run start
```

## Verifying Your Setup

1. Check the dataset files were copied correctly:
   ```bash
   ls -la ../provider/assets/slider-datasets
   ```

2. Check the provider logs to verify it's loading the shaped slider captchas

3. Test with a client implementation using the Procaptcha widget

## Troubleshooting

If you encounter issues:

- Ensure the provider has proper read permissions for the assets directory
- Verify the configuration was updated correctly with `useShapedCaptchas: true`
- Check provider logs for any errors related to loading datasets
- Try generating a test dataset with all shapes:
  ```bash
  node ./dist/cli.js --test --verbose
  ```

The shaped slider captchas should now be available through your provider!