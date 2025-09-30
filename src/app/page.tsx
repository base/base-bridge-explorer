"use client";

import { useState } from "react";
import { BridgeQueryResult } from "@/lib/bridge";
import { Header } from "@/components/Header";
import { InputForm } from "@/components/InputForm";
import { Results } from "@/components/Results";

export default function Home() {
  const [result, setResult] = useState<BridgeQueryResult | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center px-8 py-20">
      <main className="relative w-full max-w-3xl md:max-w-4xl">
        <Header />

        <InputForm setResult={setResult} />

        <Results result={result} />
      </main>
    </div>
  );
}
