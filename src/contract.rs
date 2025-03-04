#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;

use crate::error::ContractError;
use crate::helpers::{
    aggregate_coins, validate_fees_are_paid,
    validate_no_additional_funds_sent_with_proposal_creation,
};
use crate::msg::{ExecuteMsg, InstantiateMsg, MigrateMsg, ProposalBy, ProposalsResponse, Status, QueryMsg};
use crate::proposal::state::{
    Config, Proposal, ProposalStatus, CONFIG, DEFAULT_LIMIT, FAILED_COUNTER, MAX_ITEMS_LIMIT,
    PROPOSALS, PROPOSAL_COUNTER, SUCCESSFUL_COUNTER, CANCELED_COUNTER,
};
use crate::validate_contract;
use cosmwasm_std::{
    to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Order, Response, StdError,
};
use cosmwasm_std::{BankMsg, Coin, CosmosMsg, StdResult};
use cw2::set_contract_version;
use cw_storage_plus::IndexPrefix;

// version info for migration info
const CONTRACT_NAME: &str = "proposal-manager";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, StdError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    let config: Config = Config {
        successful_proposal_fee: msg.successful_proposal_fee,
    };
    CONFIG.save(deps.storage, &config)?;
    // Initialize counter
    PROPOSAL_COUNTER.save(deps.storage, &0)?;
    SUCCESSFUL_COUNTER.save(deps.storage, &0)?;
    CANCELED_COUNTER.save(deps.storage, &0)?;
    FAILED_COUNTER.save(deps.storage, &0)?;

    let owner = deps
        .api
        .addr_validate(&msg.owner.unwrap_or(info.sender.into_string()))?;
    cw_ownable::initialize_owner(deps.storage, deps.api, Some(owner.as_str()))?;

    Ok(Response::default().add_attributes(vec![
        ("action", "instantiate".to_string()),
        ("owner", owner.to_string()),
        (
            "successful_proposal_fee",
            config.successful_proposal_fee.to_string(),
        ),
    ]))
}

#[allow(unused_must_use)]
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::CreateProposal {
            title,
            speech,
            receiver,
            gift,
        } => {
            let config = CONFIG.load(deps.storage)?;
            // proposer is not the receiver
            if info.sender == deps.api.addr_validate(&receiver)? {
                return Err(ContractError::InvalidReceiver);
            }
            let gift = aggregate_coins(gift)?;
            // check if the proposal and gift fees were paid
            let total_fees =
                validate_fees_are_paid(&config.successful_proposal_fee, gift.clone(), &info)?;

            // make sure the user doesn't accidentally send more tokens than needed
            validate_no_additional_funds_sent_with_proposal_creation(&info, total_fees)?;

            let proposal_id = PROPOSAL_COUNTER.load(deps.storage)?;
            let proposal = Proposal {
                id: proposal_id,
                proposer: info.sender.clone(),
                receiver: deps.api.addr_validate(&receiver)?,
                gift,
                fee: config.successful_proposal_fee.clone(),
                title,
                speech,
                reply: None,
                status: ProposalStatus::Pending,
                created_at: env.block.height,
                replied_at: None,
            };

            PROPOSALS.save(deps.storage, proposal_id, &proposal)?;
            PROPOSAL_COUNTER.save(deps.storage, &(proposal_id + 1))?;

            Ok(Response::new().add_attributes(vec![
                ("action", "create_proposal"),
                ("proposal_id", proposal_id.to_string().as_str()),
                ("proposer", info.sender.to_string().as_str()),
                ("receiver", receiver.as_str()),
            ]))
        }
        ExecuteMsg::CancelProposal { id } => {
            let proposal = PROPOSALS.load(deps.storage, id)?;
            if proposal.proposer != info.sender {
                return Err(ContractError::Unauthorized);
            }
            if proposal.status != ProposalStatus::Pending {
                return Err(ContractError::CancelProposalInvalidStatus {
                    current_status: proposal.status.to_string(),
                });
            }

            let mut total_refund: Vec<Coin> = vec![];
            total_refund.push(proposal.fee.clone());
            let mut messages: Vec<CosmosMsg> = vec![];
            messages.push(CosmosMsg::Bank(BankMsg::Send {
                to_address: proposal.proposer.to_string(),
                amount: vec![proposal.fee.clone()],
            }));

            if !proposal.gift.is_empty() {
                total_refund.extend(proposal.gift.clone());
                messages.push(CosmosMsg::Bank(BankMsg::Send {
                    to_address: proposal.proposer.to_string(),
                    amount: proposal.gift,
                }));
            }

            total_refund = aggregate_coins(total_refund)?;

            PROPOSALS.remove(deps.storage, id);
            CANCELED_COUNTER.update(deps.storage, |count| -> StdResult<_> { Ok(count + 1) })?;

            Ok(Response::new().add_messages(messages).add_attributes(vec![
                ("action", "cancel_proposal"),
                ("proposal_id", id.to_string().as_str()),
                ("proposer", proposal.proposer.as_str()),
                ("receiver", proposal.receiver.as_str()),
                (
                    "total_refund_to_proposer",
                    &total_refund
                        .iter()
                        .map(|coin| coin.to_string())
                        .collect::<Vec<_>>()
                        .join(","),
                ),
            ]))
        }
        ExecuteMsg::Yes { id, reply } => {
            let mut proposal = PROPOSALS.load(deps.storage, id)?;
            if proposal.receiver != info.sender {
                return Err(ContractError::Unauthorized);
            }

            let mut messages: Vec<CosmosMsg> = vec![];
            if let Some(owner) = cw_ownable::get_ownership(deps.storage)?.owner {
                messages.push(CosmosMsg::Bank(BankMsg::Send {
                    to_address: owner.to_string(),
                    amount: vec![proposal.fee.clone()],
                }));
            } else {
                messages.push(CosmosMsg::Bank(BankMsg::Send {
                    to_address: proposal.proposer.to_string(),
                    amount: vec![proposal.fee.clone()],
                }));
            }

            if !proposal.gift.is_empty() {
                messages.push(CosmosMsg::Bank(BankMsg::Send {
                    to_address: proposal.receiver.to_string(),
                    amount: proposal.gift.clone(),
                }));
            }

            SUCCESSFUL_COUNTER.update(deps.storage, |count| -> StdResult<_> { Ok(count + 1) })?;
            proposal.status = ProposalStatus::Yes;
            proposal.reply = reply.clone();
            proposal.replied_at = Some(env.block.height);
            PROPOSALS.save(deps.storage, id, &proposal)?;

            Ok(Response::new().add_messages(messages).add_attributes(vec![
                ("action", "say_yes"),
                ("proposal_id", id.to_string().as_str()),
                ("reply", reply.unwrap_or_default().as_str()),
                ("proposer", proposal.proposer.as_str()),
                ("receiver", proposal.receiver.as_str()),
                (
                    "gift_received_by_receiver",
                    &proposal
                        .gift
                        .clone()
                        .iter()
                        .map(|coin| coin.to_string())
                        .collect::<Vec<_>>()
                        .join(","),
                ),
                ("fee_received_by_owner", &proposal.fee.to_string()),
            ]))
        }
        ExecuteMsg::No { id, reply } => {
            let mut proposal = PROPOSALS.load(deps.storage, id)?;
            if proposal.receiver != info.sender {
                return Err(ContractError::Unauthorized);
            }

            let mut total_refund: Vec<Coin> = vec![];
            total_refund.push(proposal.fee.clone());
            let mut messages: Vec<CosmosMsg> = vec![];
            messages.push(CosmosMsg::Bank(BankMsg::Send {
                to_address: proposal.proposer.to_string(),
                amount: vec![proposal.fee.clone()],
            }));

            if !proposal.gift.is_empty() {
                total_refund.extend(proposal.gift.clone());
                messages.push(CosmosMsg::Bank(BankMsg::Send {
                    to_address: proposal.proposer.to_string(),
                    amount: proposal.gift.clone(),
                }));
            }

            total_refund = aggregate_coins(total_refund)?;

            FAILED_COUNTER.update(deps.storage, |count| -> StdResult<_> { Ok(count + 1) })?;
            proposal.status = ProposalStatus::No;
            proposal.reply = reply.clone();
            proposal.replied_at = Some(env.block.height);
            PROPOSALS.save(deps.storage, id, &proposal)?;

            Ok(Response::new().add_messages(messages).add_attributes(vec![
                ("action", "say_no"),
                ("proposal_id", id.to_string().as_str()),
                ("reply", reply.unwrap_or_default().as_str()),
                ("proposer", proposal.proposer.as_str()),
                ("receiver", proposal.receiver.as_str()),
                (
                    "total_refund_to_proposer",
                    &total_refund
                        .iter()
                        .map(|coin| coin.to_string())
                        .collect::<Vec<_>>()
                        .join(","),
                ),
            ]))
        }
        ExecuteMsg::UpdateConfig {
            successful_proposal_fee,
        } => {
            // only the owner of the contract can create a campaign
            cw_ownable::assert_owner(deps.storage, &info.sender)?;
            let mut config = CONFIG.load(deps.storage)?;

            if let Some(successful_proposal_fee) = successful_proposal_fee {
                config.successful_proposal_fee = successful_proposal_fee;
            }

            CONFIG.save(deps.storage, &config)?;

            Ok(Response::new().add_attributes(vec![
                ("action", "update_config"),
                (
                    "successful_proposal_fee",
                    &config.successful_proposal_fee.to_string(),
                ),
            ]))
        }

        ExecuteMsg::UpdateOwnership(action) => {
            Ok(
                cw_ownable::update_ownership(deps, &env.block, &info.sender, action).map(
                    |ownership| {
                        Response::default()
                            .add_attribute("action", "update_ownership")
                            .add_attributes(ownership.into_attributes())
                    },
                )?,
            )
        }
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> Result<Binary, StdError> {
    match msg {
        QueryMsg::Config {} => query_config(deps),
        QueryMsg::Proposal { id } => query_proposal(deps, id),
        QueryMsg::Proposals {
            limit,
            filter_by,
            status,
            sort,
        } => query_proposals(deps, limit, filter_by, status, sort),
        QueryMsg::Status {} => query_status(deps),
        QueryMsg::Ownership {} => Ok(to_json_binary(&cw_ownable::get_ownership(deps.storage)?)?),
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    validate_contract!(deps, CONTRACT_NAME, CONTRACT_VERSION);
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::default())
}

fn query_config(deps: Deps) -> Result<Binary, StdError> {
    let config = CONFIG.load(deps.storage)?;
    to_json_binary(&config)
}

fn query_proposal(deps: Deps, id: u64) -> Result<Binary, StdError> {
    let proposal = PROPOSALS.load(deps.storage, id)?;
    to_json_binary(&proposal)
}

fn query_proposals(
    deps: Deps,
    limit: Option<u32>,
    filter_by: Option<ProposalBy>,
    status: Option<ProposalStatus>,
    sort: Option<Order>,
) -> Result<Binary, StdError> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_ITEMS_LIMIT) as usize;
    let proposals = match filter_by {
        Some(ProposalBy::Proposer(proposer)) => {
            let proposer = deps.api.addr_validate(&proposer)?;
            let index = if let Some(status) = status {
                PROPOSALS
                    .idx
                    .status_by_proposer
                    .prefix((proposer.as_bytes().to_vec(), status.into()))
            } else {
                PROPOSALS.idx.proposer.prefix(proposer.to_string())
            };
            get_proposal_by_index_prefix(deps, index, sort, limit)?
        }
        Some(ProposalBy::Receiver(receiver)) => {
            let receiver = deps.api.addr_validate(&receiver)?;
            let index: cw_storage_plus::IndexPrefix<u64, Proposal, u64> =
                if let Some(status) = status {
                    PROPOSALS
                        .idx
                        .status_by_receiver
                        .prefix((receiver.as_bytes().to_vec(), status.into()))
                } else {
                    PROPOSALS.idx.receiver.prefix(receiver.to_string())
                };
            get_proposal_by_index_prefix(deps, index, sort, limit)?
        }
        None => PROPOSALS
            .range(deps.storage, None, None, sort.unwrap_or(Order::Ascending))
            .take(limit)
            .map(|item| {
                let (_, proposal) = item?;
                Ok(proposal)
            })
            .collect::<StdResult<Vec<Proposal>>>()?,
    };

    to_json_binary(&ProposalsResponse { proposals })
}

fn query_status(deps: Deps) -> Result<Binary, StdError> {
    let total_proposals = PROPOSAL_COUNTER.load(deps.storage)?;
    let total_proposals_yes = SUCCESSFUL_COUNTER.load(deps.storage)?;
    let total_proposals_no = FAILED_COUNTER.load(deps.storage)?;
    let total_proposals_cancelled = CANCELED_COUNTER.load(deps.storage)?;
    let total_proposals_pending = total_proposals - total_proposals_yes - total_proposals_no - total_proposals_cancelled;

    to_json_binary(&Status {
        total_proposals,
        total_proposals_pending,
        total_proposals_yes,
        total_proposals_no,
        total_proposals_cancelled,
    })
}

fn get_proposal_by_index_prefix(
    deps: Deps,
    index: IndexPrefix<u64, Proposal, u64>,
    sort: Option<Order>,
    limit: usize,
) -> StdResult<Vec<Proposal>> {
    let mut propsals = index
        .range(deps.storage, None, None, Order::Ascending)
        .take(limit)
        .map(|item| {
            let (_, proposal) = item?;
            Ok(proposal)
        })
        .collect::<StdResult<Vec<Proposal>>>()?;
    propsals.sort_by(|a, b| match sort {
        Some(Order::Ascending) => a.id.cmp(&b.id),
        Some(Order::Descending) => b.id.cmp(&a.id),
        None => a.id.cmp(&b.id),
    });
    Ok(propsals)
}
