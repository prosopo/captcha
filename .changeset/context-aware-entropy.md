---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
---

Add context-aware entropy calculation for WebView and default contexts

- Added ContextType enum to distinguish between WebView and default browser contexts
- Implemented context-specific entropy calculation and storage
- Created clientContextEntropy collection with automatic timestamp management
- Removed legacy clientEntropy table in favor of context-specific approach
- Added helper functions for context determination and threshold retrieval
- Included comprehensive unit tests for context validation logic
