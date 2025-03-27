#!/bin/bash

if [[ "$BRANCH_PROTECTION_DISABLED" != "true" ]]; then
	# Define the list of branches to check against
	branches=("main" "staging" "dev")

	# Get the current branch name
	branch=$(git rev-parse --abbrev-ref HEAD)

	# Check if the current branch is in the list of branches
	if [[ " ${branches[@]} " =~ " ${branch} " ]]; then
		echo "Branch '$branch' is protected. Set BRANCH_PROTECTION_DISABLED=true to override."
		exit 1  # Abort the commit if on restricted branches
	fi
fi

# If we reach here, the commit can proceed
exit 0
