# Two stages. Everything that needs a shell, a package manager or a network
# fetch happens in the builder; the runtime image is distroless and contains
# only the Node runtime, this bundle and its one dependency.
#
# The builder is `node:24-slim` rather than `node:24` for the same reason the
# runtime is distroless: `node:24` is 1.63 GB of build toolchain that a
# pre-bundled JS file and a single prebuilt-binary dependency never touch.
FROM node:24-slim AS builder

WORKDIR /build

# set shell to bash and error on any failure, unset variables, and pipefail
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# slim ships no curl, and the GeoLite fetches below need it. Builder-only, so
# none of this reaches the runtime image.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY ./packages/cli/dist/bundle/ ./

COPY ./packages/locale/dist/locales/ ./locales/

# Download the GeoLite2 databases into the same directory. One layer rather
# than three so the intermediate states are not retained.
RUN curl -fLsS -o GeoLite2-Country.mmdb https://git.io/GeoLite2-Country.mmdb && \
    curl -fLsS -o GeoLite2-City.mmdb https://git.io/GeoLite2-City.mmdb && \
    curl -fLsS -o GeoLite2-ASN.mmdb https://git.io/GeoLite2-ASN.mmdb

# The generated package.json declares `sharp` as a runtime dependency so
# `npm i` installs the linux-x64 native binary — vite bundles the JS shim but
# not the platform-specific .node addon, and the puzzle renderer imports sharp
# from @prosopo/puzzle-assets at runtime. --os=linux --cpu=x64
# --include=optional forces npm to fetch the correct optional platform variant
# regardless of the build host.
#
# The shebang points at the absolute node path rather than `/usr/bin/env node`:
# there is no `env` on PATH in the runtime image to resolve a relative
# interpreter, but the kernel honours an absolute one. It is a convenience
# only — every caller in this repo invokes node explicitly, because `docker
# exec` does not apply ENTRYPOINT:
#   docker exec provider1 /nodejs/bin/node /usr/src/app/provider.cli.bundle.js <command>
RUN echo '#!/nodejs/bin/node' | cat - provider.cli.bundle.js > temp && \
    mv temp provider.cli.bundle.js && \
    chmod +x provider.cli.bundle.js && \
    echo '{ "name": "prosopo-provider", "type": "module", "dependencies": { "sharp": "0.35.3" } }' > package.json && \
    npm i --include=optional --os=linux --cpu=x64 --no-fund --no-audit && \
    npm cache clean --force

# `nodejs24-debian12` matches the builder's Debian release, so the glibc the
# native addons were resolved against is the same one that loads them. All
# four (@img/sharp, native-ja4, native-merkle, native-puzzle) are
# linux-x64-gnu; an Alpine/musl runtime would break every one.
#
# The `:nonroot` tag runs as uid/gid 65532 rather than root. The bind-mounted
# detector-pool directory must be owned by that uid on the host or the pool
# cannot be written or re-read — and an unreadable pool fails silently, with
# the provider falling back to proof of work. The ansible provider role
# chowns it; see captcha-private issue #4749.
#
# There is no shell, no package manager and no npx in here. That is the point,
# and it is also the operational cost: `docker exec ... bash` no longer works,
# CLI commands must name node explicitly (see above), and container
# healthchecks cannot use curl — they run `node -e "fetch(...)"` instead. Every
# call site in this repo and in the ansible playbooks has been moved over.
FROM gcr.io/distroless/nodejs24-debian12:nonroot

WORKDIR /usr/src/app

# --chown so the runtime user owns what it needs to read and write.
COPY --from=builder --chown=65532:65532 /build/ ./

EXPOSE 9229 9339 80 443

# Redundant with the `:nonroot` tag, which already runs as this uid, but
# stated explicitly: it is the only form a Dockerfile reader — or a scanner —
# can see, and it keeps the guarantee if the tag is ever changed.
USER 65532:65532

# ENTRYPOINT is /nodejs/bin/node, so this is argv to node.
CMD ["/usr/src/app/provider.cli.bundle.js", "--api"]
