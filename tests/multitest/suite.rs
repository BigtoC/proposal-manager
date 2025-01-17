use cosmwasm_std::{coin, Addr, Coin, Empty, StdResult, Timestamp, Uint128, Order};
use cw_multi_test::{
    App, AppBuilder, AppResponse, BankKeeper, Contract, ContractWrapper, Executor, MockApiBech32,
    WasmKeeper,
};

use proposal::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, ProposalBy, ProposalsResponse};
use proposal::proposal::state::{Config, Proposal, ProposalStatus};

type WasmApp = App<BankKeeper, MockApiBech32>;

pub fn proposal_contract() -> Box<dyn Contract<Empty>> {
    let contract = ContractWrapper::new(
        proposal::contract::execute,
        proposal::contract::instantiate,
        proposal::contract::query,
    )
    .with_migrate(proposal::contract::migrate);

    Box::new(contract)
}

pub struct TestingSuite {
    app: WasmApp,
    pub senders: [Addr; 4],
    pub proposal_contract_addr: Addr,
}

// helpers
impl TestingSuite {
    #[track_caller]
    pub fn admin(&mut self) -> Addr {
        self.senders.first().unwrap().clone()
    }

    #[track_caller]
    pub fn get_block(&mut self) -> u64 {
        self.app.block_info().height
    }

    #[track_caller]
    pub fn get_time(&mut self) -> Timestamp {
        self.app.block_info().time
    }

    #[track_caller]
    pub fn add_100_block(&mut self) -> &mut Self {
        let mut block_info = self.app.block_info();
        block_info.height += 10;
        self.app.set_block(block_info);

        self
    }
}

// instantiate
impl TestingSuite {
    #[track_caller]
    pub fn default_with_balances(initial_balances: Vec<Coin>) -> Self {
        let mut senders = vec![];
        let mut balances = vec![];

        let sender0 = "mantra1c758pr6v2zpgdl2rg2enmjedfglxjkac8m7syw";
        let sender1 = "mantra1jg390tyu84e86ntmzhakcst8gmxnelycwsatsq";
        let sender2 = "mantra1eujd63rrvtc02mt08qp7wfnuzhscgs3laxdgkx";
        let sender3 = "mantra1vyd2mkkrff99kawaqge94puq099ghfkyncntmd";

        senders.push(Addr::unchecked(sender0));
        senders.push(Addr::unchecked(sender1));
        senders.push(Addr::unchecked(sender2));
        senders.push(Addr::unchecked(sender3));

        balances.push((Addr::unchecked(sender0), initial_balances.clone()));
        balances.push((Addr::unchecked(sender1), initial_balances.clone()));
        balances.push((Addr::unchecked(sender2), initial_balances.clone()));
        balances.push((Addr::unchecked(sender3), initial_balances.clone()));

        let app = AppBuilder::new()
            .with_wasm(WasmKeeper::default())
            .with_wasm(WasmKeeper::default())
            .with_bank(BankKeeper::new())
            .with_api(MockApiBech32::new("mantra"))
            .build(|router, _api, storage| {
                balances.into_iter().for_each(|(account, amount)| {
                    router.bank.init_balance(storage, &account, amount).unwrap()
                });
            });

        TestingSuite {
            app,
            senders: senders.try_into().unwrap(),
            proposal_contract_addr: Addr::unchecked(""),
        }
    }

    #[track_caller]
    pub fn instantiate_proposal_contract(&mut self, owner: Option<String>) -> &mut Self {
        let msg = InstantiateMsg { owner, successful_proposal_fee: coin(100, "uom") };

        let proposal_contract_code_id = self.app.store_code(proposal_contract());
        let admin = self.admin();

        self.proposal_contract_addr = self
            .app
            .instantiate_contract(
                proposal_contract_code_id,
                admin.clone(),
                &msg,
                &[],
                "proposal-contract",
                Some(admin.into_string()),
            )
            .unwrap();

        self
    }
}

pub trait ResultHandler {
    fn handle_result(&self, result: Result<AppResponse, anyhow::Error>);
}

impl<F> ResultHandler for F
where
    F: Fn(Result<AppResponse, anyhow::Error>),
{
    fn handle_result(&self, result: Result<AppResponse, anyhow::Error>) {
        self(result);
    }
}

// execute msg
impl TestingSuite {
    fn execute_contract(
        &mut self,
        sender: &Addr,
        msg: ExecuteMsg,
        funds: &[Coin],
        result: impl ResultHandler,
    ) -> &mut Self {
        result.handle_result(self.app.execute_contract(
            sender.clone(),
            self.proposal_contract_addr.clone(),
            &msg,
            funds,
        ));

        self
    }

    #[track_caller]
    pub fn create_proposal(
        &mut self,
        sender: &Addr,
        title: Option<String>,
        speech: Option<String>,
        receiver: String,
        gift: Vec<Coin>,
        funds: &[Coin],
        result: impl ResultHandler,
    ) -> &mut Self {
        self.execute_contract(
            sender,
            ExecuteMsg::CreateProposal {
                title,
                speech,
                receiver,
                gift,
            },
            funds,
            result,
        )
    }

    #[track_caller]
    pub fn cancel_proposal(
        &mut self,
        sender: &Addr,
        id: u64,
        result: impl ResultHandler
    ) -> &mut Self {
        self.execute_contract(
            sender,
            ExecuteMsg::CancelProposal { id },
            &[],
            result
        )
    }

    #[track_caller]
    pub fn say_yes(
        &mut self,
        sender: &Addr,
        id: u64,
        reply: Option<String>,
        result: impl ResultHandler,
    ) -> &mut Self {
        self.execute_contract(sender, ExecuteMsg::Yes { id, reply }, &[], result)
    }

    #[track_caller]
    pub fn say_no(
        &mut self,
        sender: &Addr,
        id: u64,
        reply: Option<String>,
        result: impl ResultHandler,
    ) -> &mut Self {
        self.execute_contract(sender, ExecuteMsg::No { id, reply }, &[], result)
    }

    #[track_caller]
    pub fn update_config(
        &mut self,
        sender: &Addr,
        successful_proposal_fee: Option<Coin>,
        result: impl ResultHandler,
    ) -> &mut Self {
        self.execute_contract(
            sender,
            ExecuteMsg::UpdateConfig { successful_proposal_fee },
            &[],
            result,
        )
    }

    #[track_caller]
    pub fn update_ownership(
        &mut self,
        sender: &Addr,
        action: cw_ownable::Action,
        result: impl ResultHandler,
    ) -> &mut Self {
        self.execute_contract(sender, ExecuteMsg::UpdateOwnership(action), &[], result)
    }
}

// queries
impl TestingSuite {
    fn query_contract<T>(&mut self, msg: QueryMsg, result: impl Fn(StdResult<T>)) -> &mut Self
    where
        T: serde::de::DeserializeOwned,
    {
        let response: StdResult<T> = self
            .app
            .wrap()
            .query_wasm_smart(&self.proposal_contract_addr, &msg);

        result(response);

        self
    }

    #[track_caller]
    pub fn query_config(&mut self, result: impl Fn(StdResult<Config>)) -> &mut Self {
        self.query_contract(QueryMsg::Config {}, result)
    }

    #[track_caller]
    pub fn query_proposal(&mut self, id: u64, result: impl Fn(StdResult<Proposal>)) -> &mut Self {
        self.query_contract(QueryMsg::Proposal { id }, result)
    }
    
    #[track_caller]
    pub fn query_proposals(
        &mut self, 
        limit: Option<u32>,
        filter_by: Option<ProposalBy>,
        status: Option<ProposalStatus>,
        sort: Option<Order>,
        result: impl Fn(StdResult<ProposalsResponse>)
    ) -> &mut Self {
        self.query_contract(QueryMsg::Proposals {
            limit,
            filter_by,
            status,
            sort,
        }, result)
    }

    #[track_caller]
    pub fn _query_ownership(
        &mut self,
        result: impl Fn(StdResult<cw_ownable::Ownership<String>>),
    ) -> &mut Self {
        self.query_contract(QueryMsg::Ownership {}, result)
    }

    #[track_caller]
    pub fn query_balance(
        &mut self,
        denom: &str,
        address: &Addr,
        result: impl Fn(Uint128),
    ) -> &mut Self {
        let balance_response = self.app.wrap().query_balance(address, denom);
        result(balance_response.unwrap_or(coin(0, denom)).amount);
        self
    }
}
