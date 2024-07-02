
main branch
- contains latest stable release

dev branch
- latest dev version
- branch off this to make feature X, then PR back in

1 branch per release (aka release branches)
- note that these are for preparing a release, not making a deployment
- these are created by branching off the dev branch, e.g. release/0.3.45
- do all the testing here, e.g. staging, etc
- when sufficiently tested, merge branch into main

on merge of release/x.y.z into main
- after merging to main, create a tag for that version on main branch
- delete the release branch - we don't need it anymore. Releases should be managed via tags due to immutability (e.g.   a branch could be pushed to in the future, whcih wouldn't make sense for a release of 0.3.45 to be mutated after being released to npm, dockerhub, etc, whereas a tag is just as-is, can't be updated)
- deploy to dockerhub, npm, etc
- merge main into dev branch to bring across version bumps for the release (and any other release based changes, e.g. changelog, etc)

pros:
- main contains the latest stable code, so easy to work with for newcomers (we don't have this currently as main is the bleeding edge code)
- merging a release branch into main is a great place to do the tagging of releases (e.g. release 0.3.45), i.e. main just becomes a log of release/a.b.c then release/d.e.f, etc, etc
- staging in the release branch
- release branches allow us a gap to prep a release, i.e. build it, make a contract / staging env, run some automated or manual tests, etc. It's essentially saying "take dev branch in this state and prep a release". The prep can be tweaking the dev code if need be to making it release worthy, but only changes required for releasing, we shouldn't be doing dev on release branches
- hotfixes are easy, branch off main, make the fix, do a release branch, pr back into main, then the hotfix will get pushed to dev too

cons:
- more branches so more discipline needed by us to not f it up (though I think the above plan is pretty simple, we can do it)
- two big branches (main and dev) compared to our current process of 1
