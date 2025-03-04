import { MsgExecuteContractEncodeObject } from '@cosmjs/cosmwasm-stargate';
import { useCosmWasmClients, useMantra } from '@mantrachain/connect';
import { useCallback } from 'react';

export const useCalculateGasFee = () => {
  const { address: walletAddress } = useMantra();
  const { signingCosmWasmClient } = useCosmWasmClients();

  const calculateGasFee = useCallback(
    async (messages: MsgExecuteContractEncodeObject[]) => {
      if (!walletAddress) {
        throw new Error('walletAddress not found');
      }
      if (!signingCosmWasmClient) {
        throw new Error('signingCosmWasmClient not found');
      }

      const gasAmount = await signingCosmWasmClient.simulate(
        walletAddress,
        messages,
        undefined,
      );

      const gasResponse = await fetch(
        'https://rest.cosmos.directory/mantrachain/feemarket/v1/gas_price/uom',
      );
      const gasJson = await gasResponse.json();
      const fee = {
        gas: Math.ceil(gasAmount * 1.2).toString(),
        amount: [gasJson.price],
      };

      return fee;

      // old code
      // const adjustedGas = Math.ceil(gasAmount * 1.2);
      // const gasPrice = 0.01; // Define your desired gas price in uom per gas unit
      // const feeAmount = Math.ceil(adjustedGas * gasPrice);

      // return {
      //   amount: [{ denom: 'uom', amount: feeAmount.toString() }],
      //   gas: adjustedGas.toString(),
      // };
    },
    [signingCosmWasmClient, walletAddress],
  );

  return { calculateGasFee };
};
