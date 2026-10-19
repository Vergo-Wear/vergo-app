import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Marks a route/controller as restricted to the given role names
 * (matched against profiles.role -> role.role_name). Must be combined
 * with SupabaseAuthGuard, which populates request.user.role.
 *
 * Usage: @Roles('Admin')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
