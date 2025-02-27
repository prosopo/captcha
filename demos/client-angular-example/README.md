# Prosopo Captcha Angular Demo

This is a simple Angular demo application that demonstrates how to integrate the Prosopo Captcha into an Angular application.

## Features

- Simple form with name and email fields
- Integrated Prosopo Captcha for form validation
- Form submission with captcha token validation

## Getting Started

### Prerequisites

- Node.js 20.x
- npm 9.x or higher

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

### Running the Application

To start the development server:

```bash
npm start
```

The application will be available at `http://localhost:9233`.

### Building for Production

To build the application for production:

```bash
npm run build
```

## How It Works

The demo uses the `@prosopo/angular-procaptcha-wrapper` package to integrate the Prosopo Captcha into an Angular form. The captcha is rendered as a component within the form and provides verification callbacks that are used to validate the form.

## Configuration

To use your own Prosopo Captcha site key, update the `siteKey` property in the `CaptchaFormComponent` class. 