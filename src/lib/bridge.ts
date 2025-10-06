import { ResultKind } from "./solana";
import {
  ExecuteTxDetails,
  InitialTxDetails,
  ValidationTxDetails,
} from "./transaction";

export enum BridgeStatus {
  Pending = "Pending",
  Validated = "Validated",
  Executed = "Completed",
}

export interface BridgeQueryResult {
  isBridgeRelated: boolean;
  status?: BridgeStatus;
  initialTx?: InitialTxDetails;
  executeTx?: ExecuteTxDetails;
  validationTx?: ValidationTxDetails;
  kind?: ResultKind;
  error?: string;
}
