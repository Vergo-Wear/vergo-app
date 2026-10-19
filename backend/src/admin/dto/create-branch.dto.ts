import { IsString, MinLength } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(5)
  address: string;

  @IsString()
  @MinLength(7)
  phone: string;
}
