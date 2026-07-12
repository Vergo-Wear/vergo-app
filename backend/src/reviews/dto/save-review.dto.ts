import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SaveReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(8)
  comment: string;

  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  images: string[];
}
