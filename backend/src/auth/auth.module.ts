import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { AuthController } from './auth.controller';
import { OptionalSupabaseAuthGuard } from './guards/optional-supabase-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseService,
    SupabaseAuthGuard,
    OptionalSupabaseAuthGuard,
    RolesGuard,
  ],
  exports: [
    SupabaseAuthGuard,
    OptionalSupabaseAuthGuard,
    RolesGuard,
    AuthService,
    SupabaseService,
  ],
})
export class AuthModule {}
