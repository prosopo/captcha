#!/usr/bin/env bash
# Early, friendly refusal to commit on or push to a protected branch; GitHub
# branch protection is the real enforcement. CI and release tooling that must
# write to main set BRANCH_PROTECTION_DISABLED=true.
#
#   check-branch.sh commit   from pre-commit: is the current branch protected?
#   check-branch.sh push     from pre-push: does any ref on stdin target one?
set -euo pipefail

[[ "${BRANCH_PROTECTION_DISABLED:-}" == "true" ]] && exit 0

protected=(main staging dev)

is_protected() {
	local b
	for b in "${protected[@]}"; do
		[[ "$1" == "$b" ]] && return 0
	done
	return 1
}

case "${1:-commit}" in
commit)
	branch=$(git rev-parse --abbrev-ref HEAD)
	if is_protected "$branch"; then
		echo "Branch '$branch' is protected. Set BRANCH_PROTECTION_DISABLED=true to override." >&2
		exit 1
	fi
	;;
push)
	# git feeds one "<local ref> <local sha> <remote ref> <remote sha>" line per ref.
	while read -r _ _ remote_ref _; do
		target=${remote_ref#refs/heads/}
		if [[ "$target" != "$remote_ref" ]] && is_protected "$target"; then
			echo "Pushing to '$target' is blocked; open a PR. Set BRANCH_PROTECTION_DISABLED=true to override." >&2
			exit 1
		fi
	done
	;;
*)
	echo "usage: check-branch.sh commit|push" >&2
	exit 2
	;;
esac
