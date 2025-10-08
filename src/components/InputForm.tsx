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
      ? "✓ Valid Solana signature detected"
      : kind === "base"
      ? "✓ Valid Base transaction hash detected"
      : transactionHash
      ? "Please enter a valid Solana signature (base58) or Base transaction hash (0x...)"
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
          if (!initTx) {
            throw new Error("Solana init tx not found");
          }
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
        }

        const r: BridgeQueryResult = {
          isBridgeRelated: true,
          initialTx,
          executeTx,
          validationTx,
          status: executeTx
            ? BridgeStatus.Executed
            : validationTx
            ? BridgeStatus.Validated
            : BridgeStatus.Pending,
        };
        setResult(r);
      } else {
        const {
          initTx: initTxDetails,
          validationTxDetails,
          executeTxDetails,
          kind,
          msgHash,
        } = await solanaDecoder.lookupSolanaInitialTx(transactionHash.trim());

        let initTx: InitialTxDetails | undefined = initTxDetails;
        let validationTx: ValidationTxDetails | undefined = validationTxDetails;
        let executeTx: ExecuteTxDetails | undefined = executeTxDetails;

        if (initTx) {
          if (validationTxDetails) {
            throw new Error("Solana tx both init and validation");
          }
          if (executeTxDetails) {
            throw new Error("Solana tx both init and execute");
          }
          if (!msgHash) {
            throw new Error("Solana init tx did not provide msg hash");
          }

          const { validationTxDetails: v, executeTxDetails: e } =
            await baseDecoder.getBaseMessageInfoFromMsgHash(
              msgHash,
              initTx.chain === ChainName.Solana
            );

          if (v) {
            validationTx = v;
          }
          if (e) {
            executeTx = e;
          }
        }

        if (validationTxDetails || executeTxDetails) {
          if (initTx) {
            throw new Error("Solana tx both init and delivery");
          }
          if (!msgHash) {
            throw new Error("Message hash missing from Solana delivery tx");
          }
          let isMainnet = true;
          if (validationTxDetails) {
            isMainnet = validationTxDetails.chain === ChainName.Solana;
          }
          if (executeTxDetails) {
            isMainnet = executeTxDetails.chain === ChainName.Solana;
          }
          initTx = await baseDecoder.getBaseInitTxFromMsgHash(
            msgHash,
            isMainnet
          );
        }

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
      console.error("Error exploring transaction:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Detailed error:", errorMessage);
      setResult({ 
        isBridgeRelated: false,
        error: errorMessage
      });
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
          placeholder="Enter transaction hash (0x...) or Solana signature"
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
