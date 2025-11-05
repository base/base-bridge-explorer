import { SolanaMessageDecoder } from "@/lib/solana";
import { NextRequest, NextResponse } from "next/server";
import { Hex } from "viem";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const pubkey = searchParams.get("pubkey");
  const isMainnet = searchParams.get("isMainnet") === "true";
  if (!pubkey) {
    return NextResponse.json(
      { error: "Missing required parameter: pubkey" },
      { status: 400 }
    );
  }

  const solanaDecoder = new SolanaMessageDecoder();
  const { initTx } = await solanaDecoder.findSolanaInitTx(
    pubkey as Hex,
    isMainnet
  );
  if (!initTx) {
    return NextResponse.json(
      { error: "Solana init tx not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(initTx, { status: 200 });
}
