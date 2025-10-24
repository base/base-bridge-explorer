import { SolanaMessageDecoder } from "@/lib/solana";
import { NextRequest, NextResponse } from "next/server";
import { Hex } from "viem";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const msgHash = searchParams.get("msgHash");
  const isMainnet = searchParams.get("isMainnet") === "true";
  if (!msgHash) {
    return NextResponse.json(
      { error: "Missing required parameter: pubkey" },
      { status: 400 }
    );
  }

  const solanaDecoder = new SolanaMessageDecoder();
  const res = await solanaDecoder.findSolanaDeliveryFromMsgHash(
    msgHash as Hex,
    isMainnet
  );

  return NextResponse.json(res, { status: 200 });
}
