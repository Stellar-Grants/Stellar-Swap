"use client";
import React, { useState } from "react";

const PRESETS = ["0.5", "1.0", "3.0"];

interface SlippageSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const SlippageSelector: React.FC<SlippageSelectorProps> = ({
  value,
  onChange,
}) => {
  const [custom, setCustom] = useState(false);

  return (
    <div>
      <label className="block text-gray-700 text-lg font-medium mb-2">
        Slippage Tolerance
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(p);
            }}
            className={`px-3 py-1 rounded-md text-sm border ${
              value === p && !custom
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            {p}%
          </button>
        ))}
        <input
          type="number"
          min="0.1"
          max="50"
          step="0.1"
          placeholder="Custom"
          value={custom ? value : ""}
          onChange={(e) => {
            setCustom(true);
            onChange(e.target.value);
          }}
          className="w-20 h-8 px-2 text-sm bg-gray-100 text-black border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500"
        />
        <span className="text-gray-500 text-sm">%</span>
      </div>
      {parseFloat(value) > 5 && (
        <p className="text-yellow-600 text-xs mt-1">
          ⚠️ High slippage tolerance. Your transaction may be frontrun.
        </p>
      )}
    </div>
  );
};

export default SlippageSelector;
