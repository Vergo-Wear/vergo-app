import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { UpdateDeliveryFeeRuleDto } from './update-delivery-fee-rule.dto';

export class BulkUpdateDeliveryFeeRulesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ruleIds?: string[];

  @IsOptional()
  @IsBoolean()
  applyToAll?: boolean;

  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => UpdateDeliveryFeeRuleDto)
  updates: UpdateDeliveryFeeRuleDto;
}
