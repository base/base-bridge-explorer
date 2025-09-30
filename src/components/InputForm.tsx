"use client";

import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { ExploreButton } from "./ExploreButton";
import { BaseMessageDecoder } from "@/lib/base";
import { SolanaMessageDecoder } from "@/lib/solana";
import { Hash } from "viem";
import { BridgeQueryResult, BridgeStatus } from "@/lib/bridge";
import {
  ChainName,
  ExecuteTxDetails,
  InitialTxDetails,
  ValidationTxDetails,
} from "@/lib/transaction";

export type InputKind = "solana" | "base" | "unknown";

function detectInputKind(value: string): InputKind {
  const v = value.trim();
  if (v.length === 0) return "unknown";

  // Base transaction hash: 0x-prefixed 32-byte hex (64 hex chars)
  if (/^0x[0-9a-fA-F]{64}$/.test(v)) {
    return "base";
  }

  // Solana transaction signature: base58, typically 87 or 88 chars, but can vary 43-88
  // Base58: 1-9A-HJ-NP-Za-km-z (no 0 O I l)
  const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (v.length >= 43 && v.length <= 88 && base58Pattern.test(v)) {
    return "solana";
  }

  return "unknown";
}

export const InputForm = ({
  setResult,
}: {
  setResult: Dispatch<SetStateAction<BridgeQueryResult | null>>;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const kind = useMemo(
    () => detectInputKind(transactionHash),
    [transactionHash]
  );

  const helperText =
    kind === "solana"
      ? "Detected Solana signature"
      : kind === "base"
      ? "Detected Base transaction hash"
      : transactionHash
      ? "Enter a Solana signature (base58) or Base tx hash (0x...)"
      : "";
  const isValid = kind !== "unknown";

  async function handleExploreClick() {
    if (kind === "unknown") {
      return;
    }

    const baseDecoder = new BaseMessageDecoder();
    const solanaDecoder = new SolanaMessageDecoder();

    try {
      setIsLoading(true);
      if (kind === "base") {
        const {
          initTxDetails,
          validationTxDetails,
          executeTxDetails,
          pubkey,
          msgHash,
        } = await baseDecoder.getBaseMessageInfoFromTransactionHash(
          transactionHash.trim() as Hash
        );

        let initialTx: InitialTxDetails;
        if (!initTxDetails && pubkey) {
          const { initTx } = await solanaDecoder.findSolanaInitTx(pubkey);
          initialTx = initTx;
        } else if (initTxDetails) {
          initialTx = initTxDetails;
        } else {
          throw new Error("Initial tx details not found");
        }

        let validationTx: ValidationTxDetails | undefined = validationTxDetails;
        let executeTx: ExecuteTxDetails | undefined = executeTxDetails;
        if (initTxDetails && msgHash) {
          // Find Solana delivery
          const isMainnet = initTxDetails.chain === ChainName.Base;
          const { validationTxDetails, executeTxDetails } =
            await solanaDecoder.findSolanaDeliveryFromMsgHash(
              msgHash,
              isMainnet
            );
          if (validationTxDetails) {
            validationTx = validationTxDetails;
          }
          if (executeTxDetails) {
            executeTx = executeTxDetails;
          }
        } else {
          throw new Error("Unable to find Solana delivery");
        }

        const r: BridgeQueryResult = {
          isBridgeRelated: true,
          initialTx,
          executeTx,
          validationTx,
          status: executeTxDetails
            ? BridgeStatus.Executed
            : validationTxDetails
            ? BridgeStatus.Validated
            : BridgeStatus.Pending,
        };
        setResult(r);
      } else {
        const { initTx, kind, msgHash } =
          await solanaDecoder.lookupSolanaInitialTx(transactionHash.trim());
        const {
          validationTxDetails: validationTx,
          executeTxDetails: executeTx,
        } = await baseDecoder.getBaseMessageInfoFromMsgHash(
          msgHash,
          initTx.chain === ChainName.Solana
        );

        const r: BridgeQueryResult = {
          isBridgeRelated: true,
          initialTx: initTx,
          validationTx,
          executeTx,
          kind,
          status:
            kind === "output_root"
              ? undefined
              : executeTx
              ? BridgeStatus.Executed
              : validationTx
              ? BridgeStatus.Validated
              : BridgeStatus.Pending,
        };
        setResult(r);
      }
    } catch (err) {
      console.error(err);
      setResult({ isBridgeRelated: false });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="surface rounded-xl p-5 md:p-6 lg:p-7">
      <label
        htmlFor="query"
        className="block text-sm font-medium mb-2 text-[var(--color-muted-foreground)]"
      >
        Transaction identifier
      </label>
      <div className="flex items-center gap-3 md:gap-4">
        <input
          id="query"
          name="query"
          value={transactionHash}
          onChange={(e) => setTransactionHash(e.target.value)}
          placeholder="e.g. 0x... or 5NTf..."
          className="w-full h-12 px-4 rounded-md bg-white/70 dark:bg-white/5 outline-none border border-black/10 dark:border-white/10 shadow-sm focus:ring-4 focus:ring-[color:var(--brand)]/30"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          disabled={isLoading}
        />
        <ExploreButton
          onClick={handleExploreClick}
          disabled={!isValid || isLoading}
          isLoading={isLoading}
        />
      </div>
      {helperText ? (
        <p
          className={`mt-2 text-sm ${
            isValid ? "text-green-600" : "text-[var(--color-muted-foreground)]"
          }`}
        >
          {helperText}
        </p>
      ) : null}
      <div className="mt-3 text-sm text-[var(--color-muted-foreground)]">
        {kind === "solana" && "Solana"}
        {kind === "base" && "Base"}
        {kind === "unknown" && transactionHash && "Unrecognized format"}
      </div>
    </form>
  );
};
