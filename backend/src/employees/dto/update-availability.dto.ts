import { IsIn } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsIn(['ACTIVE_DUTY', 'ON_BREAK', 'OFF_DUTY'])
  status: string;
}
