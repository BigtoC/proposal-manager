export const getAppConfig = () => {
  return {
    omDenom: 'uom',
    isMainnet: import.meta.env.VITE_NETWORK === 'mainnet',
    proposalContractAddress:
      import.meta.env.VITE_PROPOSAL_MANAGER_ADDRESS ||
      'mantra17p9u09rgfd2nwr52ayy0aezdc42r2xd2g5d70u00k5qyhzjqf89q08tazu2',
  };
};
