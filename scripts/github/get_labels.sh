#! /bin/bash

# e.g. bash github/get_labels.sh "repo"

set -u

repo="$1"

for repo in $1 ; do
	echo "$repo"
	gh api \
	  --method GET \
	  -H "Accept: application/vnd.github+json" \
	  -H "X-GitHub-Api-Version: 2022-11-28" \
	  "/repos/prosopo/${repo}/labels" \
	 | cat &
done

wait
