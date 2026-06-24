"use client";
import React, { useState, FormEvent } from "react";
import toast from "react-hot-toast";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://nexus-swap-server.vercel.app";

// Extra margin added to the quoted source amount when submitting the swap, so
// the transaction tolerates price movement between quoting and execution.
const SLIPPAGE_BUFFER = 0.02;

type SwapQuote = {
  sourceAsset: string;
  sourceAmount: string;
  destAsset: string;
  destAmount: string;
  path: string[];
  exchangeRate: string;
};

const SwapTokens: React.FC = () => {
  const [secretKey, setSecretKey] = useState<string>("");
  const [destAssetCode, setDestAssetCode] = useState<string>("");
  const [issuerAddress, setIssuerAddress] = useState<string>("");
  const [destAmount, setDestAmount] = useState<string>("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [txnHash, setTxnHash] = useState<string | null>(null);

  // Changing any quote input invalidates the current quote — it must be re-fetched.
  const resetQuote = () => {
    setQuote(null);
    setQuoteError(null);
  };

  const getQuote = async () => {
    if (!destAssetCode || !issuerAddress || !destAmount) {
      setQuoteError("Enter destination asset, issuer address, and amount to get a quote.");
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/swap-quote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ destAssetCode, issuerAddress, destAmount }),
      });

      const result = await response.json();

      if (response.ok) {
        setQuote(result);
      } else {
        const message =
          (Array.isArray(result.errors) && result.errors.join(" ")) ||
          result.error ||
          "Failed to fetch swap quote";
        setQuoteError(message);
      }
    } catch (error) {
      setQuoteError("Failed to fetch swap quote");
      console.error("Error fetching quote", error);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!quote) {
      toast.error("Get a quote before swapping.");
      return;
    }

    // Derive sendMax from the quoted source amount plus the slippage buffer.
    const sendMax = (parseFloat(quote.sourceAmount) * (1 + SLIPPAGE_BUFFER)).toFixed(7);
    const formData = {
      secretKey,
      destAssetCode,
      issuerAddress,
      sendMax,
      destAmount,
    };

    setIsSwapping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/swap-tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Result:", result.transactionHash);
        setTxnHash(result.transactionHash.hash);
        toast.success(`Swap successful!`);
        setSecretKey("");
        setDestAssetCode("");
        setIssuerAddress("");
        setDestAmount("");
        resetQuote();
      } else {
        const error = await response.json();
        toast.error(`Error during swap: ${error.error}`);
      }
    } catch (error) {
      toast.error("Error during swap");
      console.error("Error during swap", error);
    } finally {
      setIsSwapping(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-200">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url("/blockchaingif.gif")',
          filter: "blur(6px)",
        }}
      ></div>
      <div className="relative max-w-2xl w-full mx-auto p-8 mt-[90px] mb-[20px] bg-gray-300 bg-opacity-90 rounded-lg shadow-lg">
        <>
          <h2 className="text-4xl font-bold mb-8 text-center text-blue-600">
            Swap Tokens
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-2">
                  Secret Key
                </label>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="mt-1 block w-full h-[40px] bg-gray-100 text-black rounded-md px-3 border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-2">
                  Destination Asset Code
                </label>
                <input
                  type="text"
                  value={destAssetCode}
                  onChange={(e) => {
                    setDestAssetCode(e.target.value);
                    resetQuote();
                  }}
                  className="mt-1 block w-full h-[40px] bg-gray-100 text-black rounded-md px-3 border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-2">
                  Issuer Address
                </label>
                <input
                  type="text"
                  value={issuerAddress}
                  onChange={(e) => {
                    setIssuerAddress(e.target.value);
                    resetQuote();
                  }}
                  className="mt-1 block w-full h-[40px] bg-gray-100 text-black rounded-md px-3 border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-2">
                  Destination Amount
                </label>
                <input
                  type="number"
                  value={destAmount}
                  onChange={(e) => {
                    setDestAmount(e.target.value);
                    resetQuote();
                  }}
                  className="mt-1 block w-full h-[40px] bg-gray-100 text-black rounded-md px-3 border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                  min={0}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={getQuote}
              disabled={quoteLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {quoteLoading ? "Getting Quote..." : "Get Quote"}
            </button>
            {quoteError && (
              <p className="text-sm font-medium text-red-600">{quoteError}</p>
            )}
            {quote && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-gray-800">
                <p className="text-lg">
                  You will spend approximately{" "}
                  <strong>
                    {quote.sourceAmount} {quote.sourceAsset}
                  </strong>{" "}
                  to receive{" "}
                  <strong>
                    {quote.destAmount} {quote.destAsset}
                  </strong>
                  .
                </p>
                <p className="mt-1 text-sm">
                  Route: {["XLM", ...quote.path, quote.destAsset].join(" → ")}
                </p>
                <p className="mt-1 text-sm">
                  Exchange rate: {quote.exchangeRate} {quote.destAsset} / XLM
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={!quote || isSwapping}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSwapping ? "Swapping..." : "Swap Tokens"}
            </button>
          </form>
          {txnHash && (
            <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-green-600">
                Transaction Successful!
              </h3>
              <p className="mt-2 text-lg">
                <strong>Transaction Hash:</strong>
                <span className="block truncate text-gray-800">{txnHash}</span>
              </p>
              <button
                onClick={() => txnHash && copyToClipboard(txnHash, "Transaction Hash")}
                className="mt-4 w-full py-2 bg-gray-800 text-white font-semibold rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
              >
                Copy Transaction Hash
              </button>
            </div>
          )}
        </>
      </div>
    </div>
  );
};

export default SwapTokens;
