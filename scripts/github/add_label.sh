#! /bin/bash

# e.g. bash github/add_label.sh "contract" "issues involving the contract" "BDF876"

set -u

label="$1"
desc="$2"
colour="$3" # without the leading "#"

for repo in common ops protocol provider scripts contract procaptcha procaptcha-react workspaces datasets api demo-nft-marketplace client-example-server client-example dapp-example integration captcha ; do
	echo "$repo"
	gh api \
	  --method POST \
	  -H "Accept: application/vnd.github+json" \
	  -H "X-GitHub-Api-Version: 2022-11-28" \
	  "/repos/prosopo/${repo}/labels" \
	  -f name="$label" \
	 -f description="$desc" \
	 -f color="$colour" \
	 | cat &
done

wait
