import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProfileStatus } from '../../common/enums/profile-status.enum';

export class UpdateProfileDto {
  @IsUUID()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(ProfileStatus)
  @IsOptional()
  status?: ProfileStatus;
}
