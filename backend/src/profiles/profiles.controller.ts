import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  async create(@Body() dto: CreateProfileDto) {
    return this.profilesService.create(dto);
  }

  /**
   * Lists every profile. Admin-only: exposes every user's role/status.
   */
  @Get()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  async findAll() {
    return this.profilesService.findAll();
  }

  /**
   * Returns the authenticated user's own profile.
   * This route MUST be defined before `:id` to avoid conflict.
   */
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  async findCurrentUser(@CurrentUser() userId: string) {
    return this.profilesService.findCurrentUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.profilesService.update(id, dto);
  }
}
