import { FiExternalLink } from "react-icons/fi";

type TxHashLinkProps = {
  hash: string;
  className?: string;
  network?: "testnet" | "mainnet";
  showHash?: boolean;
};

function getDefaultNetwork(): "testnet" | "mainnet" {
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
  ) {
    return "mainnet";
  }
  return "testnet";
}

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

const TxHashLink = ({
  hash,
  className = "",
  network = getDefaultNetwork(),
  showHash = false,
}: TxHashLinkProps) => {
  const explorerBase =
    network === "mainnet"
      ? "https://stellar.expert/explorer/public/tx"
      : "https://stellar.expert/explorer/testnet/tx";

  return (
    <a
      href={`${explorerBase}/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      title={hash}
      className={`inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline ${className}`}
    >
      {showHash ? (
        <span className="font-mono">{truncateHash(hash)}</span>
      ) : (
        <>
          View
          <FiExternalLink aria-hidden="true" className="h-4 w-4" />
        </>
      )}
      <span className="sr-only">transaction on Stellar Expert</span>
    </a>
  );
};

export default TxHashLink;
