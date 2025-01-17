
# Proposal Contract

A CosmWasm smart contract that enables users to create and manage proposals with optional gifts. The contract facilitates proposal creation, responses, and gift transfers between proposers and receivers.

## Features

- Create proposals with optional titles, speeches, and gifts
- Cancel pending proposals
- Respond to proposals (Yes/No) with optional replies
- Query proposals by proposer, receiver, or status
- Configurable proposal fee system
- Owner-controlled contract configuration

## Contract Structure

### Messages

#### InstantiateMsg
- `owner`: Optional contract owner address
- `successful_proposal_fee`: Fee charged for successful proposals

#### ExecuteMsg
- `CreateProposal`: Create a new proposal with optional gift
- `CancelProposal`: Cancel a pending proposal
- `Yes`: Accept a proposal with optional reply
- `No`: Reject a proposal with optional reply
- `UpdateConfig`: Update contract configuration (owner only)
- `UpdateOwnership`: Transfer or renounce contract ownership

#### QueryMsg
- `Config`: Get contract configuration
- `Proposal`: Get proposal details by ID
- `Proposals`: List proposals with optional filters
- `Ownership`: Get current contract ownership

### State

#### Proposal
- `id`: Unique proposal identifier
- `proposer`: Address of proposal creator
- `receiver`: Address of proposal recipient
- `gift`: Optional coins to be transferred
- `fee`: Proposal fee
- `title`: Optional proposal title
- `speech`: Optional proposal message
- `reply`: Optional response message
- `status`: Current proposal status
- `created_at`: Block height at creation
- `replied_at`: Block height at response

## Usage

### Build
