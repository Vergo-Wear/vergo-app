import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  public readonly client: SupabaseClient;
  public readonly adminClient: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || 'https://placeholder-url.supabase.co';
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || 'placeholder-anon-key';
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || 'placeholder-service-key';

    if (!this.configService.get<string>('SUPABASE_URL') || !this.configService.get<string>('SUPABASE_ANON_KEY') || !this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')) {
      this.logger.warn(
        'SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY not set in environment variables. Using placeholder values for startup.',
      );
    }

    // Anon client for normal requests
    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Admin client (with service role key) for user management and rollbacks
    this.adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}
