/**
 * Lifecycle of a bank-transfer payment proof.
 * Approved / Rejected transitions are performed by admins (Sprint 5);
 * this module only ever moves proofs between the other states.
 */
export enum PaymentProofStatus {
  PENDING_UPLOAD = 'Pending Upload',
  PENDING_VERIFICATION = 'Pending Verification',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  EXPIRED = 'Expired',
}
