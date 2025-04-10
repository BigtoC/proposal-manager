/**
* This file was automatically generated by @cosmwasm/ts-codegen@1.12.0.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

import { MsgExecuteContractEncodeObject } from "@cosmjs/cosmwasm-stargate";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { toUtf8 } from "@cosmjs/encoding";
import { Uint128, InstantiateMsg, Coin, ExecuteMsg, Action, Expiration, Timestamp, Uint64, QueryMsg, ProposalBy, Order, ProposalStatus, Config, OwnershipForString, Addr, Proposal, ProposalsResponse, Status } from "./ProposalManager.types";
export interface ProposalManagerMsg {
  contractAddress: string;
  sender: string;
  createProposal: ({
    gift,
    receiver,
    speech,
    title
  }: {
    gift: Coin[];
    receiver: string;
    speech?: string;
    title?: string;
  }, funds_?: Coin[]) => MsgExecuteContractEncodeObject;
  cancelProposal: ({
    id
  }: {
    id: number;
  }, funds_?: Coin[]) => MsgExecuteContractEncodeObject;
  yes: ({
    id,
    reply
  }: {
    id: number;
    reply?: string;
  }, funds_?: Coin[]) => MsgExecuteContractEncodeObject;
  no: ({
    id,
    reply
  }: {
    id: number;
    reply?: string;
  }, funds_?: Coin[]) => MsgExecuteContractEncodeObject;
  updateConfig: ({
    successfulProposalFee
  }: {
    successfulProposalFee?: Coin;
  }, funds_?: Coin[]) => MsgExecuteContractEncodeObject;
  updateOwnership: (action: Action, funds_?: Coin[]) => MsgExecuteContractEncodeObject;
}
export class ProposalManagerMsgComposer implements ProposalManagerMsg {
  sender: string;
  contractAddress: string;
  constructor(sender: string, contractAddress: string) {
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.createProposal = this.createProposal.bind(this);
    this.cancelProposal = this.cancelProposal.bind(this);
    this.yes = this.yes.bind(this);
    this.no = this.no.bind(this);
    this.updateConfig = this.updateConfig.bind(this);
    this.updateOwnership = this.updateOwnership.bind(this);
  }
  createProposal = ({
    gift,
    receiver,
    speech,
    title
  }: {
    gift: Coin[];
    receiver: string;
    speech?: string;
    title?: string;
  }, funds_?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          create_proposal: {
            gift,
            receiver,
            speech,
            title
          }
        })),
        funds: funds_
      })
    };
  };
  cancelProposal = ({
    id
  }: {
    id: number;
  }, funds_?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          cancel_proposal: {
            id
          }
        })),
        funds: funds_
      })
    };
  };
  yes = ({
    id,
    reply
  }: {
    id: number;
    reply?: string;
  }, funds_?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          yes: {
            id,
            reply
          }
        })),
        funds: funds_
      })
    };
  };
  no = ({
    id,
    reply
  }: {
    id: number;
    reply?: string;
  }, funds_?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          no: {
            id,
            reply
          }
        })),
        funds: funds_
      })
    };
  };
  updateConfig = ({
    successfulProposalFee
  }: {
    successfulProposalFee?: Coin;
  }, funds_?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          update_config: {
            successful_proposal_fee: successfulProposalFee
          }
        })),
        funds: funds_
      })
    };
  };
  updateOwnership = (action: Action, funds_?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          update_ownership: action
        })),
        funds: funds_
      })
    };
  };
}