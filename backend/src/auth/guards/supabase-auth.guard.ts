import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

/** Authenticated identity attached to the request by SupabaseAuthGuard */
export interface RequestUser {
  id: string;
  role: string | null;
  status: string | null;
}

/** Extends Express Request to include the authenticated Supabase user */
interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

/**
 * Guard that validates Supabase JWT tokens from the Authorization header,
 * loads the matching profile's role and status, and attaches the result
 * to request.user. Rejects tokens for profiles whose status isn't 'active'.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey =
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        this.logger.warn(`Auth token validation failed: ${error?.message}`);
        throw new UnauthorizedException('Invalid or expired token');
      }

      const profile = await this.prisma.profiles.findUnique({
        where: { id: user.id },
        include: { role: true },
      });

      if (profile && profile.status !== 'active') {
        throw new ForbiddenException(
          `Profile status is "${profile.status}". Access is only permitted for active profiles.`,
        );
      }

      // Attach user identity, role and status to request for downstream use
      request.user = {
        id: user.id,
        role: profile?.role?.roleName ?? null,
        status: profile?.status ?? null,
      };
      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error during token validation:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
