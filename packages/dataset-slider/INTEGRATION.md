# Integration Guide for Shaped Slider Captchas

This guide explains how to integrate the shaped slider captchas with the Prosopo provider and frontend.

## Overview

The shaped slider captcha system enhances the standard slider captcha by using puzzle pieces with special shapes (like stars, hearts, etc.) instead of rectangular pieces. This makes the captchas more engaging for users and harder for bots to solve.

We've made several changes to ensure compatibility between the shaped slider captchas and the existing Prosopo infrastructure.

## Components

The integration involves the following components:

1. **@prosopo/dataset-slider**: Generates captcha datasets with shaped puzzle pieces
2. **@prosopo/provider**: Serves the captchas to users
3. **@prosopo/procaptcha-slider**: Client-side widget that users interact with

## Integration Steps

### 1. Generate Shaped Slider Captcha Datasets

First, generate datasets with shaped puzzle pieces:

```bash
# Clone the repository if you haven't already
git clone https://github.com/prosopo/captcha.git
cd captcha/packages/dataset-slider

# Install dependencies
npm install

# Generate a dataset with a specific shape
npm run generate -- --shape star --images ./my-images --output ./my-datasets --count 20

# Or generate datasets with random shapes
npm run generate -- --images ./my-images --output ./my-datasets --count 20

# Test with automatically generated images (one captcha for each shape)
npm run generate:test
```

### 2. Deploy Datasets to Provider

Use the deploy script to copy the generated datasets to your provider's assets directory:

```bash
npm run deploy -- --source ./my-datasets --target /path/to/provider/assets/slider-datasets
```

### 3. Configure Provider

Ensure your provider is configured to use the shaped slider captchas:

1. The `sliderDatasetPath` in the provider configuration should point to where you deployed the datasets.
2. The `SliderCaptchaManager` is automatically configured to detect and use shaped datasets if they exist.

```javascript
// In your provider setup
const provider = new ProsopoProvider({
  // ...other configuration...
  assets: {
    path: '/path/to/assets',
    // The slider-datasets directory will be automatically detected
  }
});
```

### 4. Test the Integration

1. Start your provider: `npm run dev`
2. Visit your test page or demo app that uses the Procaptcha widget
3. Verify that the shaped slider captchas are displayed correctly
4. Test solving the captchas to ensure verification works properly

## Type Compatibility

We've updated several interfaces to ensure compatibility:

1. `GetSliderCaptchaResponse`: Extended to support both shaped and traditional captchas
2. `SliderCaptchaResponseBody`: Updated with optional fields for different formats
3. `SliderCaptchaStored`: Enhanced to store shape information and dataset references

## Widget Implementation

The `SliderCaptchaWidget` has been modified to detect and handle both formats:

1. It checks for the presence of `baseImageUrl` and `puzzlePieceUrl` to identify shaped captchas
2. It handles different targetPosition formats (numeric for traditional, object with x/y for shaped)
3. It renders pre-generated shaped puzzle pieces instead of generating them client-side

## Verification Logic

The verification logic has been updated to work with both formats:

1. For traditional captchas, it verifies that the slider position matches the target position
2. For shaped captchas, it verifies that the slider position matches the x-coordinate of the target position
3. The server verification is format-agnostic and supports both types

## Backward Compatibility

The system maintains backward compatibility with existing implementations:

1. If no shaped datasets are found, the provider falls back to traditional slider captchas
2. The widget automatically detects the captcha type and renders it appropriately
3. All APIs support both the old and new formats

## Troubleshooting

- **Widget not displaying shaped captchas**: Ensure the datasets are properly deployed and the provider can access them
- **Verification failures**: Check that the target position is being correctly extracted from the challenge
- **Image loading errors**: Verify that the asset paths are correct and the files are accessible

For any issues, consult the complete API documentation or file an issue on the GitHub repository. 