"use client";

import { FormEvent, useState } from "react";
import {
  FiActivity,
  FiCheckCircle,
  FiCreditCard,
  FiLink,
  FiMinusCircle,
  FiPlusCircle,
  FiRepeat,
} from "react-icons/fi";
import toast from "react-hot-toast";
import TxHashLink from "../TxHashLink";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://nexus-swap-server.vercel.app";
const PAGE_SIZE = 20;

type ReserveAmount = {
  asset: string;
  amount: string;
};

type AccountOperation = {
  id: string;
  type: string;
  createdAt: string;
  transactionHash: string;
  liquidityPoolId?: string;
  reservesDeposited?: ReserveAmount[];
  reservesReceived?: ReserveAmount[];
  sharesReceived?: string;
  sharesRedeemed?: string;
  from?: string;
  to?: string;
  sourceAsset?: string;
  sourceAmount?: string;
  destAsset?: string;
  destAmount?: string;
  trustor?: string;
  asset?: string;
  amount?: string;
  limit?: string;
};

type HistoryResponse = {
  operations: AccountOperation[];
  nextCursor: string | null;
};

const labels: Record<string, string> = {
  liquidity_pool_deposit: "Add Liquidity",
  liquidity_pool_withdraw: "Remove Liquidity",
  path_payment_strict_receive: "Swap",
  path_payment_strict_send: "Swap",
  change_trust: "Trust Line",
  payment: "Payment",
  create_account: "Create Account",
  account_merge: "Account Merge",
};

const iconClasses = "h-4 w-4";

function OperationIcon({ type }: { type: string }) {
  if (type === "liquidity_pool_deposit") {
    return <FiPlusCircle aria-hidden="true" className={iconClasses} />;
  }

  if (type === "liquidity_pool_withdraw") {
    return <FiMinusCircle aria-hidden="true" className={iconClasses} />;
  }

  if (type === "path_payment_strict_receive" || type === "path_payment_strict_send") {
    return <FiRepeat aria-hidden="true" className={iconClasses} />;
  }

  if (type === "change_trust") {
    return <FiLink aria-hidden="true" className={iconClasses} />;
  }

  if (type === "payment") {
    return <FiCreditCard aria-hidden="true" className={iconClasses} />;
  }

  return <FiActivity aria-hidden="true" className={iconClasses} />;
}

function assetName(asset: string) {
  if (asset === "native") {
    return "XLM";
  }

  return asset.split(":")[0] || asset;
}

function formatReserves(reserves?: ReserveAmount[]) {
  if (!reserves?.length) {
    return null;
  }

  return reserves.map((reserve) => `${reserve.amount} ${assetName(reserve.asset)}`).join(", ");
}

function formatTimeAgo(value: string) {
  const createdAt = new Date(value).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function operationLabel(type: string) {
  return labels[type] || type.replaceAll("_", " ");
}

function operationDetails(operation: AccountOperation) {
  if (operation.type === "liquidity_pool_deposit") {
    const reserves = formatReserves(operation.reservesDeposited);
    return [
      reserves ? `Deposited ${reserves}` : "Liquidity pool deposit",
      operation.sharesReceived ? `received ${operation.sharesReceived} shares` : null,
    ]
      .filter(Boolean)
      .join("; ");
  }

  if (operation.type === "liquidity_pool_withdraw") {
    const reserves = formatReserves(operation.reservesReceived);
    return [
      reserves ? `Received ${reserves}` : "Liquidity pool withdrawal",
      operation.sharesRedeemed ? `redeemed ${operation.sharesRedeemed} shares` : null,
    ]
      .filter(Boolean)
      .join("; ");
  }

  if (operation.type === "path_payment_strict_receive" || operation.type === "path_payment_strict_send") {
    return `${operation.sourceAmount || "?"} ${operation.sourceAsset || "source asset"} to ${
      operation.destAmount || "?"
    } ${operation.destAsset || "destination asset"}`;
  }

  if (operation.type === "change_trust") {
    return `Trust ${assetName(operation.asset || "asset")}${
      operation.limit ? ` up to ${operation.limit}` : ""
    }`;
  }

  if (operation.type === "payment") {
    return `${operation.amount || "?"} ${operation.asset || "asset"} from ${
      operation.from || "unknown"
    } to ${operation.to || "unknown"}`;
  }

  return "Operation completed";
}

const AccountHistory = () => {
  const [publicKey, setPublicKey] = useState("");
  const [operations, setOperations] = useState<AccountOperation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async (cursor?: string | null) => {
    const trimmedPublicKey = publicKey.trim();

    if (!trimmedPublicKey) {
      toast.error("Enter a public key to view history.");
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(
        `${API_BASE_URL}/account-history/${encodeURIComponent(trimmedPublicKey)}?${params.toString()}`
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to fetch transaction history");
      }

      const history = payload as HistoryResponse;
      setOperations((currentOperations) =>
        cursor ? [...currentOperations, ...history.operations] : history.operations
      );
      setNextCursor(history.nextCursor);
      setHasSearched(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch transaction history";
      toast.error(message);
      if (!cursor) {
        setOperations([]);
        setNextCursor(null);
        setHasSearched(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchHistory();
  };

  return (
    <div className="relative min-h-screen bg-slate-100 px-4 py-28 text-slate-900">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url("/blockchaingif.gif")',
          filter: "blur(6px)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-lg bg-white/90 p-6 shadow-lg">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-blue-700">Transaction History</h1>
            <p className="text-sm text-slate-600">
              Review completed swaps, liquidity operations, trust lines, and payments for any Stellar testnet public key.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
            <label className="sr-only" htmlFor="history-public-key">
              Stellar public key
            </label>
            <input
              id="history-public-key"
              type="text"
              value={publicKey}
              onChange={(event) => setPublicKey(event.target.value)}
              placeholder="Enter Stellar public key"
              className="min-h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-blue-700 px-5 font-semibold text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <FiCheckCircle aria-hidden="true" className="h-4 w-4" />
              {isLoading ? "Loading" : "View History"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-lg bg-white/95 shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 font-semibold">Time</th>
                  <th className="whitespace-nowrap px-5 py-4 font-semibold">Type</th>
                  <th className="min-w-[260px] px-5 py-4 font-semibold">Details</th>
                  <th className="whitespace-nowrap px-5 py-4 font-semibold">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {operations.map((operation) => (
                  <tr key={operation.id} className="hover:bg-blue-50">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      <time dateTime={operation.createdAt}>{formatTimeAgo(operation.createdAt)}</time>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
                        <OperationIcon type={operation.type} />
                        {operationLabel(operation.type)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{operationDetails(operation)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <TxHashLink hash={operation.transactionHash} />
                    </td>
                  </tr>
                ))}
                {!operations.length && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-slate-600">
                      {hasSearched
                        ? "No operations found for this account."
                        : "Enter a public key to load transaction history."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {nextCursor && (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-center">
              <button
                type="button"
                onClick={() => fetchHistory(nextCursor)}
                disabled={isLoading}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-blue-700 px-5 font-semibold text-blue-700 hover:bg-blue-700 hover:text-white disabled:cursor-not-allowed disabled:border-slate-400 disabled:text-slate-400"
              >
                {isLoading ? "Loading" : "Load more"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AccountHistory;
