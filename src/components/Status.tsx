"use client";

import { BridgeQueryResult, BridgeStatus } from "@/lib/bridge";

export const Status = ({ result }: { result: BridgeQueryResult }) => {
  return (
    <>
      {result.status ? (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
            result.status === BridgeStatus.Executed
              ? "bg-green-500/15 text-green-600 dark:text-green-400 ring-green-500/20"
              : result.status === BridgeStatus.Validated
              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/20"
              : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 ring-yellow-500/20"
          }`}
        >
          {result.status}
        </span>
      ) : null}
    </>
  );
};
