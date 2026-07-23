import { IsIn } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsIn(['AVAILABLE', 'BUSY', 'OFF_DUTY'])
  status: string;
}
