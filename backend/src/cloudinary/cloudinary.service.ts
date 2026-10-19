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
    try {
      const imageResult = await destroy('image');
      if (imageResult?.result === 'not found') await destroy('raw');
    } catch (err) {
      // Ignore if already removed or invalid
    }
  }

  /**
   * Helper to extract a Cloudinary publicId from a full secure_url.
   * e.g. "https://res.cloudinary.com/aql7sojg/image/upload/v1788961916/products/k5cwxe5syiy2nxfncbls.jpg" -> "products/k5cwxe5syiy2nxfncbls"
   */
  extractPublicIdFromUrl(url?: string | null): string | null {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
      return null;
    }
    try {
      const uploadIndex = url.indexOf('/upload/');
      if (uploadIndex === -1) return null;

      let pathAfterUpload = url.substring(uploadIndex + '/upload/'.length);
      pathAfterUpload = pathAfterUpload.split('?')[0];

      const segments = pathAfterUpload.split('/');
      const nonVersionSegments: string[] = [];

      for (const segment of segments) {
        // Skip version segment e.g. v1788961916 or v1
        if (/^v\d+$/.test(segment)) {
          continue;
        }
        // Skip transformation segment if present before public ID e.g. f_auto,q_auto or c_scale,w_500
        if (
          segment.includes(',') ||
          (segment.includes('_') &&
            (segment.startsWith('f_') ||
              segment.startsWith('q_') ||
              segment.startsWith('w_') ||
              segment.startsWith('c_') ||
              segment.startsWith('h_') ||
              segment.startsWith('b_') ||
              segment.startsWith('e_') ||
              segment.startsWith('r_') ||
              segment.startsWith('co_') ||
              segment.startsWith('l_')))
        ) {
          continue;
        }
        nonVersionSegments.push(segment);
      }

      const fullPath = nonVersionSegments.join('/');
      const lastDotIndex = fullPath.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return fullPath.substring(0, lastDotIndex);
      }
      return fullPath;
    } catch {
      return null;
    }
  }

  /**
   * Deletes a media asset by its URL. Extracts publicId automatically.
   */
  async deleteByUrl(url?: string | null): Promise<void> {
    const publicId = this.extractPublicIdFromUrl(url);
    if (publicId) {
      await this.deleteAsset(publicId);
    }
  }
}
