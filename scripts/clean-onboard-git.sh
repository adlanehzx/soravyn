#!/bin/bash -ex
export PC_TEST_ROOT="$(mktemp -d /tmp/soravyn-clean.XXXXXX)"
export PC_HOME="$PC_TEST_ROOT/home"
export PC_CACHE="$PC_TEST_ROOT/npm-cache"
export PC_DATA="$PC_TEST_ROOT/soravyn-data"
mkdir -p "$PC_HOME" "$PC_CACHE" "$PC_DATA"
echo "PC_TEST_ROOT: $PC_TEST_ROOT"
echo "PC_HOME: $PC_HOME"
cd $PC_TEST_ROOT
: "${SORAVYN_SOURCE_REPOSITORY:?Set SORAVYN_SOURCE_REPOSITORY to your repository URL}"
git clone "$SORAVYN_SOURCE_REPOSITORY" repo
cd repo
pnpm install
env HOME="$PC_HOME" npm_config_cache="$PC_CACHE" npm_config_userconfig="$PC_HOME/.npmrc" \
  pnpm soravyn onboard --yes --data-dir "$PC_DATA"