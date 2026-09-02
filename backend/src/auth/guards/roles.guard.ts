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
    const userEmail = request.user?.email?.toLowerCase() || null;

    const allowed = requiredRoles.some(
      (role) => role.toLowerCase() === userRole,
    );

    // Strict Admin check: If user holds the Admin role, enforce official admin email vergo.wearofficial@gmail.com
    if (userRole === 'admin' && userEmail !== 'vergo.wearofficial@gmail.com') {
      throw new ForbiddenException(
        'Access denied. Only the official administrator email (vergo.wearofficial@gmail.com) is authorized to access Admin features.',
      );
    }

    if (!allowed) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
