# Slider Captcha Enhancement Plan

The slider captcha generator currently uses simple rectangular cutouts for puzzle pieces. This document outlines the plan to enhance the generator to use the custom shape masks we've defined.

## Current Implementation

- The generator uses 10 different shape definitions (classic, star, heart, cloud, etc.)
- Currently, the generator only uses the shape's name and dimensions
- The pieces are extracted as simple rectangles, not following the actual shape paths

## Enhancement Roadmap

### Phase 1: Research and Testing

1. Research Sharp.js capabilities for mask-based operations
2. Create test scripts to validate SVG-to-PNG conversion
3. Test different approaches for applying SVG masks to images
4. Verify performance and compatibility across different image types

### Phase 2: Implementation

1. Create a function to convert SVG paths to PNG masks
   - Convert the SVG path to a transparent PNG with the shape in white
   - Ensure proper scaling of the shape to match the target size

2. Implement piece extraction with shape masks
   - Extract the region containing the piece
   - Apply the shape mask to the region
   - Save only the pixels within the shape

3. Implement cutout creation with shape masks
   - Create a base image with the cutout in the shape's form
   - Use either composite operations or layer blending to create the cutout

4. Add debug options to visualize the masks and shapes
   - Add a flag to save intermediate files for debugging
   - Show bounding boxes and target positions

### Phase 3: Optimization and Refinement

1. Optimize image processing for performance
   - Cache generated masks for reuse
   - Use streaming operations where possible

2. Add shape customization options
   - Allow parameters to control shape variations
   - Enable custom shape definitions via JSON files

3. Improve visual appeal of the captcha
   - Add drop shadows to the pieces
   - Create subtle borders around the cutouts
   - Implement visual hints for piece orientation

## Implementation Notes

### SVG Mask Processing

```typescript
// Convert SVG to PNG mask
async function createMaskFromSVG(svgString: string, width: number, height: number): Promise<Buffer> {
  return sharp(Buffer.from(svgString))
    .resize(width, height)
    .ensureAlpha()
    .toBuffer();
}

// Apply mask to an image region
async function applyMaskToImage(imageBuffer: Buffer, maskBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .ensureAlpha()
    .composite([
      {
        input: maskBuffer,
        blend: 'dest-in' // Keep only the parts of the image that are within the mask
      }
    ])
    .png()
    .toBuffer();
}
```

### Potential Challenges

1. **SVG Rendering**: Sharp.js has limitations with complex SVG rendering
2. **Performance**: Mask-based operations can be CPU-intensive
3. **Browser Compatibility**: Ensuring the generated images work across different browsers

## Testing Strategy

1. Unit tests for shape mask generation
2. Visual tests comparing different shape extraction methods
3. End-to-end tests for the entire captcha generation pipeline
4. Performance benchmarks for different image sizes and shapes 