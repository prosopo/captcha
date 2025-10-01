# Release Process

This document explains how releases work in this repository.

## Overview

The release process is split into 3 automatic workflows that run in sequence:

1. **Create Release PR** - Bumps versions and creates a pull request
2. **Tag Release** - Tags the code after the PR is merged
3. **Publish Release** - Builds, publishes, and creates the GitHub release

---

## Step-by-Step: How to Release

### 1 Start the Release

Go to the **Actions** tab in GitHub and manually run the **"Create Release PR"** workflow.

**What happens:**
- The workflow reads all the changesets (`.changeset/*.md` files)
- It uses `@changesets/cli` to bump package versions
- It updates the root `package.json` and `docker/images/provider/package.json` to match the CLI version
- It creates a branch called `release/vX.Y.Z`
- It opens a pull request with all the version changes

**Result:** You get a PR titled "Release vX.Y.Z" that shows all version bumps.

---

### 2️ Review and Merge the PR

Look at the release PR to make sure the version changes look correct.

**What to check:**
- Package versions were bumped correctly
- Changelog entries make sense
- CI checks are passing

Once you're happy, **manually approve and merge the PR**.

**What happens automatically:**
- As soon as the PR merges, the **"Tag Release"** workflow runs
- It creates a git tag for the new version (e.g., `v3.43.0`)
- The tag is pushed to GitHub

**Result:** The `main` branch is now tagged with the new version.

Note: tag step is seperate to publish step so that failed publishes can be retried without doing a big rerun of everything.

---

### 3️ Publish Happens Automatically

When the tags are pushed, the **"Publish Release"** workflow runs automatically.

**What happens:**
- Builds all the packages
- Publishes changed packages to npm
  - **If any npm publish fails, the workflow stops immediately**
- Publishes the provider Docker image to Docker Hub (only if npm publishing succeeded)
- Creates a zip of `procaptcha-bundle/dist/bundle` 
- Creates a GitHub Release with auto-generated release notes
- Attaches the bundle zip to the release
- Sends Slack notifications about what succeeded or failed

**Result:** The release is live on npm, Docker Hub, and GitHub (if all steps succeeded)

---

## What If Something Goes Wrong?

- **No changesets found:** The "Create Release PR" workflow will exit early
- **PR checks fail:** Fix the issues and push more commits to the release branch
- **npm publishing fails:** The workflow stops immediately. Check Slack for error details.
- **Docker publishing fails:** Check Slack for error details. Manually republish the Docker image from `docker/images/provider`.
- **Tag already exists:** The workflow will skip creating duplicate tags
