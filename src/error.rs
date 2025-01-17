use cosmwasm_std::{
    CheckedMultiplyFractionError, DivideByZeroError, Instantiate2AddressError, OverflowError,
    StdError, Uint128,
};
use cw_migrate_error_derive::cw_migrate_invalid_version_error;
use cw_ownable::OwnershipError;
use cw_utils::PaymentError;
use thiserror::Error;

#[cw_migrate_invalid_version_error]
#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    // Handle all normal errors from the StdError
    #[error("{0}")]
    Std(#[from] StdError),

    // Handle errors specific to payments from cw-util
    #[error("{0}")]
    PaymentError(#[from] PaymentError),

    #[error(transparent)]
    Instantiate2Error(#[from] Instantiate2AddressError),

    // Handle ownership errors from cw-ownable
    #[error("{0}")]
    OwnershipError(#[from] OwnershipError),

    // Handle Upgrade/Migrate related semver errors
    #[error("Semver parsing error: {0}")]
    SemVer(String),

    #[error("Unauthorized")]
    Unauthorized,
    // Add any other custom errors you like here.
    // Look at https://docs.rs/thiserror/1.0.21/thiserror/ for details.
    #[error("The provided assets are both the same")]
    SameAsset,

    #[error(
        "Assertion failed; can only cancel proposal in pending status, swap amount: {current_status}"
    )]
    CancelProposalInvalidStatus { current_status: String },

    #[error("An overflow occurred when attempting to construct a decimal")]
    DecimalOverflow,

    #[error("{0}")]
    OverflowError(#[from] OverflowError),

    #[error(transparent)]
    CheckedMultiplyFractionError(#[from] CheckedMultiplyFractionError),

    #[error(transparent)]
    DivideByZeroError(#[from] DivideByZeroError),

    #[error("Invalid pool creation fee, expected {expected} got {amount}")]
    InvalidProposalCreationFee { amount: Uint128, expected: Uint128 },

    #[error("Pool creation fee was not included")]
    ProposalCreationFeeMissing,

    #[error("Additional funds were sent with proposal creation, expected proposal creation and gift fees only")]
    ExtraFundsSent,

    #[error("The gift fee was not paid.")]
    GiftFeeNotPaid,

    #[error("The receiver cannot be the proposer")]
    InvalidReceiver,
}

impl From<semver::Error> for ContractError {
    fn from(err: semver::Error) -> Self {
        Self::SemVer(err.to_string())
    }
}
