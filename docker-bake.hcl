# Copyright 2021-2026 Prosopo (UK) Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Every image in this repo, declared once.
#
# Each package still owns a build:docker script — that stays the way to build
# one image while working on it. This file is for the cases where you want the
# set: `docker buildx bake` builds them all in parallel against a shared
# builder and cache, which the per-package scripts cannot do because each is a
# separate `docker buildx build` invocation.
#
#   docker buildx bake                 # everything in the default group
#   docker buildx bake provider        # one target
#   docker buildx bake --print         # resolved config, builds nothing
#
# Versions come in as variables rather than being hardcoded, so the tags stay
# tied to the packages. `npm run build:docker` at the repo root fills them in
# from each package.json; called directly they default to "dev", which is a
# deliberately obvious placeholder for a hand-run local build.

variable "PROVIDER_VERSION" { default = "dev" }
variable "CLIENT_EXAMPLE_SERVER_VERSION" { default = "dev" }
variable "PROVIDER_MOCK_VERSION" { default = "dev" }
variable "CADDY_VERSION" { default = "dev" }
variable "VECTOR_VERSION" { default = "dev" }

# Appended to every tag when set to anything but "production", matching
# docker/docker-tag.mjs. A staging build can then never overwrite the
# production tag of the same version.
variable "NODE_ENV" { default = "" }

function "tag" {
  params = [repository, version]
  result = [
    "${repository}:${version}${NODE_ENV != "" && NODE_ENV != "production" ? "-${NODE_ENV}" : ""}"
  ]
}

group "default" {
  targets = ["provider", "client-example-server", "provider-mock", "caddy", "vector"]
}

target "_common" {
  platforms = ["linux/amd64"]
}

# The bundled Node services. Context is the repo root rather than the owning
# package: each Dockerfile copies its own package's dist/bundle *and*
# packages/locale's compiled locales, so a package-scoped context cannot see
# everything it needs. Run the packages' bundle scripts first or the COPY has
# nothing to find.
#
# provider is built from packages/cli — the image bundles the provider CLI and
# has always been published at @prosopo/cli's version. See docker/docker-tag.mjs.
target "provider" {
  inherits   = ["_common"]
  context    = "."
  dockerfile = "packages/cli/Dockerfile"
  tags       = tag("prosopo/provider", PROVIDER_VERSION)
}

target "client-example-server" {
  inherits   = ["_common"]
  context    = "."
  dockerfile = "demos/client-example-server/Dockerfile"
  tags       = tag("prosopo/client-example-server", CLIENT_EXAMPLE_SERVER_VERSION)
}

target "provider-mock" {
  inherits   = ["_common"]
  context    = "."
  dockerfile = "demos/provider-mock/Dockerfile"
  tags       = tag("prosopo/provider-mock", PROVIDER_MOCK_VERSION)
}

# caddy and vector have no owning source package: they layer config onto an
# upstream image, so their context is just the Dockerfile's own directory.
target "caddy" {
  inherits   = ["_common"]
  context    = "docker/images/caddy/src"
  dockerfile = "Dockerfile"
  tags       = tag("prosopo/caddy", CADDY_VERSION)
}

target "vector" {
  inherits   = ["_common"]
  context    = "docker/images/vector/src"
  dockerfile = "Dockerfile"
  tags       = tag("prosopo/vector", VECTOR_VERSION)
}
