# @prosopo/dataset-slider

This package provides functionality for generating and validating slider captcha datasets for the Prosopo CAPTCHA system.

## Features

- Generate slider captcha datasets with base images and puzzle pieces
- Validate slider captcha datasets
- Support for custom puzzle piece sizes and tolerances
- Configurable time limits for captcha solving

## Installation

```bash
npm install @prosopo/dataset-slider
```

## Usage

### Generating a Dataset

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

### Validating a Dataset

```typescript
import { SliderDatasetValidator } from "@prosopo/dataset-slider";

const validator = new SliderDatasetValidator();
const isValid = validator.validate(dataset);
```

## License

Apache-2.0 