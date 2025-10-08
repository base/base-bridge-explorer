import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const chainId = searchParams.get("chainId") ?? searchParams.get("chainid");
  if (!chainId) {
    return NextResponse.json(
      { error: "Missing required parameter: chainId" },
      { status: 400 }
    );
  }

  const moduleParam = searchParams.get("module") ?? "logs";
  const actionParam = searchParams.get("action") ?? "getLogs";

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey || apiKey === "your_etherscan_api_key_here") {
    return NextResponse.json(
      { 
        error: "Etherscan API key not configured. Please set ETHERSCAN_API_KEY in your .env.local file.",
        details: "Get your API key from https://etherscan.io/apis"
      },
      { status: 500 }
    );
  }

  const upstreamParams = new URLSearchParams();
  upstreamParams.set("chainid", chainId);
  upstreamParams.set("module", moduleParam);
  upstreamParams.set("action", actionParam);

  const allowedParams = [
    "address",
    "topic0",
    "topic1",
    "topic2",
    "topic3",
    "topic0_1_opr",
    "topic1_2_opr",
    "topic2_3_opr",
    "fromBlock",
    "toBlock",
    "page",
    "offset",
    "blockhash",
  ];

  for (const key of allowedParams) {
    const value = searchParams.get(key);
    if (value !== null) {
      upstreamParams.set(key, value);
    }
  }

  upstreamParams.set("apikey", apiKey);

  const upstreamUrl = `https://api.etherscan.io/v2/api?${upstreamParams.toString()}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await upstreamRes.json();
    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (error) {
    console.error("Failed to fetch from upstream explorer:", error);
    return NextResponse.json(
      { error: "Failed to fetch from upstream explorer" },
      { status: 502 }
    );
  }
}

