"use client";

import { ChainName } from "@/lib/transaction";
import { Status } from "./Status";
import { BridgeQueryResult } from "@/lib/bridge";

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

export const Results = ({ result }: { result: BridgeQueryResult | null }) => {
  return (
    <>
      {result ? (
        <section className="mt-8 surface rounded-xl p-5 md:p-6 lg:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Result</h2>
            {result.kind === "output_root" ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/20">
                Output root
              </span>
            ) : null}
            <Status result={result} />
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
                <h3 className="text-base font-semibold">Message validation</h3>
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
    </>
  );
};
