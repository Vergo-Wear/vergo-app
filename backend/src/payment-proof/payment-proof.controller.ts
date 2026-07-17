import {
  BadRequestException,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PaymentProofService } from './payment-proof.service';
import type { UploadedReceiptFile } from './payment-proof.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

export const RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const RECEIPT_MIME_PATTERN = /(jpg|jpeg|png|webp|pdf)$/i;

@Controller('payment-proofs')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('Customer')
export class PaymentProofController {
  constructor(private readonly paymentProofService: PaymentProofService) {}

  @Get(':orderId')
  getPaymentProof(
    @CurrentUser() profileId: string,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.paymentProofService.getForCustomerOrder(profileId, orderId);
  }

  @Patch(':orderId/upload')
  @UseInterceptors(FileInterceptor('receipt'))
  async uploadReceipt(
    @CurrentUser() profileId: string,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({
            maxSize: RECEIPT_MAX_SIZE_BYTES,
            message: 'Receipt file must be under 5MB.',
          }),
          new FileTypeValidator({ fileType: RECEIPT_MIME_PATTERN }),
        ],
      }),
    )
    receipt?: UploadedReceiptFile,
  ) {
    if (!receipt) {
      throw new BadRequestException(
        'No receipt file uploaded. Attach the file as multipart field "receipt".',
      );
    }
    return this.paymentProofService.uploadReceipt(profileId, orderId, receipt);
  }
}
