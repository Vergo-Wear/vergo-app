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
  brandFoundingYear?: string;

  @IsString()
  @IsOptional()
  brandOrigin?: string;

  @IsString()
  @IsOptional()
  brandMissionTitle?: string;

  @IsString()
  @IsOptional()
  brandMissionDescription?: string;

  @IsString()
  @IsOptional()
  ownerBadge?: string;

  @IsString()
  @IsOptional()
  ownerTitle?: string;

  @IsString()
  @IsOptional()
  ownerSubtitle?: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  ownerRole?: string;

  @IsString()
  @IsOptional()
  ownerBio?: string;

  @IsString()
  @IsOptional()
  ownerQuote?: string;

  @IsString()
  @IsOptional()
  ownerImageUrl?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankBranch?: string;

  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsOptional()
  ads?: any[];

  @IsOptional()
  featuredFeedbacks?: any[];

  @IsString()
  @IsOptional()
  standardBadge?: string;

  @IsString()
  @IsOptional()
  standardTitle?: string;

  @IsString()
  @IsOptional()
  standardSubtitle?: string;

  @IsOptional()
  standardFeatures?: any[];

  @IsString()
  @IsOptional()
  feedbackBadge?: string;

  @IsString()
  @IsOptional()
  feedbackTitle?: string;

  @IsString()
  @IsOptional()
  feedbackSubtitle?: string;

  @IsString()
  @IsOptional()
  aboutCollectionsBadge?: string;

  @IsString()
  @IsOptional()
  aboutCollectionsTitle?: string;

  @IsOptional()
  aboutCollections?: any[];

  @IsString()
  @IsOptional()
  whatsappNumber?: string;
}

