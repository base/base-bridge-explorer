export enum ChainName {
  Solana = "Solana",
  Base = "Base",
  SolanaDevnet = "Solana Devnet",
  BaseSepolia = "Base Sepolia",
}

export interface InitialTxDetails {
  amount: string;
  asset: string;
  chain: ChainName;
  senderAddress: string;
  transactionHash: string;
  timestamp: string;
}

export interface ExecuteTxDetails {
  status: string;
  amount: string;
  asset: string;
  chain: ChainName;
  receiverAddress: string;
  transactionHash: string;
  timestamp: string;
}

export interface ValidationTxDetails {
  chain: ChainName;
  transactionHash: string;
  timestamp: string;
}
