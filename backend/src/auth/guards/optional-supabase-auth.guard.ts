import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../supabase.service';
import type { RequestUser } from './supabase-auth.guard';

interface OptionalAuthenticatedRequest extends Request {
  user?: RequestUser;
}

@Injectable()
export class OptionalSupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<OptionalAuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header) return true;
    if (!header.startsWith('Bearer '))
      throw new UnauthorizedException('Invalid Authorization header.');
    const {
      data: { user },
      error,
    } = await this.supabase.client.auth.getUser(header.slice(7));
    if (error || !user)
      throw new UnauthorizedException('Invalid or expired token.');
    const profile = await this.prisma.profiles.findUnique({
      where: { id: user.id },
      include: { role: true },
    });
    if (!profile || profile.status !== 'active')
      throw new UnauthorizedException('Customer account is unavailable.');
    request.user = {
      id: user.id,
      email: user.email?.toLowerCase() || null,
      role: profile.role?.roleName || null,
      status: profile.status,
    };
    return true;
  }
}
