import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseService, SupabaseAuthGuard, RolesGuard],
  exports: [SupabaseAuthGuard, RolesGuard, AuthService, SupabaseService],
})
export class AuthModule {}
