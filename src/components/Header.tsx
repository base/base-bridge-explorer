export const Header = () => {
  return (
    <header className="mb-12 md:mb-14 text-center">
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
        Explore Base Bridge Transactions
      </h1>
      <p className="mt-3 text-[15px] text-[var(--color-muted-foreground)]">
        Paste a Solana signature or Base transaction hash to get started.
      </p>
    </header>
  );
};
