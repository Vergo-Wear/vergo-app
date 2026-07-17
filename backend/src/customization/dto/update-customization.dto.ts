import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomizationDto {
  @IsString()
  @IsOptional()
  heroBadge?: string;

  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroSubtitle?: string;

  @IsString()
  @IsOptional()
  heroButtonText?: string;

  @IsString()
  @IsOptional()
  highlightsTitle?: string;

  @IsString()
  @IsOptional()
  highlightsSubtitle?: string;

  @IsString()
  @IsOptional()
  newsletterTitle?: string;

  @IsString()
  @IsOptional()
  newsletterSubtitle?: string;

  @IsString()
  @IsOptional()
  aboutHeroBadge?: string;

  @IsString()
  @IsOptional()
  aboutHeroTitle?: string;

  @IsString()
  @IsOptional()
  aboutHeroSubtitle?: string;

  @IsString()
  @IsOptional()
  brandStatementBadge?: string;

  @IsString()
  @IsOptional()
  brandStatementTitle?: string;

  @IsString()
  @IsOptional()
  brandStatementDescription?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankBranch?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;
}
