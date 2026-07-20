import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';

/**
 * Thin reusable wrapper around the Cloudinary SDK. Other modules
 * (payment proofs today, product images later) upload buffers through
 * this service and persist only the returned secure URL.
 */
@Injectable()
export class CloudinaryService {
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.configured = Boolean(cloudName && apiKey && apiSecret);
    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  /**
   * Uploads a file buffer and resolves with the full Cloudinary response.
   * Callers should persist response.secure_url only — never the file itself.
   */
  async uploadBuffer(
    buffer: Buffer,
    options: UploadApiOptions = {},
  ): Promise<UploadApiResponse> {
    if (!this.configured) {
      throw new InternalServerErrorException(
        'File storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      );
    }

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', ...options },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                `File upload failed: ${error?.message ?? 'no response from storage provider'}`,
              ),
            );
            return;
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }

  /** Deletes a replaced or failed upload so only the current receipt remains. */
  async deleteAsset(publicId: string): Promise<void> {
    if (!this.configured || !publicId) return;
    const destroy = (resourceType: 'image' | 'raw') =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
    const imageResult = await destroy('image');
    if (imageResult.result === 'not found') await destroy('raw');
  }
}
