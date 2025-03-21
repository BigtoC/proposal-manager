#!/usr/bin/env bash
set -e
# set -x

deployment_script_dir=$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
project_root_path=$(realpath "$0" | sed 's|\(.*\)/.*|\1|' | cd ../../ | pwd)
artifacts_path=$project_root_path/artifacts
successful_proposal_fee=1000000
instantiate2=0

# Displays tool usage
function display_usage() {
	echo "Proposal Manager Contract Deployer"
	echo -e "\nUsage:./deploy.sh [flags]. Two flags should be used, -c to specify the chain and then either -d or -s."
	echo -e "To deploy Proposal Manager Contract, the contracts need to be stored first, running -s. With the code_ids in place, the contracts can be deployed with -d.\n"
	echo -e "Available flags:\n"
	echo -e "  -h \thelp"
	echo -e "  -c \tThe chain where you want to deploy (mantra|mantra-testnet|... check chain_env.sh for the complete list of supported chains)"
	echo -e "  -d \tWhat to deploy (all|proposal_manager)"
	echo -e "  -s \tStore artifacts on chain (all|proposal_manager)"
	echo -e "  -a \tArtifacts folder path (default: $project_root_path/artifacts)"
	echo -e "  -f \tUse instantiate2 for deployment (default: 0). Need to be placed before -d flag if used."
}

function store_artifact_on_chain() {
	if [ $# -eq 1 ]; then
		local artifact=$1
	else
		echo "store_artifact_on_chain needs the artifact path"
		exit 1
	fi

	echo "Storing $(basename $artifact) on $CHAIN_ID..."

	# Get contract version for storing purposes
	local contract_path=$(find "$project_root_path" -iname $(cut -d . -f 1 <<<$(basename $(echo $artifact | sed 's/_/-/g'))) -type d)
	local version=$(cat ''"$contract_path"'/Cargo.toml' | awk -F= '/^version/ { print $2 }')
	local version="${version//\"/}"

	local res=$($BINARY tx wasm store $artifact $TXFLAG --from $deployer | jq -r '.txhash')
	sleep $tx_delay
	local code_id=$($BINARY q tx $res --node $RPC -o json | jq -r '.events[] | select(.type == "store_code").attributes[] | select(.key == "code_id").value')

	# Download the wasm binary from the chain and compare it to the original one
	echo -e "Verifying integrity of wasm artifact on chain...\n"
	$BINARY query wasm code $code_id --node $RPC downloaded_wasm.wasm >/dev/null 2>&1
	# The two binaries should be identical
	diff $artifact downloaded_wasm.wasm
	rm downloaded_wasm.wasm

	# Write code_id in output file
	tmpfile=$(mktemp)
	jq --arg artifact "$(basename "$artifact")" --arg code_id "$code_id" --arg version "$version" '.contracts += [{"wasm": $artifact, "code_id": $code_id, "version": $version}]' "$output_file" >"$tmpfile"
	mv $tmpfile $output_file
	echo -e "Stored artifact $(basename "$artifact") on $CHAIN_ID successfully\n"
	sleep $tx_delay
}

function store_artifacts_on_chain() {
	for artifact in $artifacts_path/*.wasm; do
		store_artifact_on_chain $artifact
	done

	echo -e "\n**** Stored artifacts on $CHAIN_ID successfully ****\n"
}

function append_contract_address_to_output() {
	if [ $# -eq 2 ]; then
		local contract_address=$1
		local wasm_file_name=$2
	else
		echo "append_contract_to_output needs the contract_address and wasm_file_name"
		exit 1
	fi

	tmpfile=$(mktemp)
	jq -r --arg contract_address $contract_address --arg wasm_file_name $wasm_file_name '.contracts[] | select (.wasm == $wasm_file_name) |= . + {contract_address: $contract_address}' $output_file | jq -n '.contracts |= [inputs]' >$tmpfile
	mv $tmpfile $output_file
}

function init_proposal_manager() {
	init_msg='{
    "owner": "'$deployer_address'",
    "successful_proposal_fee": {
			"denom": "'$DENOM'",
			"amount": "'$successful_proposal_fee'"
		}
  }'
	init_artifact 'proposal_manager.wasm' "$init_msg" "Proposal Manager"
}

function init_artifact() {
	if [ $# -eq 3 ]; then
		local artifact=$1
		local init_msg=$2
		local label=$3
	else
		echo "init_artifact needs the artifact, init_msg and label"
		exit 1
	fi

	echo -e "\nInitializing $artifact on $CHAIN_ID..."

	# Instantiate the contract
	code_id=$(jq -r '.contracts[] | select (.wasm == "'$artifact'") | .code_id' $output_file)

	if [ $instantiate2 -eq 1 ]; then
		$BINARY tx wasm instantiate2 $code_id "$init_msg" $salt --from $deployer --label "$label" $TXFLAG --admin $deployer_address --fix-msg
	else
		$BINARY tx wasm instantiate $code_id "$init_msg" --from $deployer --label "$label" $TXFLAG --admin $deployer_address
	fi

	sleep $tx_delay
	# Get contract address
	contract_address=$($BINARY query wasm list-contract-by-code $code_id --node $RPC --output json | jq -r '.contracts[-1]')

	# Append contract_address to output file
	append_contract_address_to_output $contract_address $artifact
	sleep $tx_delay
}

function deploy() {
	mkdir -p $project_root_path/scripts/deployment/output
	output_file=$project_root_path/scripts/deployment/output/"$CHAIN_ID"_proposal_manager_contract.json

	if [[ ! -f "$output_file" ]]; then
		# create file to dump results into
		echo '{"contracts": []}' | jq '.' >$output_file
		initial_block_height=$(curl -s $RPC/abci_info? | jq -r '.result.response.last_block_height')
	else
		# read from existing deployment file
		initial_block_height=$(jq -r '.initial_block_height' $output_file)
	fi

	echo -e "\e[1;31m⚠️ WARNING ⚠️️\e[0m"

	echo -e "\e[1;32mThis script assumes the init messages for each contract have been adjusted to your likes.\e[0m"
	echo -e "\n\e[1;32mIf that is not the case, please abort the deployment and make the necessary changes, then run the script again :)\e[0m"

	echo -e "\nDo you want to proceed? (y/n)"
	read proceed

	if [[ "$proceed" != "y" ]]; then
		echo "Deployment cancelled..."
		exit 1
	fi

	case $1 in
	proposal_manager)
		init_proposal_manager
		;;
	*) # store all
		init_proposal_manager
		;;
	esac

	final_block_height=$(curl -s $RPC/abci_info? | jq -r '.result.response.last_block_height')

	# Add additional deployment information
	date=$(date -u +"%Y-%m-%dT%H:%M:%S%z")
	tmpfile=$(mktemp)
	jq --arg date $date --arg chain_id $CHAIN_ID --arg deployer_address $deployer_address --arg initial_block_height $initial_block_height --arg final_block_height $final_block_height '. + {date: $date , initial_block_height: $initial_block_height, final_block_height: $final_block_height, chain_id: $chain_id, deployer_address: $deployer_address}' $output_file >$tmpfile
	mv $tmpfile $output_file

	echo -e "\n**** Deployment successful ****\n"
	jq '.' $output_file
}

function store() {
	mkdir -p $project_root_path/scripts/deployment/output
	output_file=$project_root_path/scripts/deployment/output/"$CHAIN_ID"_proposal_manager_contract.json

	if [[ ! -f "$output_file" ]]; then
		# create file to dump results into
		echo '{"contracts": []}' | jq '.' >$output_file
	fi

	case $1 in
	proposal)
		store_artifact_on_chain $artifacts_path/proposal.wasm
		;;
	*) # store all
		store_artifacts_on_chain
		;;
	esac
}

if [ -z $1 ]; then
	display_usage
	exit 0
fi

source $deployment_script_dir/wallet_importer.sh

optstring=':f:c:d:s:a:h'
while getopts $optstring arg; do
	case "$arg" in
	c)
		chain=$OPTARG
		source $deployment_script_dir/deploy_env/chain_env.sh
		init_chain_env $OPTARG
		if [[ "$chain" = "local" ]]; then
			tx_delay=0.5
		else
			tx_delay=12
		fi
		;;
	d)
		if [ -z "$chain" ]; then
			echo "Must supply chain (-c) before deployer wallet (-d)"
			exit 1
		fi
		import_deployer_wallet $chain
		deploy $OPTARG
		;;
	f)
		instantiate2=$OPTARG
		salt=$(echo -n "proposal_manager" | xxd -ps)
		;;
	s)
		if [ -z "$chain" ]; then
			echo "Must supply chain (-c) before deployer wallet (-s)"
			exit 1
		fi
		import_deployer_wallet $chain
		store $OPTARG
		;;
	a)
		artifacts_path=$OPTARG
		;;
	h)
		display_usage
		exit 0
		;;
	:)
		echo "Must supply an argument to -$OPTARG" >&2
		exit 1
		;;
	?)
		echo "Invalid option: -${OPTARG}"
		display_usage
		exit 2
		;;
	esac
done
