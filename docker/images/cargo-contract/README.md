dockerfile with cargo-contract precompiled into smallest image possible.

## To run

```
cd protocol
docker run --rm -it -u $(id -u):$(id -g) --cpu-quota=-1 -v $PWD:/src -v $PWD/cargo-cache:/usr/local/cargo/registry prosopo/cargo-contract:4.1.1 'cd contracts/captcha && cargo contract build'
```

Explanation:

- `--rm`: remove container after command has finished
- `-it`: setup tty terminal to make ctrl+c work
- `-u`: set the uid and gid of the user running the command (ensuring files are created by _your_ user, not _root_)
- `-v $PWD:/src`: mount the volume for /src. This should be the dir containing your contracts **and** the output dir (i.e. mount the workspace root so the target dir can be seen, as it's higher in the hierarchy than the contracts themselves)
- `-v $PWD/cargo-cache:/usr/local/cargo/registry`: mount a directory which caches the cargo registry. The registry contains compiled code for dependencies of the package, so caching this avoids a lot of recompilation.
- `--cpu-quota=-1`: unlimited cpu, run on all cores. Quicker compilation using multiple cores instead of single by default.
- `prosopo/cargo-contract:4.1.1`: the image name
- `cd protocol/contracts/captcha && cargo contract build`: command to run, adjust as you need. This has cargo, rustup and cargo contract available.

## Troubleshooting

Remove `target`, `cargo-cache` and `Cargo.lock`, then try again.
