"use client";

import { useState } from "react";
import { ChainName } from "@/lib/transaction";
import { Status } from "./Status";
import { BridgeQueryResult, BridgeStatus } from "@/lib/bridge";
import { BaseMessageDecoder } from "@/lib/base";

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

export const Results = ({
  result,
  setResult,
}: {
  result: BridgeQueryResult | null;
  setResult?: (r: BridgeQueryResult | null) => void;
}) => {
  const [exploring, setExploring] = useState<string | null>(null);
  async function exploreMessage(messageHash: string, chain: ChainName) {
    if (!setResult) return;
    try {
      setExploring(messageHash);
      const isMainnet = chain === ChainName.Base;
      const baseDecoder = new BaseMessageDecoder();
      const { validationTxDetails, executeTxDetails, pubkey } =
        await baseDecoder.getBaseMessageInfoFromMsgHash(
          messageHash as `0x${string}`,
          isMainnet
        );

      let initialTx;
      if (pubkey) {
        const res = await fetch(
          `/api/solana/initTxFromPubkey?pubkey=${pubkey}&isMainnet=${Boolean(
            isMainnet
          )}`
        );
        if (res.ok) {
          initialTx = await res.json();
        }
      }

      const r: BridgeQueryResult = {
        isBridgeRelated: true,
        initialTx,
        validationTx: validationTxDetails,
        executeTx: executeTxDetails,
        status: executeTxDetails
          ? BridgeStatus.Executed
          : validationTxDetails
          ? BridgeStatus.Validated
          : BridgeStatus.Pending,
      };
      setResult(r);
    } catch (e) {
      console.error(e);
      setResult?.({ isBridgeRelated: false });
    } finally {
      setExploring(null);
    }
  }
  return (
    <>
      {result ? (
        <section className="mt-8 surface rounded-xl p-5 md:p-6 lg:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Result</h2>
              {result.kind === "output_root" ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/20">
                  Output root
                </span>
              ) : null}
            </div>
            <Status result={result} />
          </div>
          <div className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {result.kind === "output_root"
              ? "We recognize this as an output root transaction. It is not tied to a specific cross-chain message."
              : result.isBridgeRelated
              ? "This transaction is part of a cross-chain bridge process."
              : "This transaction is not related to the bridge."}
          </div>

          {result.isBridgeRelated &&
            result.kind !== "output_root" &&
            !result.txContainer && (
              <ol className="mt-6 space-y-4">
                {/* Initial transaction */}
                {result.initialTx ? (
                  <li className="relative">
                    <div
                      className="absolute left-3 top-3 -ml-px h-[calc(100%+1rem)] w-px bg-white/10 md:left-3.5"
                      aria-hidden="true"
                    />
                    <div className="relative pl-10 md:pl-12">
                      <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 ring-2 ring-blue-500/30 text-blue-600 dark:text-blue-400">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/60 dark:bg-white/5 p-4 md:p-5 transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold">
                            Initial transaction
                          </h3>
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset text-[var(--color-muted-foreground)]">
                            {result.initialTx.chain}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                          <Field
                            label="Amount"
                            value={result.initialTx.amount}
                          />
                          <Field label="Asset" value={result.initialTx.asset} />
                          <Field
                            label="Sender"
                            value={result.initialTx.senderAddress}
                            mono
                            copy
                          />
                          <HashField
                            label="Transaction Hash"
                            chain={result.initialTx.chain}
                            hash={result.initialTx.transactionHash}
                          />
                          <Field
                            label="Timestamp"
                            value={result.initialTx.timestamp}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ) : null}

                {/* Message validation */}
                {result.validationTx ? (
                  <li className="relative">
                    <div
                      className="absolute left-3 top-3 -ml-px h-[calc(100%+1rem)] w-px bg-white/10 md:left-3.5"
                      aria-hidden="true"
                    />
                    <div className="relative pl-10 md:pl-12">
                      <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 ring-2 ring-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/60 dark:bg-white/5 p-4 md:p-5 transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold">
                            Message validation
                          </h3>
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset text-[var(--color-muted-foreground)]">
                            {result.validationTx.chain}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                          <HashField
                            label="Transaction Hash"
                            chain={result.validationTx.chain}
                            hash={result.validationTx.transactionHash}
                          />
                          <Field
                            label="Timestamp"
                            value={result.validationTx.timestamp}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ) : null}

                {/* Execute transaction */}
                {result.executeTx ? (
                  <li className="relative">
                    <div className="relative pl-10 md:pl-12">
                      <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 ring-2 ring-green-500/30 text-green-600 dark:text-green-400">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/60 dark:bg-white/5 p-4 md:p-5 transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold">
                            Execute transaction
                          </h3>
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset text-[var(--color-muted-foreground)]">
                            {result.executeTx.chain}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                          <Field
                            label="Amount"
                            value={result.executeTx.amount}
                          />
                          <Field label="Asset" value={result.executeTx.asset} />
                          <Field
                            label="Receiver"
                            value={result.executeTx.receiverAddress}
                            mono
                            copy
                          />
                          <HashField
                            label="Transaction Hash"
                            chain={result.executeTx.chain}
                            hash={result.executeTx.transactionHash}
                          />
                          <Field
                            label="Timestamp"
                            value={result.executeTx.timestamp}
                          />
                          {result.executeTx.status ? (
                            <Field
                              label="Status"
                              value={result.executeTx.status}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ) : null}
              </ol>
            )}

          {result.isBridgeRelated && result.txContainer ? (
            <div className="mt-6">
              <div className="rounded-lg border border-white/10 bg-white/60 dark:bg-white/5 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold">
                    Destination transaction
                  </h3>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset text-[var(--color-muted-foreground)]">
                    {result.txContainer.chain as string}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                  <HashField
                    label="Transaction Hash"
                    chain={result.txContainer.chain as unknown as ChainName}
                    hash={result.txContainer.txHash}
                  />
                  <Field
                    label="Timestamp"
                    value={result.txContainer.timestamp}
                  />
                </div>
                <div className="mt-5">
                  <h4 className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    Includes {result.txContainer.preValidated.length}{" "}
                    pre-validations, {result.txContainer.executed.length}{" "}
                    executions
                  </h4>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm font-semibold mb-2">
                        Pre-validations
                      </h5>
                      <ul className="space-y-2">
                        {result.txContainer.preValidated.map((e) => (
                          <li
                            key={`pre-${e.logIndex}`}
                            className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
                          >
                            <span className="font-mono text-[13px] break-all">
                              {e.messageHash}
                            </span>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded px-2 py-0.5 text-[11px] ring-1 ring-inset ring-white/15 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={Boolean(exploring)}
                              onClick={() =>
                                exploreMessage(
                                  e.messageHash,
                                  result.txContainer!
                                    .chain as unknown as ChainName
                                )
                              }
                            >
                              {exploring === e.messageHash ? (
                                <svg
                                  className="h-3 w-3 animate-spin"
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
                              ) : null}
                              {exploring === e.messageHash
                                ? "Loading..."
                                : "Explore message"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold mb-2">Executions</h5>
                      <ul className="space-y-2">
                        {result.txContainer.executed.map((e) => (
                          <li
                            key={`exec-${e.logIndex}`}
                            className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
                          >
                            <span className="font-mono text-[13px] break-all">
                              {e.messageHash}
                            </span>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded px-2 py-0.5 text-[11px] ring-1 ring-inset ring-white/15 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={Boolean(exploring)}
                              onClick={() =>
                                exploreMessage(
                                  e.messageHash,
                                  result.txContainer!
                                    .chain as unknown as ChainName
                                )
                              }
                            >
                              {exploring === e.messageHash ? (
                                <svg
                                  className="h-3 w-3 animate-spin"
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
                              ) : null}
                              {exploring === e.messageHash
                                ? "Loading..."
                                : "Explore message"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
};

function Field({
  label,
  value,
  mono,
  copy,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  copy?: boolean;
}) {
  const display = value ?? "—";
  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) {
      console.error(e);
    }
  }
  return (
    <div>
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <div className={`${mono ? "font-mono text-[13px] break-all" : ""}`}>
        {display}
      </div>
      {copy && value ? (
        <button
          type="button"
          onClick={handleCopy}
          className="mt-1 inline-flex items-center rounded px-2 py-0.5 text-[11px] ring-1 ring-inset ring-white/15 hover:bg-white/10"
        >
          Copy
        </button>
      ) : null}
    </div>
  );
}

function HashField({
  label,
  chain,
  hash,
}: {
  label: string;
  chain: ChainName;
  hash?: string;
}) {
  const href = hash ? getExplorerTxUrl(chain, hash) ?? "#" : undefined;
  async function handleCopy() {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
    } catch (e) {
      console.error(e);
    }
  }
  return (
    <div>
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <div className="font-mono text-[13px] break-all">
        {hash ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:underline-offset-2"
          >
            {hash}
          </a>
        ) : (
          "—"
        )}
      </div>
      {hash ? (
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center rounded px-2 py-0.5 text-[11px] ring-1 ring-inset ring-white/15 hover:bg-white/10"
          >
            Copy
          </button>
          {href && href !== "#" ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded px-2 py-0.5 text-[11px] ring-1 ring-inset ring-white/15 hover:bg-white/10"
            >
              Explorer
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
