dockerfile with cargo-contract precompiled into smallest image possible.

## To run

Change to root of captcha workspace, then:
```
docker run --rm -it -u $(id -u):$(id -g) -v $PWD:/src prosopo/cargo-contract:4.1.1 'cd protocol/contracts/captcha && cargo contract build && ls -la'
```

Explanation:
- `--rm`: remove container after command has finished
- `-it`: setup tty terminal to make ctrl+c work
- `-u`: set the uid and gid of the user running the command (ensuring files are created by _your_ user, not _root_)
- `-v`: mount the volume for /src. This should be the dir containing your contracts **and** the output dir (i.e. mount the workspace root so the target dir can be seen, as it's higher in the hierarchy than the contracts themselves)
- `prosopo/cargo-contract:4.1.1`: the image name
- `cd protocol/contracts/captcha && cargo contract build && ls -la`: command to run, adjust as you need. This has cargo, rustup and cargo contract available.

todo
- does -- work? remove '' from args
- put <contract name> in cmd
- doc docker args
