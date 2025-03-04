#[allow(unused_imports)]
use crate::proposal::state::{Config, Proposal, ProposalStatus};
use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Coin, Order};
use cw_ownable::{cw_ownable_execute, cw_ownable_query};

#[cw_serde]
pub struct InstantiateMsg {
    /// The owner of the contract.
    pub owner: Option<String>,
    /// The fee that the owner will receive for each successful proposal
    pub successful_proposal_fee: Coin,
}

#[cw_ownable_execute]
#[cw_serde]
pub enum ExecuteMsg {
    /// Creates a proposal.
    CreateProposal {
        /// The proposal's title.
        title: Option<String>,
        /// The proposal's speech.
        speech: Option<String>,
        /// The receiver's address that will receive the proposal
        receiver: String,
        /// The amount of coins that will be sent to the partner as a gift, can be empty.
        gift: Vec<Coin>,
    },
    /// Cancels a proposal.
    CancelProposal {
        /// The proposal's ID.
        id: u64,
    },
    /// Say yes to a proposal.
    Yes {
        /// The proposal's ID.
        id: u64,
        /// why you say yes
        reply: Option<String>,
    },
    /// Say no to a proposal.
    No {
        /// The proposal's ID.
        id: u64,
        /// why you say no
        reply: Option<String>,
    },
    /// update contract config
    /// Only the owner can execute this message.
    UpdateConfig {
        /// The new fee that the owner will receive for each successful proposal
        successful_proposal_fee: Option<Coin>,
    },
}

#[cw_ownable_query]
#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Retrieves the configuration
    #[returns(Config)]
    Config {},

    #[returns(Proposal)]
    Proposal { id: u64 },

    #[returns(ProposalsResponse)]
    Proposals {
        limit: Option<u32>,
        filter_by: Option<ProposalBy>,
        status: Option<ProposalStatus>,
        /// Sort proposals by id
        sort: Option<Order>,
    },

    #[returns(Status)]
    Status {},
}

#[cw_serde]
pub struct MigrateMsg {}

#[cw_serde]
pub struct ProposalsResponse {
    pub proposals: Vec<Proposal>,
}

#[cw_serde]
pub struct Status {
    pub total_proposals: u64,
    pub total_proposals_pending: u64,
    pub total_proposals_yes: u64,
    pub total_proposals_no: u64,
    pub total_proposals_cancelled: u64,
}

/// Filter proposals by proposer or receiver
#[cw_serde]
pub enum ProposalBy {
    Proposer(String),
    Receiver(String),
}
