"use client";

import { useMemo, useState } from "react";
import { Hash } from "viem";
import { BaseMessageDecoder } from "@/lib/base";
import {
  ChainName,
  ExecuteTxDetails,
  InitialTxDetails,
  ValidationTxDetails,
} from "@/lib/transaction";
import { ResultKind, SolanaMessageDecoder } from "@/lib/solana";

type InputKind = "solana" | "base" | "unknown";

enum BridgeStatus {
  Pending = "pending",
  Validated = "pre-validated",
  Executed = "executed",
}

interface BridgeQueryResult {
  isBridgeRelated: boolean;
  status?: BridgeStatus;
  initialTx?: InitialTxDetails;
  executeTx?: ExecuteTxDetails;
  validationTx?: ValidationTxDetails;
  kind?: ResultKind;
}

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

function getExplorerTxUrl(chain: ChainName, tx: string): string | undefined {
  if (!tx) return undefined;
  switch (chain) {
    case ChainName.Solana:
      return `https://explorer.solana.com/tx/${tx}`;
    case ChainName.SolanaDevnet:
      return `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
    case ChainName.Base:
      return `https://basescan.org/tx/${tx}`;
    case ChainName.BaseSepolia:
      return `https://sepolia.basescan.org/tx/${tx}`;
    default:
      return undefined;
  }
}

export default function Home() {
  const [transactionHash, setTransactionHash] = useState("");
  const kind = useMemo(
    () => detectInputKind(transactionHash),
    [transactionHash]
  );
  const [result, setResult] = useState<BridgeQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isValid = kind !== "unknown";
  const helperText =
    kind === "solana"
      ? "Detected Solana signature"
      : kind === "base"
      ? "Detected Base transaction hash"
      : transactionHash
      ? "Enter a Solana signature (base58) or Base tx hash (0x...)"
      : "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // One-page app for now; no navigation yet.
    if (!isValid) return;
  }

  async function handleExploreClick() {
    if (kind === "unknown") {
      return;
    }

    const baseDecoder = new BaseMessageDecoder();
    const solanaDecoder = new SolanaMessageDecoder();

    try {
      setIsLoading(true);
      if (kind === "base") {
        const { validationTxDetails, executeTxDetails, pubkey } =
          await baseDecoder.getBaseMessageInfoFromTransactionHash(
            transactionHash.trim() as Hash
          );
        const { initTx } = await solanaDecoder.findSolanaInitTx(pubkey);
        const r: BridgeQueryResult = {
          isBridgeRelated: true,
          initialTx: initTx,
          executeTx: executeTxDetails,
          validationTx: validationTxDetails,
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
        let executeTx, validationTx;

        const r: BridgeQueryResult = {
          isBridgeRelated: true,
          initialTx: initTx,
          // executeTx,
          kind,
          // validationTx,
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
    <div className="min-h-screen flex items-center justify-center px-8 py-20">
      <main className="relative w-full max-w-3xl md:max-w-4xl">
        <header className="mb-12 md:mb-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/60 dark:bg-white/5 px-3 py-1 backdrop-blur-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--brand)" }}
            />
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Base • Bridge Explorer
            </span>
          </div>
          <h1 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">
            Explore cross-chain transactions
          </h1>
          <p className="mt-3 text-[15px] text-[var(--color-muted-foreground)]">
            Paste a Solana signature or Base transaction hash to get started.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="surface rounded-xl p-5 md:p-6 lg:p-7"
        >
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
            <button
              type="submit"
              onClick={handleExploreClick}
              disabled={!isValid || isLoading}
              className="h-12 px-5 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--brand)" }}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Loading...
                </span>
              ) : (
                "Explore"
              )}
            </button>
          </div>
          {helperText ? (
            <p
              className={`mt-2 text-sm ${
                isValid
                  ? "text-green-600"
                  : "text-[var(--color-muted-foreground)]"
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
        {result ? (
          <section className="mt-8 surface rounded-xl p-5 md:p-6 lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Result</h2>
              {result.kind === "output_root" ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/20">
                  Output root
                </span>
              ) : null}
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
            </div>
            <div className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {result.kind === "output_root"
                ? "We recognize this as an output root transaction. It is not tied to a specific cross-chain message."
                : result.isBridgeRelated
                ? "This transaction is part of a cross-chain bridge process."
                : "This transaction is not related to the bridge."}
            </div>
            {result.isBridgeRelated && result.kind !== "output_root" && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="rounded-lg border border-white/10 bg-white/60 dark:bg-white/5 p-4 md:p-5">
                  <h3 className="text-base font-semibold">Initial tx</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Amount transferred
                      </span>
                      <div>{result.initialTx?.amount ?? "—"}</div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Asset
                      </span>
                      <div>{result.initialTx?.asset ?? "—"}</div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Chain
                      </span>
                      <div>{result.initialTx?.chain ?? "—"}</div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Sender Address
                      </span>
                      <div className="break-all">
                        {result.initialTx?.senderAddress ?? "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Transaction Hash
                      </span>
                      <div className="break-all">
                        {result.initialTx?.transactionHash ? (
                          <a
                            href={
                              getExplorerTxUrl(
                                result.initialTx.chain,
                                result.initialTx.transactionHash
                              ) ?? "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:underline-offset-2"
                          >
                            {result.initialTx.transactionHash}
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Timestamp
                      </span>
                      <div>{result.initialTx?.timestamp ?? "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/60 dark:bg-white/5 p-4 md:p-5">
                  <h3 className="text-base font-semibold">
                    Message validation
                  </h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Chain
                      </span>
                      <div>{result.validationTx?.chain ?? "—"}</div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Transaction Hash
                      </span>
                      <div className="break-all">
                        {result.validationTx?.transactionHash ? (
                          <a
                            href={
                              getExplorerTxUrl(
                                result.validationTx.chain,
                                result.validationTx.transactionHash
                              ) ?? "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:underline-offset-2"
                          >
                            {result.validationTx.transactionHash}
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Timestamp
                      </span>
                      <div>{result.validationTx?.timestamp ?? "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/60 dark:bg-white/5 p-4 md:p-5">
                  <h3 className="text-base font-semibold">Execute tx</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Amount transferred
                      </span>
                      <div>{result.executeTx?.amount ?? "—"}</div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Asset
                      </span>
                      <div>{result.executeTx?.asset ?? "—"}</div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Chain
                      </span>
                      <div>{result.executeTx?.chain ?? "—"}</div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Receiver Address
                      </span>
                      <div className="break-all">
                        {result.executeTx?.receiverAddress ?? "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Transaction Hash
                      </span>
                      <div className="break-all">
                        {result.executeTx?.transactionHash ? (
                          <a
                            href={
                              getExplorerTxUrl(
                                result.executeTx.chain,
                                result.executeTx.transactionHash
                              ) ?? "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:underline-offset-2"
                          >
                            {result.executeTx.transactionHash}
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--color-muted-foreground)]">
                        Timestamp
                      </span>
                      <div>{result.executeTx?.timestamp ?? "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
