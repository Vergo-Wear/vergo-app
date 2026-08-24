import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCitypakShipmentDto {
  @IsInt()
  @Min(1, { message: 'Package weight must be at least 1 gram' })
  @Max(100000, { message: 'Package weight cannot exceed 100,000 grams (100 kg)' })
  weightGrams: number;

  @IsInt()
  @Min(1, { message: 'Number of pieces must be at least 1' })
  @Max(20, { message: 'Number of pieces cannot exceed 20' })
  numberOfPieces: number;

  @IsOptional()
  @IsString()
  @MaxLength(128, { message: 'Package description cannot exceed 128 characters' })
  description?: string;

  // Optional local package dimensions
  @IsOptional()
  lengthCm?: number;

  @IsOptional()
  widthCm?: number;

  @IsOptional()
  heightCm?: number;
}
