#!/usr/bin/env bash
set -e

projectRootPath=$(realpath "$0" | sed 's|\(.*\)/.*|\1|' | cd ../ | pwd)

# Displays tool usage
function display_usage() {
	echo "Release builder"
	echo -e "\nUsage:./build_release.sh\n"
}

# check if cargo install cargo-run-script is installed
if ! command -v cargo-run-script &> /dev/null
then
		echo "cargo-run-script could not be found, please install it by running 'cargo install cargo-run-script'"
		exit
fi

cargo run-script optimize

# Check generated wasm file sizes
$projectRootPath/scripts/check_artifacts_size.sh

# Get artifacts versions
$projectRootPath/scripts/get_artifacts_versions.sh
