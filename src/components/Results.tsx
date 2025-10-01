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

          {result.isBridgeRelated && result.kind !== "output_root" && (
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
                        <Field label="Amount" value={result.initialTx.amount} />
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
                        <Field label="Amount" value={result.executeTx.amount} />
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
    } catch (_) {
      // ignore
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
    } catch (_) {
      // ignore
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
