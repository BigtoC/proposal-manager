use cosmwasm_std::{
    ensure, Coin, MessageInfo,
    StdResult, Uint128
};
use std::collections::HashMap;

use crate::error::ContractError;

/// Validates that the proposal creation and gift fee are paid with the transaction.
/// Returns the total amount of fees paid.
pub fn validate_fees_are_paid(
    proposal_fee: &Coin,
    gift_fee: Vec<Coin>,
    info: &MessageInfo,
) -> Result<Vec<Coin>, ContractError> {
    let mut total_fees = vec![];

    let proposal_fee_denom = &proposal_fee.denom;
    // Check if the proposal fee denom is found in the vector of the gift possible fee denoms
    if let Some(gf_fee) = gift_fee.iter().find(|fee| &fee.denom == proposal_fee_denom) {
        // If the gift fee has only one option, check if the user paid the sum of the fees
        if gift_fee.len() == 1usize {
            let total_fee_amount = gf_fee.amount.checked_add(proposal_fee.amount)?;
            let paid_fee_amount = cw_utils::must_pay(info, proposal_fee_denom)?;

            ensure!(
                paid_fee_amount == total_fee_amount,
                ContractError::InvalidProposalCreationFee {
                    amount: paid_fee_amount,
                    expected: total_fee_amount,
                }
            );

            total_fees.push(Coin {
                denom: proposal_fee_denom.clone(),
                amount: total_fee_amount,
            });
        } else {
            // If the gift fee has multiple denom besides proposal_fee_denom, check if the user paid the proposal creation fee
            let paid_fee_in_proposal_denom =
                get_paid_proposal_fee_amount(info, proposal_fee_denom)?;

            ensure!(
                paid_fee_in_proposal_denom >= proposal_fee.amount,
                ContractError::InvalidProposalCreationFee {
                    amount: paid_fee_in_proposal_denom,
                    expected: proposal_fee.amount,
                }
            );

            total_fees.push(Coin {
                denom: proposal_fee_denom.clone(),
                amount: proposal_fee.amount,
            });

            // Check if the user paid the gift fee in proposal_fee_denom
            let mut gf_fee_paid_in_proposal_fee_denom = Uint128::zero();
            let gf_fee_paid = gift_fee
                .iter()
                .filter(|fee| &fee.denom == proposal_fee_denom)
                .any(|fee| {
                    gf_fee_paid_in_proposal_fee_denom = info
                        .funds
                        .iter()
                        .filter(|fund| fund.denom == fee.denom)
                        .map(|fund| fund.amount)
                        .try_fold(Uint128::zero(), |acc, amount| acc.checked_add(amount))
                        .unwrap_or(Uint128::zero());

                    gf_fee_paid_in_proposal_fee_denom = gf_fee_paid_in_proposal_fee_denom
                        .checked_sub(proposal_fee.amount)
                        .unwrap_or(Uint128::zero());
                    total_fees.push(Coin {
                        denom: fee.denom.clone(),
                        amount: gf_fee_paid_in_proposal_fee_denom,
                    });

                    gf_fee_paid_in_proposal_fee_denom == fee.amount
                });

            let remaining_funds = paid_fee_in_proposal_denom
                .checked_sub(gf_fee_paid_in_proposal_fee_denom)?
                .checked_sub(proposal_fee.amount)?;

            ensure!(remaining_funds.is_zero(), ContractError::ExtraFundsSent);
            ensure!(gf_fee_paid, ContractError::GiftFeeNotPaid);

            // Check if the user paid the gift fee in any other of the allowed denoms
            let gf_fee_paid = gift_fee
                .iter()
                .filter(|fee| &fee.denom != proposal_fee_denom)
                .all(|fee| {
                    let paid_fee_amount = info
                        .funds
                        .iter()
                        .filter(|fund| fund.denom == fee.denom)
                        .map(|fund| fund.amount)
                        .try_fold(Uint128::zero(), |acc, amount| acc.checked_add(amount))
                        .unwrap_or(Uint128::zero());

                    total_fees.push(Coin {
                        denom: fee.denom.clone(),
                        amount: paid_fee_amount,
                    });

                    paid_fee_amount == fee.amount
                });

            ensure!(gf_fee_paid, ContractError::GiftFeeNotPaid);

            total_fees = aggregate_coins(total_fees)?;
        }
    } else {
        // If the proposal fee denom is not found in the vector of the gift possible fee denoms,
        // check if the user paid the proposal creation fee and the gift fee separately
        let paid_proposal_fee_amount = get_paid_proposal_fee_amount(info, proposal_fee_denom)?;

        ensure!(
            paid_proposal_fee_amount == proposal_fee.amount,
            ContractError::InvalidProposalCreationFee {
                amount: paid_proposal_fee_amount,
                expected: proposal_fee.amount,
            }
        );

        total_fees.push(Coin {
            denom: proposal_fee_denom.clone(),
            amount: paid_proposal_fee_amount,
        });

        let gf_fee_paid = gift_fee.iter().all(|fee| {
            let paid_fee_amount = info
                .funds
                .iter()
                .filter(|fund| fund.denom == fee.denom)
                .map(|fund| fund.amount)
                .try_fold(Uint128::zero(), |acc, amount| acc.checked_add(amount))
                .unwrap_or(Uint128::zero());

            total_fees.push(Coin {
                denom: fee.denom.clone(),
                amount: paid_fee_amount,
            });

            paid_fee_amount == fee.amount
        });

        ensure!(gf_fee_paid, ContractError::GiftFeeNotPaid);
    }

    Ok(aggregate_coins(total_fees)?)
}

/// gets the proposal creation fee paid by the user
fn get_paid_proposal_fee_amount(
    info: &MessageInfo,
    proposal_fee_denom: &String,
) -> Result<Uint128, ContractError> {
    Ok(info
        .funds
        .iter()
        .filter(|fund| &fund.denom == proposal_fee_denom)
        .map(|fund| fund.amount)
        .try_fold(Uint128::zero(), |acc, amount| acc.checked_add(amount))?)
}

/// Validates that no additional funds besides the fees for the proposal creation were sent with the transaction.
pub(crate) fn validate_no_additional_funds_sent_with_proposal_creation(
    info: &MessageInfo,
    total_fees: Vec<Coin>,
) -> Result<(), ContractError> {
    // check that the user didn't send more tokens in info.funds than the ones in total_fees

    // check if there's any coins in info.funds that are not in total_fees
    let extra_funds = info
        .funds
        .iter()
        .filter(|fund| !total_fees.iter().any(|fee| fee.denom == fund.denom))
        .collect::<Vec<_>>();

    ensure!(extra_funds.is_empty(), ContractError::ExtraFundsSent);

    Ok(())
}

/// Aggregates coins from vectors, summing up the amounts of coins that are the same.
pub fn aggregate_coins(coins: Vec<Coin>) -> StdResult<Vec<Coin>> {
    let mut aggregation_map: HashMap<String, Uint128> = HashMap::new();

    // aggregate coins by denom
    for coin in coins {
        if let Some(existing_amount) = aggregation_map.get_mut(&coin.denom) {
            *existing_amount = existing_amount.checked_add(coin.amount)?;
        } else {
            aggregation_map.insert(coin.denom.clone(), coin.amount);
        }
    }

    // create a new vector from the aggregation map
    let mut aggregated_coins: Vec<Coin> = Vec::new();
    for (denom, amount) in aggregation_map {
        aggregated_coins.push(Coin { denom, amount });
    }

    // sort coins by denom
    aggregated_coins.sort_by(|a, b| a.denom.cmp(&b.denom));

    Ok(aggregated_coins)
}

/// Validates the contract version and name.
#[macro_export]
macro_rules! validate_contract {
    ($deps:expr, $contract_name:expr, $contract_version:expr) => {{
        let stored_contract_name = cw2::CONTRACT.load($deps.storage)?.contract;
        cosmwasm_std::ensure!(
            stored_contract_name == $contract_name,
            cosmwasm_std::StdError::generic_err("Contract name mismatch")
        );

        let version: semver::Version = $contract_version.parse()?;
        let storage_version: semver::Version =
            cw2::get_contract_version($deps.storage)?.version.parse()?;

        cosmwasm_std::ensure!(
            storage_version < version,
            ContractError::MigrateInvalidVersion {
                current_version: storage_version,
                new_version: version,
            }
        );
    }};
}
