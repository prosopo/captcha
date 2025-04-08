# Changelog

## Unreleased

### Added

- Added support for 10 different puzzle piece shapes (classic, star, heart, cloud, hexagon, gear, drop, bubble, roundedNotch, key)
- Added SVG path definitions for each shape
- Added CLI option `--shape` to specify a particular shape
- Added support for random shape selection when no shape is specified
- Created `TODO.md` with a roadmap for implementing shape-based masking
- Implemented shape-based masking for puzzle pieces using SVG paths
- Added helper methods for SVG to PNG mask conversion
- Added advanced blending operations for shaped puzzle pieces
- Implemented proper shape-based masking for both puzzle pieces and cutouts
- Added test mode that generates one captcha for each shape type
- Added ability to auto-generate test images
- Added deploy script to copy generated datasets to a provider's assets directory

### Changed

- Updated CLI to display available shapes in verbose mode
- Updated README.md with documentation about the available shapes
- Updated TESTING.md with instructions for testing different shapes
- Modified image processing to use actual SVG shapes instead of rectangles
- Improved test mode to generate one captcha for each shape type
- Completely rewrote the CLI using yargs for argument parsing
- Enhanced README.md with information about deploying datasets to a provider

### Fixed

- Fixed image processing issues with Sharp.js
- Implemented a simpler approach for puzzle piece extraction and cutout creation
- Enhanced shape rendering to create proper shaped puzzle pieces
- Fixed type compatibility issues between shaped slider captchas and the existing slider captcha infrastructure
- Added proper type definitions for different target position formats (single number, 2D coordinates)
- Modified the GetSliderCaptchaResponse interface to support both traditional and shaped slider captchas
- Updated SliderCaptchaResponseBody interface with optional fields for both formats
- Fixed issues in the SliderCaptchaManager to properly detect and serve shaped captchas

## 2.5.5

Initial release of the slider captcha dataset generator with basic functionality:

- Generate slider captcha datasets with base images and puzzle pieces
- Extract rectangular puzzle pieces from images and create matching cutouts
- Validate slider captcha datasets
- Support for custom puzzle piece sizes and tolerances
- Configurable time limits for captcha solving
- Command-line interface for quick dataset generation

### Added

- Initial release of the slider CAPTCHA dataset generator

### Changed

- Moved from using bash scripts to a fully JavaScript/TypeScript-based approach 