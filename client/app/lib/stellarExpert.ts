export type StellarNetwork = "testnet" | "mainnet";

// Network used for Stellar Expert explorer links. Reads NEXT_PUBLIC_STELLAR_NETWORK
// (build-time env), defaulting to "testnet".
export const getStellarNetwork = (): StellarNetwork =>
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";

const explorerBase = (network: StellarNetwork) =>
  `https://stellar.expert/explorer/${network === "mainnet" ? "public" : "testnet"}`;

export const txExplorerUrl = (hash: string, network = getStellarNetwork()) =>
  `${explorerBase(network)}/tx/${hash}`;

export const liquidityPoolExplorerUrl = (id: string, network = getStellarNetwork()) =>
  `${explorerBase(network)}/liquidity-pool/${id}`;
