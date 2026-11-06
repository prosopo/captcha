          pnpm exec changeset version --verbose
          git status

          pnpm install --lockfile-only --ignore-scripts
          git add -u .
          git commit -m "chore: version bump"
          git status
