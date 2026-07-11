import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestUser } from '../guards/supabase-auth.guard';

/** Extends Express Request to include the authenticated Supabase user */
interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

/**
 * Custom parameter decorator that extracts the authenticated Supabase user ID
 * from the request object (set by SupabaseAuthGuard).
 *
 * Usage: @CurrentUser() userId: string
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user?.id as string;
  },
);
