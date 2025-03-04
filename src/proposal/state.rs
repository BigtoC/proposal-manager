use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Coin};
use cw_storage_plus::{index_list, IndexedMap, Item, MultiIndex};
use std::fmt;

pub const MAX_ITEMS_LIMIT: u32 = 100;
pub const DEFAULT_LIMIT: u32 = 10;
pub const CONFIG: Item<Config> = Item::new("config");
pub const PROPOSAL_COUNTER: Item<u64> = Item::new("proposal_count");
pub const SUCCESSFUL_COUNTER: Item<u64> = Item::new("successful_proposals");
pub const FAILED_COUNTER: Item<u64> = Item::new("failed_proposals");
pub const CANCELED_COUNTER: Item<u64> = Item::new("canceled_proposals");
pub const PROPOSALS: IndexedMap<u64, Proposal, ProposalIndexes> = IndexedMap::new(
    "proposals",
    ProposalIndexes {
        proposer: MultiIndex::new(
            |_pk, p| p.proposer.to_string(),
            "proposals",
            "proposals__proposer",
        ),
        status_by_proposer: MultiIndex::new(
            |_pk, p| (p.receiver.as_bytes().to_vec(), p.status.clone().into()),
            "proposals",
            "proposals__status_by_proposer",
        ),
        receiver: MultiIndex::new(
            |_pk, p| p.receiver.to_string(),
            "proposals",
            "proposals__receiver",
        ),
        status_by_receiver: MultiIndex::new(
            |_pk, p| (p.receiver.as_bytes().to_vec(), p.status.clone().into()),
            "proposals",
            "proposals__status_by_receiver",
        ),
    },
);

#[index_list(Proposal)]
pub struct ProposalIndexes<'a> {
    pub proposer: MultiIndex<'a, String, Proposal, u64>,
    pub status_by_proposer: MultiIndex<'a, (Vec<u8>, u8), Proposal, u64>,
    pub receiver: MultiIndex<'a, String, Proposal, u64>,
    pub status_by_receiver: MultiIndex<'a, (Vec<u8>, u8), Proposal, u64>,
}

/// The contract configuration.
#[cw_serde]
pub struct Config {
    /// The fee that the owner will receive for each successful proposal
    pub successful_proposal_fee: Coin,
}

#[cw_serde]
pub struct Proposal {
    pub id: u64,
    pub proposer: Addr,
    pub receiver: Addr,
    pub gift: Vec<Coin>,
    pub fee: Coin,
    pub title: Option<String>,
    pub speech: Option<String>,
    pub reply: Option<String>,
    pub status: ProposalStatus,
    pub created_at: u64,
    pub replied_at: Option<u64>,
}

#[cw_serde]
pub enum ProposalStatus {
    Pending,
    Yes,
    No,
}

impl From<ProposalStatus> for u8 {
    fn from(status: ProposalStatus) -> u8 {
        match status {
            ProposalStatus::Pending => 0,
            ProposalStatus::Yes => 1,
            ProposalStatus::No => 2,
        }
    }
}

impl fmt::Display for ProposalStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ProposalStatus::Pending => write!(f, "Pending"),
            ProposalStatus::Yes => write!(f, "Yes"),
            ProposalStatus::No => write!(f, "No"),
        }
    }
}
