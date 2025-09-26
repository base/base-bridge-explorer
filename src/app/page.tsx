"use client";

import { useMemo, useState } from "react";
import {
  Address,
  createPublicClient,
  decodeEventLog,
  Hash,
  Hex,
  http,
  zeroAddress,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import Bridge from "../../abis/Bridge";
import ERC20 from "../../abis/ERC20";
import {
  createSolanaRpc,
  devnet,
  mainnet,
  Signature,
  address,
} from "@solana/kit";
import { fetchMaybeOutgoingMessage } from "../../clients/ts/src/bridge";
import { deriveMessageHash } from "@/utils/evm";

type InputKind = "solana" | "base" | "unknown";

enum BridgeStatus {
  Pending = "pending",
  Validated = "pre-validated",
  Executed = "executed",
}

enum ChainName {
  Solana = "Solana",
  Base = "Base",
  SolanaDevnet = "Solana Devnet",
  BaseSepolia = "Base Sepolia",
}

interface InitialTxDetails {
  amount: string;
  asset: string;
  chain: ChainName;
  senderAddress: string;
  transactionHash: string;
  timestamp: string;
}

interface ExecuteTxDetails {
  status: string;
  amount: string;
  asset: string;
  chain: ChainName;
  receiverAddress: string;
  transactionHash: string;
  timestamp: string;
}

interface BridgeQueryResult {
  isBridgeRelated: boolean;
  status?: BridgeStatus;
  initialTx?: InitialTxDetails;
  executeTx?: ExecuteTxDetails;
}

const MESSAGE_SUCCESSFULLY_RELAYED_TOPIC =
  "0x68bfb2e57fcbb47277da442d81d3e40ff118cbbcaf345b07997b35f592359e49";
const FAILED_TO_RELAY_MESSAGE_TOPIC =
  "0x1dc47a66003d9a2334f04c3d23d98f174d7e65e9a4a72fa13277a15120c1559e";
const TRANSFER_FINALIZED_TOPIC =
  "0x6899b9db6ebabd932aa1fc835134c9b9ca2168d78a4cbee8854b1c00c8647609";
const MESSAGE_REGISTERED_TOPIC =
  "0x5e55930eb861ee57d9b7fa9e506b7f413cb1599c9886e57f1c8091f5fee5fc33";

const SOL_ADDRESS = "SoL1111111111111111111111111111111111111111";

const bridgeAddress = {
  8453: "", // Base Mainnet
  84532: "0xB2068ECCDb908902C76E3f965c1712a9cF64171E", // Base Sepolia
};
const bridgeValidatorAddress = {
  8453: "", // Base Mainnet
  84532: "0x8D2cD165360ACF5f0145661a8FB0Ff5D3729Ef9A", // Base Sepolia
};
const bridgeProgram = {
  [ChainName.Solana]: "",
  [ChainName.SolanaDevnet]: "HSvNvzehozUpYhRBuCKq3Fq8udpRocTmGMUYXmCSiCCc",
};

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

// Formats a big integer value given its token decimals into a human-friendly string
function formatUnitsString(
  value: string,
  decimals: number,
  maxFractionDigits = 6
): string {
  const isNegative = value.startsWith("-");
  const digits = isNegative ? value.slice(1) : value;
  const trimmed = digits.replace(/^0+/, "") || "0";

  if (decimals === 0) {
    return (isNegative ? "-" : "") + trimmed;
  }

  const padded = trimmed.padStart(decimals + 1, "0");
  const integerPart = padded.slice(0, padded.length - decimals);
  let fractionPart = padded.slice(padded.length - decimals);

  // Trim trailing zeros, then clamp to maxFractionDigits
  fractionPart = fractionPart.replace(/0+$/, "");
  if (fractionPart.length > maxFractionDigits) {
    fractionPart = fractionPart.slice(0, maxFractionDigits);
  }

  return (
    (isNegative ? "-" : "") +
    integerPart +
    (fractionPart ? `.${fractionPart}` : "")
  );
}

async function lookupBaseDelivery(
  msgHash: Hex,
  isMainnet: boolean
): Promise<ExecuteTxDetails> {
  console.log({ msgHash });

  const chainId = isMainnet ? base.id : baseSepolia.id;
  const chainName = isMainnet ? ChainName.Base : ChainName.BaseSepolia;
  const client = createPublicClient({
    chain: isMainnet ? base : baseSepolia,
    transport: http("https://base-sepolia.cbhq.net"),
  });

  let transactionHash = "";
  let timestamp = "";
  let status = "";

  const res = await fetch(
    `/api/etherscan/logs?chainId=${chainId}&module=logs&action=getLogs&topic0=${MESSAGE_REGISTERED_TOPIC}&topic0_1_opr=and&topic1=${msgHash}`
  );

  if (res.ok) {
    const json = await res.json();
    console.log({ json });
    const logs = json.result;
    if (logs.length > 0) {
      const [log] = logs;
      const prevalidatedBlockHash = log.blockHash;
      const prevalidatedTransactionHash = log.transactionHash;
      const block = await client.getBlock({ blockHash: prevalidatedBlockHash });
      const prevalidatedTimestamp = block.timestamp;
      console.log({ prevalidatedTransactionHash, prevalidatedTimestamp });

      const res = await fetch(
        `/api/etherscan/logs?chainId=${chainId}&module=logs&action=getLogs&topic0=${MESSAGE_SUCCESSFULLY_RELAYED_TOPIC}&topic0_1_opr=and&topic2=${msgHash}`
      );

      if (res.ok) {
        const json = await res.json();
        console.log({ deliveredRes: json });
        const deliveredLogs = json.result;

        if (deliveredLogs.length > 0) {
          const [log] = deliveredLogs;
          const executedBlockHash = log.blockHash;
          const executedTransactionHash = log.transactionHash;
          const block = await client.getBlock({ blockHash: executedBlockHash });
          const executedTimestamp = block.timestamp;
          timestamp = new Date(Number(executedTimestamp) * 1000).toString();
          transactionHash = executedTransactionHash;
          return await lookupBaseTxReceipt(executedTransactionHash);
        }
      } else {
        // Check if attempted
        const res = await fetch(
          `/api/etherscan/logs?chainId=${chainId}&module=logs&action=getLogs&topic0=${FAILED_TO_RELAY_MESSAGE_TOPIC}&topic0_1_opr=and&topic2=${msgHash}`
        );

        if (res.ok) {
          const json = await res.json();
          console.log({ failedDeliveredRes: json });
          const failureLogs = json.result;

          if (failureLogs.length > 0) {
            // Message execution was attempted but failed
            status = "failed";
          }
        }
      }
    }
  }

  return {
    status,
    amount: "0",
    asset: "",
    chain: chainName,
    receiverAddress: "",
    transactionHash,
    timestamp,
  };
}

async function lookupBaseTxReceipt(hash: Hash): Promise<ExecuteTxDetails> {
  const chainId = baseSepolia.id;
  const chainName = ChainName.BaseSepolia;
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
  const receipt = await client.getTransactionReceipt({ hash });
  console.log({ receipt });
  const { logs } = receipt;

  let messageRegistered = false;
  let messageSuccessfullyRelayed = false;
  let transferFinalized = false;
  let bridgeSeen = false;
  let receiverAddress = "";
  let asset = "";
  let localToken: Address = zeroAddress;
  let amount = "0";
  let decimals = 18;
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    if (
      log.address.toLowerCase() ===
        bridgeValidatorAddress[chainId].toLowerCase() ||
      log.address.toLowerCase() === bridgeAddress[chainId].toLowerCase()
    ) {
      bridgeSeen = true;
    }

    if (
      log.address.toLowerCase() ===
        bridgeValidatorAddress[chainId].toLowerCase() &&
      log.topics[0] === MESSAGE_REGISTERED_TOPIC
    ) {
      messageRegistered = true;
    } else if (
      log.address.toLowerCase() === bridgeAddress[chainId].toLowerCase() &&
      log.topics[0] === TRANSFER_FINALIZED_TOPIC
    ) {
      transferFinalized = true;
      const decodedData = decodeEventLog({
        abi: Bridge,
        data: log.data,
        topics: log.topics,
      }) as {
        eventName: string;
        args: {
          localToken: `0x${string}`;
          remoteToken: `0x${string}`;
          to: `0x${string}`;
          amount: bigint;
        };
      };
      amount = String(decodedData.args.amount);
      receiverAddress = String(decodedData.args.to);
      localToken = decodedData.args.localToken;
    } else if (
      log.address.toLowerCase() === bridgeAddress[chainId].toLowerCase() &&
      log.topics[0] === MESSAGE_SUCCESSFULLY_RELAYED_TOPIC
    ) {
      messageSuccessfullyRelayed = true;
    }
  }

  const calls: any = [client.getBlock({ blockHash: receipt.blockHash })];
  if (localToken !== zeroAddress) {
    calls.push(
      client.multicall({
        contracts: [
          {
            address: localToken,
            abi: ERC20,
            functionName: "symbol",
          },
          {
            address: localToken,
            abi: ERC20,
            functionName: "decimals",
          },
        ],
      })
    );
  }

  const [block, multicallResults] = await Promise.all(calls);

  const [assetRes, decimalsRes] = multicallResults;
  if (assetRes.status === "success") {
    asset = assetRes.result;
  }
  if (decimalsRes.status === "success") {
    decimals = decimalsRes.result;
  }

  console.log({
    messageRegistered,
    messageSuccessfullyRelayed,
    transferFinalized,
    bridgeSeen,
  });

  if (!bridgeSeen) {
    throw new Error("Transaction not recognized");
  }

  return {
    status: "success",
    amount: formatUnitsString(amount, decimals),
    asset,
    chain: chainName,
    receiverAddress,
    transactionHash: hash,
    timestamp: new Date(Number(block.timestamp) * 1000).toString(),
  };
}

async function lookupSolanaInitialTx(
  signature: string
): Promise<[InitialTxDetails, ExecuteTxDetails | undefined]> {
  const mainnetUrl = mainnet("https://api.mainnet-beta.solana.com");
  const devnetUrl = devnet("https://api.devnet.solana.com");
  const mainnetRpc = createSolanaRpc(mainnetUrl);
  const devnetRpc = createSolanaRpc(devnetUrl);
  const isMainnet = false;
  const rpc = devnetRpc;
  const transaction = await rpc
    .getTransaction(signature as Signature, { encoding: "jsonParsed" })
    .send();
  console.log({ transaction });

  let senderAddress = "";
  let asset = "";
  let amount = "0";
  let executeTx;

  if (!transaction) {
    throw new Error("Solana transaction not found");
  }

  const { message } = transaction.transaction;

  let bridgeSeen = false;
  const newAccounts = [];

  for (let i = 0; i < message.instructions.length; i++) {
    const ix = message.instructions[i];
    if (ix.programId === bridgeProgram[ChainName.SolanaDevnet]) {
      bridgeSeen = true;
    }
  }

  console.log({ bridgeSeen });

  if (!bridgeSeen) {
    throw new Error("Transaction not recognized");
  }

  const innerInstructions = transaction.meta?.innerInstructions ?? [];

  for (let i = 0; i < innerInstructions.length; i++) {
    const { instructions } = innerInstructions[i];

    for (let j = 0; j < instructions.length; j++) {
      const ix = instructions[j];
      if (!("parsed" in ix) || ix.parsed.type !== "createAccount") {
        continue;
      }

      const info = ix.parsed.info;

      if (!info || !("owner" in info) || !("newAccount" in info)) {
        continue;
      }

      if (info.owner === bridgeProgram[ChainName.SolanaDevnet]) {
        newAccounts.push(info.newAccount);
        const acct = await fetchMaybeOutgoingMessage(
          rpc,
          address(info.newAccount as string)
        );

        console.log({ acct });
        if (!acct.exists) {
          continue;
        }
        senderAddress = acct.data.sender ?? "";

        if (acct.data.message.__kind === "Transfer") {
          const msg = acct.data.message.fields[0];
          amount = msg.amount.toString();

          if (msg.localToken === SOL_ADDRESS) {
            asset = "SOL";
            amount = String(Number(msg.amount) / 1_000_000_000);
          } else {
            // Figure out what localToken is
            asset = "unknown SPL";
          }
        }

        const msgHash = deriveMessageHash(acct);
        executeTx = await lookupBaseDelivery(msgHash, isMainnet);
      }
    }
  }

  return [
    {
      amount,
      asset,
      chain: ChainName.SolanaDevnet,
      senderAddress,
      transactionHash: signature,
      timestamp: new Date(
        Number(transaction?.blockTime ?? 0) * 1000
      ).toString(),
    },
    executeTx,
  ];
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

    try {
      setIsLoading(true);
      if (kind === "base") {
        const executeTx = await lookupBaseTxReceipt(
          transactionHash.trim() as Hash
        );
        const r: BridgeQueryResult = {
          isBridgeRelated: true,
          executeTx,
          status: executeTx ? BridgeStatus.Executed : BridgeStatus.Pending,
        };
        setResult(r);
      } else {
        const [initialTx, executeTx] = await lookupSolanaInitialTx(
          transactionHash.trim()
        );
        const r: BridgeQueryResult = {
          isBridgeRelated: true,
          initialTx,
          executeTx,
          status: executeTx ? BridgeStatus.Executed : BridgeStatus.Pending,
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
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <main className="relative w-full max-w-2xl">
        <header className="mb-10 text-center">
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

        <form onSubmit={handleSubmit} className="surface rounded-xl p-4 md:p-5">
          <label
            htmlFor="query"
            className="block text-sm font-medium mb-2 text-[var(--color-muted-foreground)]"
          >
            Transaction identifier
          </label>
          <div className="flex items-center gap-3">
            <input
              id="query"
              name="query"
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              placeholder="e.g. 0x... or 5NTf..."
              className="w-full h-12 px-4 rounded-md bg-white/70 dark:bg-white/5 outline-none border border-black/10 dark:border-white/10 focus:ring-4 focus:ring-[color:var(--brand)]/30"
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
          <section className="mt-6 surface rounded-xl p-4 md:p-5">
            <h2 className="text-lg font-semibold tracking-tight">Result</h2>
            <div className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {result.isBridgeRelated
                ? "This transaction is part of a cross-chain bridge process."
                : "This transaction is not related to the bridge."}
            </div>
            {result.isBridgeRelated && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    Status
                  </div>
                  <div className="mt-1 text-base">{result.status ?? "—"}</div>
                </div>
                <div className="hidden md:block" />

                <div className="col-span-1 md:col-span-1">
                  <h3 className="text-base font-semibold mt-2">Initial tx</h3>
                  <div className="mt-2 space-y-1 text-sm">
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
                            className="underline"
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

                <div className="col-span-1 md:col-span-1">
                  <h3 className="text-base font-semibold mt-2">Execute tx</h3>
                  <div className="mt-2 space-y-1 text-sm">
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
                            className="underline"
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
