# Shadow DOM Detection

This document explains how to use the Shadow DOM detection functionality in the widget-skeleton package to detect automated access to CAPTCHA widgets.

## Overview

The Shadow DOM detection system monitors for:
1. **Automated shadowRoot access** - When bots or scripts access the `shadowRoot` property
2. **attachShadow calls** - When elements attempt to create new Shadow DOMs (potential spoofing)
3. **Click interactions** - User interactions within Shadow DOM elements (for logging purposes)

## Usage

### Basic Usage with New API

```typescript
import { 
  createWidgetSkeleton, 
  type CreateWidgetSkeletonOptions 
} from '@prosopo/widget-skeleton';

// Create widget with Shadow DOM detection enabled
const result = createWidgetSkeleton({
  container: document.getElementById('captcha-container')!,
  theme: myTheme,
  webComponentTag: 'prosopo-procaptcha',
  onAutomatedAccess: () => {
    console.log('🚨 Bot detected! Restarting frictionless flow...');
    // Trigger frictionless restart
    restartFrictionlessFlow();
  },
  onInteraction: (type, target) => {
    console.log(`Shadow DOM ${type} detected:`, target);
    // Optional: Send to analytics
  },
  enableShadowDomDetection: true, // Default: true
});

// Access the interactive area and detector
const { interactiveArea, shadowDomDetector } = result;

// Later, stop monitoring if needed
shadowDomDetector?.stop();
```

### Legacy API (Backward Compatible)

```typescript
// Legacy usage still works - detection is enabled by default
const interactiveArea = createWidgetSkeleton(
  container, 
  theme, 
  'prosopo-procaptcha'
);
```

### Manual Detector Usage

```typescript
import { createShadowDomDetector } from '@prosopo/widget-skeleton';

const detector = createShadowDomDetector({
  element: myWebComponent,
  onAutomatedAccess: () => {
    // Handle bot detection
    triggerCaptchaChallenge();
  },
  onInteraction: (type, target) => {
    // Log interactions
    logShadowDomActivity(type, target);
  },
  targetTagName: 'prosopo-procaptcha', // Optional: specific tag to monitor
});

// Start monitoring
detector.start();

// Check if active
if (detector.isActive()) {
  console.log('Monitoring active');
}

// Stop monitoring
detector.stop();
```

## Detection Types

### 1. Automated shadowRoot Access

Triggered when:
- Scripts access `element.shadowRoot` property
- Automated tools query Shadow DOM contents
- Bots attempt to inspect widget internals

```javascript
// This will trigger detection:
const shadowRoot = document.querySelector('prosopo-procaptcha').shadowRoot;
```

### 2. attachShadow Monitoring

Triggered when:
- New Shadow DOMs are created
- Potential spoofing attempts occur
- Malicious scripts try to inject fake widgets

```javascript
// This will trigger detection:
element.attachShadow({ mode: 'open' });
```

### 3. Click Detection

Logged when:
- Users click inside Shadow DOM elements
- Interactions occur within the widget
- Used for monitoring and analytics

## Integration with Frictionless Flow

```typescript
function setupCaptchaWithBotDetection() {
  const result = createWidgetSkeleton({
    container: captchaContainer,
    theme: captchaTheme,
    webComponentTag: 'prosopo-procaptcha',
    onAutomatedAccess: () => {
      // Bot detected - restart frictionless flow
      console.warn('🤖 Automated Shadow DOM access detected');
      
      // Option 1: Restart the current challenge
      restartFrictionlessChallenge();
      
      // Option 2: Switch to image CAPTCHA
      switchToImageCaptcha();
      
      // Option 3: Flag the session
      flagSuspiciousSession();
    },
    onInteraction: (type, target) => {
      // Log for analytics
      analytics.track('shadow_dom_interaction', {
        type,
        element: target.tagName,
        timestamp: Date.now(),
      });
    },
  });

  return result;
}
```

## Security Considerations

1. **False Positives**: Normal browser extensions or debugging tools might trigger detection
2. **Evasion**: Sophisticated bots might try to bypass detection
3. **Performance**: Detection adds minimal overhead but monitors global DOM events
4. **Cleanup**: Always call `detector.stop()` when the widget is destroyed

## Best Practices

1. **Always provide an onAutomatedAccess callback** for production use
2. **Test thoroughly** with browser extensions and development tools
3. **Monitor logs** to tune detection sensitivity
4. **Clean up detectors** when widgets are removed from the DOM
5. **Consider user experience** when triggering challenges

## Troubleshooting

### Detection Not Working
- Ensure the web component has a Shadow DOM attached
- Verify the target tag name matches your component
- Check browser console for error messages

### Too Many False Positives
- Adjust the `targetTagName` to be more specific
- Filter out known browser extensions in your callback
- Add timing checks to distinguish user vs automated access

### Performance Issues
- Limit the number of active detectors
- Stop unused detectors promptly
- Consider debouncing the detection callbacks