import { Address, getBase58Encoder } from "@solana/kit";
import { Call, fetchOutgoingMessage } from "../../clients/ts/src/bridge";
import { encodeAbiParameters, Hex, keccak256, padHex, toHex } from "viem";

const MessageType = {
  Call: 0,
  Transfer: 1,
  TransferAndCall: 2,
} as const;

export function deriveMessageHash(
  outgoing: Awaited<ReturnType<typeof fetchOutgoingMessage>>
): Hex {
  const nonce = BigInt(outgoing.data.nonce);
  const senderBytes32 = bytes32FromPubkey(outgoing.data.sender);
  const { ty, data } = buildIncomingPayload(outgoing);

  const innerHash = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint8" }, { type: "bytes" }],
      [senderBytes32, ty, data]
    )
  );

  const pubkey = bytes32FromPubkey(outgoing.address);

  return keccak256(
    encodeAbiParameters(
      [{ type: "uint64" }, { type: "bytes32" }, { type: "bytes32" }],
      [nonce, pubkey, innerHash]
    )
  );
}

function bytes32FromPubkey(pubkey: Address): Hex {
  const bytes = getBase58Encoder().encode(pubkey);

  // toHex requires a mutable Uint8Array
  let hex = toHex(new Uint8Array(bytes));
  if (hex.length !== 66) {
    // left pad to 32 bytes if needed
    hex = padHex(hex, { size: 32 });
  }

  return hex;
}

function buildIncomingPayload(
  outgoing: Awaited<ReturnType<typeof fetchOutgoingMessage>>
) {
  const msg = outgoing.data.message;

  // Call
  if (msg.__kind === "Call") {
    const call = msg.fields[0];
    const ty = MessageType.Call;
    const data = encodeCallData(call);
    return { ty, data };
  }

  // Transfer (with optional call)
  if (msg.__kind === "Transfer") {
    const transfer = msg.fields[0];

    const transferTuple = {
      localToken: `0x${toHex(new Uint8Array(transfer.remoteToken)).slice(2)}`,
      remoteToken: bytes32FromPubkey(transfer.localToken),
      to: padHex(`0x${toHex(new Uint8Array(transfer.to)).slice(2)}`, {
        size: 32,
        // Bytes32 `to` expects the EVM address in the first 20 bytes.
        // Right-pad zeros so casting `bytes20(to)` yields the intended address.
        dir: "right",
      }),
      remoteAmount: BigInt(transfer.amount),
    } as const;

    const encodedTransfer = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "localToken", type: "address" },
            { name: "remoteToken", type: "bytes32" },
            { name: "to", type: "bytes32" },
            { name: "remoteAmount", type: "uint64" },
          ],
        },
      ],
      [transferTuple]
    );

    if (transfer.call.__option === "None") {
      const ty = MessageType.Transfer;
      return { ty, data: encodedTransfer, transferTuple };
    }

    const ty = MessageType.TransferAndCall;
    const call = transfer.call.value;
    const callTuple = callTupleObject(call);
    const data = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "localToken", type: "address" },
            { name: "remoteToken", type: "bytes32" },
            { name: "to", type: "bytes32" },
            { name: "remoteAmount", type: "uint64" },
          ],
        },
        {
          type: "tuple",
          components: [
            { name: "ty", type: "uint8" },
            { name: "to", type: "address" },
            { name: "value", type: "uint128" },
            { name: "data", type: "bytes" },
          ],
        },
      ],
      [transferTuple, callTuple]
    );

    return { ty, data, transferTuple, callTuple };
  }

  throw new Error("Unsupported outgoing message type");
}

function encodeCallData(call: Call): Hex {
  const evmTo = toHex(new Uint8Array(call.to));

  const encoded = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "ty", type: "uint8" },
          { name: "to", type: "address" },
          { name: "value", type: "uint128" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
    [
      {
        ty: Number(call.ty),
        to: evmTo,
        value: BigInt(call.value),
        data: toHex(new Uint8Array(call.data)),
      },
    ]
  );
  return encoded;
}

function callTupleObject(call: Call) {
  const evmTo = toHex(new Uint8Array(call.to));

  return {
    ty: Number(call.ty),
    to: evmTo,
    value: BigInt(call.value),
    data: toHex(new Uint8Array(call.data)),
  };
}
