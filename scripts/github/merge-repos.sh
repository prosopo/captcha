#! /bin/bash

set -u

repo="$1"
dest="$2"
subdir="$3"

msgs_txt="/tmp/msgs.txt"
git_backup="/tmp/git_backup"

echo "" > $msgs_txt

# prefix all commit msgs with their originating repo name
echo "regex:(.+)==>$repo: \1" > $msgs_txt

cd "$repo"
	# copy the .git dir to make a backup, as we're going to mutate the repo irreversibly
	cp -r .git $git_backup
	# get all remote branches
	git fetch --all
	branches=$( git branch -r | grep --invert-match " -> " | sed -r "s/[^\/]+\/(.*)/\1/")
cd ..

for branch in $branches; do
	cd "$repo"
		echo "$repo $branch"
		git reset --hard
		git clean -fxd
		git checkout "$branch"
		git pull
		# rename the branch to include the repo name as prefix
		git branch -m "$repo/$branch"
		git branch --unset-upstream
		git branch -d -r "origin/$branch"
		git config --unset branch.$branch.remote
		git config --unset branch.$branch.merge
		# git branch -m -r "origin/$branch" "origin/$repo/$branch"
	cd ..
done

cd $repo
	remotes=$(git remote)
	for remote in $remotes; do
		# remove the remotes (these get progagated over and point to the old repo / branch naming otherwise)
		echo git remote rm $remote
		git remote rm $remote
	done
cd ..

# merge into dest repo
# prefix all tags with their originating repo name (to avoid collisions also)
git-filter-repo --source "$repo" --target "$dest" --path-rename :$subdir/$repo/ --tag-rename '':"$repo-" --replace-message $msgs_txt --preserve-commit-hashes --force

cd "$repo"
	# reinstantiate the .git backup, dropping our changes
	rm -rf .git
	mv $git_backup .git
cd ..

rm $msgs_txt

# run `git push -u --all origin` and `git push --tags` after to push all branches + tags to remote