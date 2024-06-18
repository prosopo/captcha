#! /bin/bash

# Stop on error / print each command / stop on unset variable / stop on pipe fail
set -euxo pipefail

mkdir -p /cargo-cache/registry
mkdir -p /cargo-cache/git

# Move to the source directory, which should be a mounted volume
cd /src

# Run the command passed as arguments to the script
# `& wait` runs the command in the background and waits for it to finish, allowing ctrl-c to work as child processes are killed
eval "$@" & wait
