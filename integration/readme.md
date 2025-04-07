# Procaptcha Framework Integrations

This folder contains all framework-specific integration packages for Procaptcha.

## 1. Folder Structure

Inside the `frameworks` directory, each framework has its own folder, containing two subfolders:

1. `{name}-procaptcha-wrapper` – a reusable integration component tailored to the framework
2. `{name}-procaptcha-integration-demo` – a demo application showcasing how to use the integration component

## 2. Shared Integration Logic

To avoid code duplication:

1. Common integration logic is encapsulated in the `@prosopo/procaptcha-wrapper` package, which is added as a dependency
   to each integration.
2. Shared Vite build configuration is provided via `@prosopo/procaptcha-integration-build-config`, which is included as
   a dev dependency.

## 3. Shared ProcaptchaRenderOptions

The `@prosopo/procaptcha-wrapper` package re-exports `ProcaptchaRenderOptions` from `@prosopo/types`, ensuring type
consistency with the core Procaptcha codebase.

### 3.1) Implementation details

The `@prosopo/procaptcha-wrapper` package:

1. Includes `@prosopo/types` as a dev dependency.
2. Contains `/dist/index.d.ts` contains the full `ProcaptchaRenderOptions` type inline, rather than as a type
   reference (which is the default behavior).

This approach ensures that framework integration consumers **will not have `@prosopo/types` or its dependencies** in
their own projects.

To simplify developer experience, framework integrations also re-export `ProcaptchaRenderOptions` — but in default
“link” mode, pointing to the `@prosopo/procaptcha-wrapper` package.

### 3.2) How it works

Whenever `ProcaptchaRenderOptions` is updated in `@prosopo/types`, the changes are picked up automatically during the
wrapper’s build and release. This means end users can access the latest properties simply by running `npm update`,
without having us to manually update each individual framework integration.

## 4. Frameworks Cheatsheet

Each framework uses its own terminology and patterns for similar concepts. To help with consistency, this folder
includes a `frameworks-cheat-sheet.md` file that maps framework-specific terms and structures to shared principles.

Consider reviewing it before making framework-specific integration changes.
