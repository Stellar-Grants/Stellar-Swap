interface LiquidityPoolLinkProps {
  lpId: string;
  network?: "testnet" | "mainnet";
}

function getDefaultNetwork(): "testnet" | "mainnet" {
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
  ) {
    return "mainnet";
  }
  return "testnet";
}

function truncateId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}...${id.slice(-8)}`;
}

const LiquidityPoolLink: React.FC<LiquidityPoolLinkProps> = ({
  lpId,
  network = getDefaultNetwork(),
}) => {
  const explorerBase =
    network === "mainnet"
      ? "https://stellar.expert/explorer/public/liquidity-pool"
      : "https://stellar.expert/explorer/testnet/liquidity-pool";

  return (
    <a
      href={`${explorerBase}/${lpId}`}
      target="_blank"
      rel="noopener noreferrer"
      title={lpId}
      className="block font-mono text-blue-600 underline hover:text-blue-800 break-all"
    >
      {truncateId(lpId)}
    </a>
  );
};

export default LiquidityPoolLink;
