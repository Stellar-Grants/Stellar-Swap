import { FiExternalLink } from "react-icons/fi";
import {
  getStellarNetwork,
  txExplorerUrl,
  type StellarNetwork,
} from "../lib/stellarExpert";

type TxHashLinkProps = {
  hash: string;
  network?: StellarNetwork;
  className?: string;
};

const shorten = (hash: string) =>
  hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash;

const TxHashLink = ({ hash, network = getStellarNetwork(), className = "" }: TxHashLinkProps) => {
  return (
    <a
      href={txExplorerUrl(hash, network)}
      target="_blank"
      rel="noopener noreferrer"
      title={hash}
      className={`inline-flex items-center gap-1 font-mono font-semibold text-blue-700 hover:text-blue-900 hover:underline break-all ${className}`}
    >
      {shorten(hash)}
      <FiExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="sr-only">View transaction on Stellar Expert</span>
    </a>
  );
};

export default TxHashLink;
