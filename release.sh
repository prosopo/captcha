          pnpm exec changeset version --verbose
          git status

          pnpm install --lockfile-only --ignore-scripts
          # Set the version of the root package.json to the same as @prosopo/cli
          root_version=$(jq -r .version packages/cli/package.json)
          echo "root_version=$root_version"
          echo "Setting root package.json version to $root_version"
          pnpm pkg set version="$root_version"
          git add -u .
          git commit -m "chore: version bump"
          git status
