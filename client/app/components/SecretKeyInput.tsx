"use client";
import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface SecretKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const SecretKeyInput: React.FC<SecretKeyInputProps> = ({
  value,
  onChange,
  required,
}) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        required={required}
        className="mt-1 block w-full h-[40px] bg-gray-100 text-black rounded-md px-3 pr-10 border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide secret key" : "Show secret key"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
      >
        {show ? (
          <FiEyeOff aria-hidden="true" className="h-5 w-5" />
        ) : (
          <FiEye aria-hidden="true" className="h-5 w-5" />
        )}
      </button>
    </div>
  );
};

export default SecretKeyInput;
