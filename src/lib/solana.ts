import {
  Account,
  address,
  Address,
  createSolanaRpc,
  devnet,
  fetchEncodedAccount,
  getBase58Codec,
  getProgramDerivedAddress,
  getPublicKeyFromAddress,
  mainnet,
  MaybeEncodedAccount,
  ReadonlyUint8Array,
  RpcDevnet,
  RpcMainnet,
  Signature,
  SolanaRpcApiDevnet,
  SolanaRpcApiMainnet,
} from "@solana/kit";
import {
  decodeOutgoingMessage,
  fetchIncomingMessage,
  fetchOutgoingMessage,
  getOutgoingMessageDiscriminatorBytes,
  getOutputRootDiscriminatorBytes,
  OutgoingMessage,
} from "../../clients/ts/src/bridge";
import {
  ChainName,
  ExecuteTxDetails,
  InitialTxDetails,
  ValidationTxDetails,
} from "./transaction";
import { deriveMessageHash } from "./evm";
import { Hex, toBytes } from "viem";
import {
  getMint,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { formatUnitsString } from "./base";

export enum ResultKind {
  Message = "message",
  OutputRoot = "output_root",
}

const SOL_ADDRESS = "SoL1111111111111111111111111111111111111111";

const bridgeProgram = {
  [ChainName.Solana]: "",
  [ChainName.SolanaDevnet]: "HSvNvzehozUpYhRBuCKq3Fq8udpRocTmGMUYXmCSiCCc",
};

function bytes32ToPubkey(inp: string): Address {
  if (inp.startsWith("0x")) {
    inp = inp.slice(2);
  }
  return address(
    getBase58Codec().decode(Uint8Array.from(Buffer.from(inp, "hex")))
  );
}

export class SolanaMessageDecoder {
  private mainnetRpc: RpcMainnet<SolanaRpcApiMainnet>;
  private devnetRpc: RpcDevnet<SolanaRpcApiDevnet>;

  constructor() {
    const mainnetUrl = mainnet("https://api.mainnet-beta.solana.com");
    const devnetUrl = devnet("https://api.devnet.solana.com");
    this.mainnetRpc = createSolanaRpc(mainnetUrl);
    this.devnetRpc = createSolanaRpc(devnetUrl);
  }

  async findSolanaInitTx(pubkeyHex: Hex) {
    const pubkey = bytes32ToPubkey(pubkeyHex);
    const rpc = this.devnetRpc;

    const outgoingMessage = await fetchOutgoingMessage(rpc, pubkey);
    console.log({ outgoingMessage });
    const res = await rpc.getSignaturesForAddress(pubkey).send();
    console.log({ res });
    if (res.length !== 1) {
      throw new Error(
        "Unexpected transaction signature count for outgoing message"
      );
    }
    return await this.lookupSolanaInitialTx(res[0].signature);
  }

  async findSolanaDeliveryFromMsgHash(
    msgHash: Hex,
    isMainnet: boolean
  ): Promise<{
    validationTxDetails?: ValidationTxDetails;
    executeTxDetails?: ExecuteTxDetails;
  }> {
    const rpc = isMainnet ? this.mainnetRpc : this.devnetRpc;
    const chain = isMainnet ? ChainName.Solana : ChainName.SolanaDevnet;
    const [messageAddress] = await getProgramDerivedAddress({
      programAddress: address(
        bridgeProgram[isMainnet ? ChainName.Solana : ChainName.SolanaDevnet]
      ),
      seeds: [Buffer.from("incoming_message"), toBytes(msgHash)],
    });
    try {
      const incomingMessage = await fetchIncomingMessage(rpc, messageAddress);
      console.log({ incomingMessage });
      const res = await rpc.getSignaturesForAddress(messageAddress).send();
      console.log({ res });
      if (res.length === 0) {
        return {};
      }
      const [tx1, tx2] = res;

      const validationTx = tx2 ?? tx1;
      const executeTx = tx2 ? tx1 : tx2;

      console.log({ executeTx });

      const validationTxDetails = {
        chain,
        transactionHash: validationTx.signature,
        timestamp: new Date(
          Number(validationTx.blockTime ?? 0) * 1000
        ).toString(),
      };

      let executeTxDetails: ExecuteTxDetails | undefined;
      if (executeTx) {
        let amount = "";
        let asset = "";
        let receiverAddress = "";

        const { message: msg } = incomingMessage.data;

        if (msg.__kind === "Transfer") {
          if (msg.transfer.__kind === "WrappedToken") {
            // TODO: query metadata extension for SPL 2022 token
            const conn = new Connection("https://api.devnet.solana.com");
            const mintPk = new PublicKey(msg.transfer.fields[0].localToken);
            const metadata = await getTokenMetadata(
              conn,
              mintPk,
              "finalized",
              TOKEN_2022_PROGRAM_ID
            );

            const mintInfo = await getMint(
              conn,
              mintPk,
              "finalized",
              TOKEN_2022_PROGRAM_ID
            );

            console.log({ metadata });
            console.log({ mintInfo });

            amount = formatUnitsString(
              String(msg.transfer.fields[0].amount),
              mintInfo.decimals
            );
            asset = metadata?.symbol ?? msg.transfer.fields[0].localToken;
            receiverAddress = msg.transfer.fields[0].to;
          } else {
            console.error(
              "Unrecognized IncomingMessage transfer type",
              msg.transfer.__kind
            );
            return {};
          }
        } else {
          console.error("Unrecognized IncomingMessage type", msg.__kind);
          return {};
        }
        // Parse executeTx
        executeTxDetails = {
          status: "success",
          amount,
          asset,
          chain,
          receiverAddress,
          transactionHash: executeTx.signature,
          timestamp: new Date(
            Number(executeTx.blockTime ?? 0) * 1000
          ).toString(),
        };
      }

      return { validationTxDetails, executeTxDetails };
    } catch {
      return {};
    }
  }

  async lookupSolanaInitialTx(
    signature: string
  ): Promise<{ initTx: InitialTxDetails; kind: ResultKind; msgHash: Hex }> {
    const { kind, encodedAcct, transaction } = await this.identifySolanaTx(
      signature
    );

    let senderAddress = "";
    let asset = "";
    let amount = "0";
    let msgHash: Hex = "0x";

    if (kind === ResultKind.Message) {
      const acct = decodeOutgoingMessage(encodedAcct) as Account<
        OutgoingMessage,
        string
      >;

      console.log({ acct });
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

      msgHash = deriveMessageHash(acct);
    }

    return {
      initTx: {
        amount,
        asset,
        chain: ChainName.SolanaDevnet,
        senderAddress,
        transactionHash: signature,
        timestamp: new Date(
          Number(transaction?.blockTime ?? 0) * 1000
        ).toString(),
      },
      kind,
      msgHash,
    };
  }

  private async identifySolanaTx(signature: string) {
    const rpc = this.devnetRpc;
    const chainName = ChainName.SolanaDevnet;
    const transaction = await rpc
      .getTransaction(signature as Signature, {
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
      })
      .send();
    console.log({ transaction });

    if (!transaction) {
      throw new Error("Solana transaction not found");
    }

    const { message } = transaction.transaction;
    let bridgeSeen = false;

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

        const { info } = ix.parsed;

        if (
          !info ||
          !("owner" in info) ||
          !("newAccount" in info) ||
          info.owner !== bridgeProgram[chainName]
        ) {
          continue;
        }

        const encodedAcct = await fetchEncodedAccount(
          rpc,
          address(info.newAccount as string)
        );
        console.log({ encodedAcct });

        if (this.isOutgoingMessage(encodedAcct)) {
          return { kind: ResultKind.Message, encodedAcct, transaction };
        } else if (this.isOutputRoot(encodedAcct)) {
          return { kind: ResultKind.OutputRoot, encodedAcct, transaction };
        }
      }
    }

    throw new Error("Solana transaction type not recognized");
  }

  private isOutgoingMessage(acct: MaybeEncodedAccount<string>): boolean {
    return this.isExpectedAccount(acct, getOutgoingMessageDiscriminatorBytes());
  }

  private isOutputRoot(acct: MaybeEncodedAccount<string>): boolean {
    return this.isExpectedAccount(acct, getOutputRootDiscriminatorBytes());
  }

  private isExpectedAccount(
    acct: MaybeEncodedAccount<string>,
    d: ReadonlyUint8Array
  ): boolean {
    return (
      acct.exists &&
      acct.data instanceof Uint8Array &&
      acct.data.length >= d.length &&
      d.every((byte, i) => acct.data[i] === byte)
    );
  }
}
