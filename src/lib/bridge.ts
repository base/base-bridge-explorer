import { ResultKind } from "./solana";
import {
  ExecuteTxDetails,
  InitialTxDetails,
  ValidationTxDetails,
} from "./transaction";

export enum BridgeStatus {
  Pending = "pending",
  Validated = "pre-validated",
  Executed = "executed",
}

export interface TxMessageRef {
  messageHash: string;
  logIndex: number;
}

export interface BaseTxContainer {
  chain: string; // use ChainName for display; keep as string to avoid circular import
  txHash: string;
  timestamp: string;
  preValidated: TxMessageRef[];
  executed: TxMessageRef[];
}

export interface BridgeQueryResult {
  isBridgeRelated: boolean;
  status?: BridgeStatus;
  initialTx?: InitialTxDetails;
  executeTx?: ExecuteTxDetails;
  validationTx?: ValidationTxDetails;
  kind?: ResultKind;
  txContainer?: BaseTxContainer;
}
