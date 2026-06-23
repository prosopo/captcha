          pnpm add -g @changesets/cli
          pnpm dlx @changesets/cli version --verbose
          git status

          pnpm install --ignore-scripts
          # Set the version of the root package.json and the docker/images/provider/package.json to the same as @prosopo/cli
          root_version=$(pnpm --filter @prosopo/cli pkg get version | jq -r '.["@prosopo/cli"]')
          echo "root_version=$root_version"
          echo "Setting root package.json version to $root_version"
          pnpm pkg set version="$root_version"
          cd docker/images/provider
          # Set the version of the docker/images/provider/package.json to the same as the root package.json
          pnpm pkg set version="$root_version"
          cd -
          git add -u .
          git commit -m "chore: version bump"
          git status
