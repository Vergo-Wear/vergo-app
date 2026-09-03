import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestUser } from './supabase-auth.guard';

interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

/**
 * Restricts access to routes decorated with @Roles(...). Must run after
 * SupabaseAuthGuard, which populates request.user.role.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = request.user?.role?.toLowerCase();
    const allowed = requiredRoles.some(
      (role) => role.toLowerCase() === userRole,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
