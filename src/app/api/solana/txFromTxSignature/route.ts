import { SolanaMessageDecoder } from "@/lib/solana";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const signature = searchParams.get("signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing required parameter: signature" },
      { status: 400 }
    );
  }

  try {
    const solanaDecoder = new SolanaMessageDecoder();
    const res = await solanaDecoder.lookupSolanaInitialTx(signature);
    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    console.error("txFromTxSignature error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
