"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import CopyButton from "../CopyButton";

interface Balance {
    assetType: string;
    assetCode: string;
    issuer: string | null;
    balance: string;
    liquidityPoolId: string | null;
}

interface AccountInfo {
    publicKey: string;
    sequenceNumber: string;
    balances: Balance[];
}

const AccountDashboard: React.FC = () => {
    const [publicKey, setPublicKey] = useState<string>("");
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAccountInfo = async () => {
        const key = publicKey.trim();
        if (!key) {
            toast.error("Please enter a public key");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAccountInfo(null);

        try {
            const response = await fetch(
                `https://nexus-swap-server.vercel.app/account-info/${key}`
            );
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to fetch account info");
                toast.error(data.error || "Failed to fetch account info");
            } else {
                setAccountInfo(data);
            }
        } catch {
            const msg = "Error fetching account info";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        fetchAccountInfo();
    };

    const sortedBalances = accountInfo
        ? [...accountInfo.balances].sort((a, b) => {
              if (a.assetType === "native") return -1;
              if (b.assetType === "native") return 1;
              if (a.assetType === "liquidity_pool_shares") return 1;
              if (b.assetType === "liquidity_pool_shares") return -1;
              return 0;
          })
        : [];

    return (
        <div className="relative min-h-screen flex items-start justify-center bg-gray-200">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: 'url("/blockchaingif.gif")',
                    filter: "blur(6px)",
                }}
            ></div>
            <div className="relative max-w-4xl w-full mx-auto p-8 mt-[90px] mb-[20px] bg-gray-300 bg-opacity-90 rounded-lg shadow-lg">
                <h2 className="text-4xl font-bold mb-8 text-center text-blue-600">
                    Account Dashboard
                </h2>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        value={publicKey}
                        onChange={(e) => setPublicKey(e.target.value)}
                        placeholder="Enter Stellar public key (G...)"
                        className="flex-1 h-[44px] bg-gray-100 text-black rounded-md px-3 border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`py-2 px-6 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-300 ease-in-out ${isLoading ? "opacity-50" : ""}`}
                    >
                        {isLoading ? "Loading..." : "View Balances"}
                    </button>
                </form>

                {error && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                {accountInfo && (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <p className="text-sm text-gray-500">Public Key</p>
                            <p className="font-mono text-sm text-gray-800 break-all">{accountInfo.publicKey}</p>
                            <p className="text-sm text-gray-500 mt-2">Sequence Number: <span className="text-gray-800">{accountInfo.sequenceNumber}</span></p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Asset</th>
                                        <th className="px-4 py-3">Balance</th>
                                        <th className="px-4 py-3">Issuer</th>
                                        <th className="px-4 py-3">LP Pool ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedBalances.map((b, i) => (
                                        <tr key={i} className="border-t border-gray-200 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-semibold text-gray-800">
                                                {b.assetCode}
                                                {b.assetType === "liquidity_pool_shares" && (
                                                    <span className="ml-2 text-xs text-purple-600 font-normal">LP Share</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">{b.balance}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[180px] truncate">
                                                {b.issuer || "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {b.liquidityPoolId ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-gray-600 truncate max-w-[140px]">
                                                            {b.liquidityPoolId}
                                                        </span>
                                                        <CopyButton data={b.liquidityPoolId} />
                                                    </div>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountDashboard;
