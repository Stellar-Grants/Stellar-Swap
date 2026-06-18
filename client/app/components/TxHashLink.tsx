import { FiExternalLink } from "react-icons/fi";

type TxHashLinkProps = {
  hash: string;
  className?: string;
};

const TxHashLink = ({ hash, className = "" }: TxHashLinkProps) => {
  return (
    <a
      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline ${className}`}
    >
      View
      <FiExternalLink aria-hidden="true" className="h-4 w-4" />
      <span className="sr-only">transaction on Stellar Expert</span>
    </a>
  );
};

export default TxHashLink;
