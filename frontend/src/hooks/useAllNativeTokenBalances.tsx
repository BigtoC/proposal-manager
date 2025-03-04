import { useGetAllBalances, useMantra } from '@mantrachain/connect';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { assets as mainnetAssets } from 'chain-registry/mainnet';
import { assets as testnetAssets } from 'chain-registry/testnet';

import { Coin } from '@/__generated__/ProposalManager.types';
import { formatTokenBalance } from '@/utils/formatTokenBalance';
import { getAppConfig } from '@/utils/getAppConfig';

const isMainnet = getAppConfig().isMainnet;
const assets = isMainnet ? mainnetAssets : testnetAssets;
const chainName = isMainnet ? 'mantrachain' : 'mantrachaintestnet2';
const mantraAssets =
  assets.find((asset) => asset.chain_name === chainName)?.assets || [];

export const useAllNativeTokenBalances = () => {
  const { address } = useMantra();
  const { getAllBalances } = useGetAllBalances();

  return useQuery({
    queryKey: ['getAllNativeTokenBalances', address],
    queryFn: async () => {
      return await getAllBalances();
    },
    enabled: !!address,
    select: (data) => {
      // Filter balances to only include Mantra chain assets
      const filteredBalances =
        data?.filter((balance) =>
          mantraAssets.some((asset) => asset.base === balance.denom),
        ) || [];

      const mappedBalances = filteredBalances
        .map((balance) => {
          const foundAsset = mantraAssets.find(
            (asset) => asset.base === balance.denom,
          );
          const { denom, exponent } = foundAsset?.denom_units?.[1] ?? {};
          if (!denom || exponent === undefined) return null;
          return {
            base: balance.denom,
            amount: balance.amount,
            humanAmount: formatTokenBalance(balance.amount, exponent),
            exponent,
            denom,
          };
        })
        .filter(
          (balance): balance is NonNullable<typeof balance> => balance !== null,
        );
      return mappedBalances;
    },
  });
};

// convert the Coin type of base denom to symbol denom and scale the amount based on the exponent of the symbol denom in mantraAssets if any
export const convertLongToShortCoin = (coin: Coin): Coin => {
  const foundAsset = mantraAssets.find((asset) => asset.base === coin.denom);
  if (foundAsset === undefined) {
    return coin;
  } else {
    const displayDenom = foundAsset.display;
    const denomUnit = foundAsset.denom_units.find((denom_unit) => {
      return denom_unit.denom === displayDenom;
    });
    if (denomUnit === undefined) {
      return coin;
    } else {
      return {
        denom: displayDenom,
        amount: new BigNumber(coin.amount)
          .div(new BigNumber(10).pow(denomUnit.exponent))
          .toString(),
      };
    }
  }
};
