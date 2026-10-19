import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Profiles, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** Profile with its role relation included */
type ProfileWithRole = Profiles & { role: Role | null };

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new profile linked to an existing auth.users record.
   * Validates that the auth user and role exist, and that no duplicate profile exists.
   */
  async create(dto: CreateProfileDto) {
    // Validate auth user exists
    const authUser = await this.prisma.authUser.findUnique({
      where: { id: dto.id },
    });

    if (!authUser) {
      throw new NotFoundException(
        `Auth user with ID "${dto.id}" not found. Profile must reference an existing auth.users record.`,
      );
    }

    // Check for duplicate profile
    const existingProfile = await this.prisma.profiles.findUnique({
      where: { id: dto.id },
    });

    if (existingProfile) {
      throw new ConflictException(
        `A profile already exists for user ID "${dto.id}".`,
      );
    }

    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { roleId: dto.roleId },
    });

    if (!role) {
      throw new BadRequestException(`Role with ID "${dto.roleId}" not found.`);
    }

    const profile = await this.prisma.profiles.create({
      data: {
        id: dto.id,
        roleId: dto.roleId,
        username: dto.username,
        status: dto.status ?? 'active',
      },
      include: { role: true },
    });

    this.logger.log(`Profile created for user ID "${dto.id}"`);
    return this.formatProfileResponse(profile);
  }

  /**
   * Returns all profiles with their role information.
   */
  async findAll() {
    const profiles = await this.prisma.profiles.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    return profiles.map((profile) => this.formatProfileResponse(profile));
  }

  /**
   * Returns a single profile by ID, including role information.
   * Inactive profiles are still readable.
   */
  async findOne(id: string) {
    const profile = await this.prisma.profiles.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found.`);
    }

    return this.formatProfileResponse(profile);
  }

  /**
   * Returns the profile for the currently authenticated user.
   */
  async findCurrentUser(userId: string) {
    return this.findOne(userId);
  }

  /**
   * Updates an existing profile. Validates role if roleId is being changed.
   */
  async update(id: string, dto: UpdateProfileDto) {
    // Verify profile exists
    const existingProfile = await this.prisma.profiles.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      throw new NotFoundException(`Profile with ID "${id}" not found.`);
    }

    // Validate role if being updated
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { roleId: dto.roleId },
      });

      if (!role) {
        throw new BadRequestException(
          `Role with ID "${dto.roleId}" not found.`,
        );
      }
    }

    // Check username uniqueness if being updated
    if (dto.username) {
      const existingUsername = await this.prisma.profiles.findUnique({
        where: { username: dto.username },
      });

      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException(
          `Username "${dto.username}" is already taken.`,
        );
      }
    }

    const updated = await this.prisma.profiles.update({
      where: { id },
      data: {
        ...(dto.roleId !== undefined && { roleId: dto.roleId }),
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { role: true },
    });

    this.logger.log(`Profile updated for user ID "${id}"`);
    return this.formatProfileResponse(updated);
  }

  /**
   * Formats a profile record to include role as a nested object,
   * matching the required API response structure.
   */
  private formatProfileResponse(profile: ProfileWithRole) {
    return {
      id: profile.id,
      username: profile.username,
      status: profile.status,
      createdAt: profile.createdAt,
      role: profile.role
        ? {
            roleId: profile.role.roleId,
            roleName: profile.role.roleName,
          }
        : null,
    };
  }
}
