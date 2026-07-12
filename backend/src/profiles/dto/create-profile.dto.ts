import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ProfileStatus } from '../../common/enums/profile-status.enum';

export class CreateProfileDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(ProfileStatus)
  @IsOptional()
  status?: ProfileStatus;
}
