#! /bin/bash

# e.g. bash github/add_label.sh "my-label-name"

set -u

label="$1"

for repo in common ops protocol provider scripts contract procaptcha procaptcha-react workspaces datasets api demo-nft-marketplace client-example-server client-example dapp-example integration ; do
	echo "$repo"
	gh api \
	  --method DELETE \
	  -H "Accept: application/vnd.github+json" \
	  -H "X-GitHub-Api-Version: 2022-11-28" \
	  "/repos/prosopo/$repo/labels/$label" | echo &
done

wait
