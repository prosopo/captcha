          npm i -g @changesets/cli
          npx @changesets/cli version --verbose
          git status

          npm i --ignore-scripts --include=dev
          # Set the version of the root package.json and the docker/images/provider/package.json to the same as @prosopo/cli
          root_version=$(npm -w @prosopo/cli pkg get version | jq -r '.["@prosopo/cli"]')
          echo "root_version=$root_version"
          echo "Setting root package.json version to $root_version"
          npm pkg set version="$root_version"
          cd docker/images/provider
          # Set the version of the docker/images/provider/package.json to the same as the root package.json
          npm pkg set version="$root_version"
          cd -
          git add -u .
          git commit -m "chore: version bump"
          git status
