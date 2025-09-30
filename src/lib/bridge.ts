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

export interface BridgeQueryResult {
  isBridgeRelated: boolean;
  status?: BridgeStatus;
  initialTx?: InitialTxDetails;
  executeTx?: ExecuteTxDetails;
  validationTx?: ValidationTxDetails;
  kind?: ResultKind;
}
