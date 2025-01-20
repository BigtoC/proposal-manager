#!/usr/bin/env bash
set -e

project_root_path=$(realpath "$0" | sed 's|\(.*\)/.*|\1|' | cd ../ | pwd)

if [ "$1" != "--skip-verbose" ]; then
	echo -e "Getting artifacts versions...\n"
fi

echo -e "\033[1mContracts:\033[0m"
for artifact in artifacts/*.wasm; do
	artifact="${artifact%-*}"
	artifact=$(echo $artifact | sed 's/_/-/g')
	version=$(cat ''"$project_root_path"'/Cargo.toml' | awk -F= '/^version/ { print $2 }')
	version="${version//\"/}"

	printf "%-20s %s\n" "$(basename $artifact)" ": $version"
done
