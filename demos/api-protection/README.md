# API Protection Demo

A comprehensive hotel booking demo that showcases Procaptcha's invisible API protection capabilities.

## Overview

This demo illustrates how Procaptcha protects hotel search APIs from automated scraping and abuse while maintaining a seamless user experience. The application features:

- **Modern Hotel Search Interface**: Professional hotel booking UI with search filters, date pickers, and results display
- **Invisible Procaptcha Protection**: Seamless background verification without user friction
- **Server-side Token Validation**: Backend API validates all Procaptcha tokens
- **Mock Hotel Data**: Realistic hotel listings with images, ratings, and amenities

## Architecture

```
┌─────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API     │    │   Procaptcha    │
│   (React)       │───▶│   (Express)       │───▶│   Server        │
│                 │    │                   │    │                 │
│ - Hotel Search  │    │ - Token Validation│    │ - PoW Challenge │
│ - Procaptcha    │    │ - Hotel Results   │    │ - Verification  │
│   Integration   │    │ - CORS Protection │    │                 │
└─────────────────┘    └───────────────────┘    └─────────────────┘
```

## Features

### 🔒 **Security Features**
- Official Procaptcha React wrapper component for seamless integration
- Invisible Procaptcha protection on all search requests
- Server-side validation of all tokens
- Protection against automated scraping
- Rate limiting through proof-of-work challenges

### 🏨 **Hotel Search Features**
- Location-based hotel search
- Check-in/check-out date selection
- Guest and room configuration
- Star ratings and guest reviews
- Hotel amenities and cancellation policies
- Responsive design for all devices

### 🎨 **User Experience**
- Clean, modern interface similar to major booking platforms
- Loading states and error handling
- Real-time verification status indicators
- Mobile-first responsive design

## Getting Started

### Prerequisites
- Node.js 18+ 
- Procaptcha server running on localhost:9229
- Bundle server running on localhost:9269

### Installation
```bash
cd captcha/demos/api-protection
npm install
```

### Development
```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:frontend  # Frontend on :9233
npm run dev:backend   # Backend on :9234
```

### Production Build
```bash
npm run build
npm start
```

## API Endpoints

### `POST /api/search`
Search for hotels with Procaptcha protection.

**Request:**
```json
{
  "destination": "New York",
  "checkinDate": "2024-01-15",
  "checkoutDate": "2024-01-17", 
  "guests": 2,
  "rooms": 1,
  "procaptchaResponse": "03AGdBq24..."
}
```

**Response:**
```json
{
  "hotels": [...],
  "total": 4,
  "searchId": "search_1234567890_abc123",
  "timestamp": "2024-01-10T10:00:00.000Z"
}
```

### `GET /health`
Health check endpoint.

### `GET /api/demo-info`
Returns demo configuration and information.

## Configuration

### Environment Variables
- `PROSOPO_SITE_KEY`: Your Procaptcha site key
- `PROSOPO_SERVER_URL`: Procaptcha server URL (default: http://localhost:9229)
- `VITE_PROSOPO_SITE_KEY`: Site key for Procaptcha (passed to frontend)
- `VITE_API_URL`: Backend API URL (default: http://localhost:9234)
- `VITE_RENDER_SCRIPT_URL`: Procaptcha bundle URL (default: http://localhost:9269/procaptcha.bundle.js)
- `VITE_RENDER_SCRIPT_ID`: Script ID for the bundle (default: procaptcha-script)
- `PORT`: Backend server port (default: 9234)

### Frontend Configuration
The frontend uses `@prosopo/react-procaptcha-wrapper` which automatically loads and manages the Procaptcha bundle:
- `VITE_PROSOPO_SITE_KEY`: Site key for Procaptcha
- `VITE_API_URL`: Backend API URL
- `VITE_RENDER_SCRIPT_URL`: URL to the Procaptcha bundle script (loaded automatically)
- `VITE_RENDER_SCRIPT_ID`: ID for the script element

## React Wrapper Integration

This demo uses the official `@prosopo/react-procaptcha-wrapper` which provides a clean React API for Procaptcha.
The wrapper automatically handles loading the Procaptcha bundle script, so developers don't need to manage it manually:

```tsx
import { ProcaptchaComponent } from '@prosopo/react-procaptcha-wrapper';

// Invisible Procaptcha component
<ProcaptchaComponent
  siteKey={siteKey}
  size="invisible"
  callback={handleSuccess}
  error-callback={handleError}
  expired-callback={handleExpired}
  htmlAttributes={{
    id: "procaptcha-container",
    className: "hidden"
  }}
/>
```

The wrapper automatically:
- Loads the Procaptcha bundle
- Handles ES module imports
- Manages component lifecycle
- Provides TypeScript support

## Demo Flow

1. **User visits the hotel search page**
2. **Procaptcha loads invisibly** in the background
3. **User completes proof-of-work** challenge automatically
4. **User searches for hotels** using the search form
5. **Backend validates** the Procaptcha token
6. **Results are returned** if verification succeeds
7. **Error shown** if verification fails

## Security Implementation

### Frontend Protection
- Official `@prosopo/react-procaptcha-wrapper` component
- Automatic invisible Procaptcha initialization
- Seamless proof-of-work challenge execution  
- Token inclusion in all API requests
- Real-time verification status display

### Backend Validation
- All search requests require valid Procaptcha tokens
- Server-side validation with Procaptcha API
- Proper error handling and user feedback
- CORS protection for cross-origin requests

## Blog Post Integration

This demo complements the "How to Block Web Scraping" blog post by providing:

- **Practical Example**: Real-world implementation of API protection
- **User Experience**: Shows how protection works without friction
- **Technical Details**: Code examples for implementation
- **Visual Demonstration**: Before/after comparison of protected APIs

## Customization

### Adding New Hotels
Edit `MOCK_HOTELS` in `src/backend/server.ts` to add more hotel data.

### Styling Changes  
Update Tailwind classes in the React components or modify `src/frontend/styles/index.css`.

### API Modifications
Extend the search endpoint in `src/backend/server.ts` to add features like filtering, sorting, or pagination.

## React Wrapper Benefits

This demo showcases the advantages of using `@prosopo/react-procaptcha-wrapper`:

- ✅ **Simplified Integration**: No manual script loading or bundle management
- ✅ **TypeScript Support**: Full type safety and IntelliSense  
- ✅ **React Lifecycle**: Proper component mounting and cleanup
- ✅ **Error Handling**: Built-in error boundaries and callbacks
- ✅ **ES Module Support**: Native ES6 imports without configuration
- ✅ **Invisible Mode**: Seamless background verification
- ✅ **Production Ready**: Battle-tested component used in production

The wrapper eliminates common integration issues and provides a clean, React-native approach to adding Procaptcha protection.

## Troubleshooting

### Procaptcha Not Loading
- Ensure the Procaptcha bundle server is running on `localhost:9269`
- Verify `VITE_RENDER_SCRIPT_URL` environment variable points to the bundle
- Check browser console for script loading errors
- Verify `VITE_PROSOPO_SITE_KEY` is set correctly

### Token Validation Failures  
- Ensure Procaptcha server is running on the correct URL
- Verify `PROSOPO_SERVER_URL` environment variable
- Check server logs for validation errors

### API Connection Issues
- Confirm backend is running on correct port (9234 by default)
- Check CORS configuration in server.ts
- Verify `VITE_API_URL` matches backend URL

## License

Copyright 2021-2025 Prosopo (UK) Ltd. Licensed under the Apache License, Version 2.0.
