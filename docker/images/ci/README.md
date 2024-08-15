# README

CI image with all our tools installed and configured.

## To run

```bash
docker run --rm -it -u $(id -u):$(id -g) -v $PWD:/repo -v $PWD/cargo-cache/registry:/usr/local/cargo/registry -v $PWD/cargo-cache/git:/usr/local/cargo/git --entrypoint bash prosopo/ci:latest 
```
