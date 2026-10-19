import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const PAYMENT_PROOF_REVIEW_STATUSES = ['Approved', 'Rejected'];

export class ReviewPaymentProofDto {
  @IsString()
  @IsIn(PAYMENT_PROOF_REVIEW_STATUSES)
  status: string;

  /** Shown to the customer as the rejection reason in the email. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}
