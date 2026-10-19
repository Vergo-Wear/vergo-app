import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDeliveryFeeRuleDto } from './dto/update-delivery-fee-rule.dto';
import { BulkUpdateDeliveryFeeRulesDto } from './dto/bulk-update-delivery-fee-rule.dto';
import { Prisma } from '@prisma/client';

export interface DeliveryCalculationBreakdown {
  district: string;
  totalQuantity: number;
  baseItemLimit: number;
  baseDeliveryFee: number;
  additionalItemBlockSize: number;
  additionalBlockFee: number;
  additionalBlocks: number;
  additionalCharge: number;
  baseDeliveryCharge: number;
  fuelSurchargePercentage: number;
  fuelSurchargeAmount: number;
  totalDeliveryFee: number;
}

@Injectable()
export class DeliveryFeesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllRules() {
    return this.prisma.deliveryFeeRule.findMany({
      orderBy: { district: 'asc' },
    });
  }

  async getActiveRules() {
    return this.prisma.deliveryFeeRule.findMany({
      where: { isActive: true },
      orderBy: { district: 'asc' },
    });
  }

  async getRuleByDistrict(district: string) {
    if (!district || !district.trim()) {
      throw new BadRequestException('District is required.');
    }
    const cleanDistrict = district.trim();
    const rule = await this.prisma.deliveryFeeRule.findFirst({
      where: {
        district: {
          equals: cleanDistrict,
          mode: 'insensitive',
        },
      },
    });

    if (!rule) {
      throw new NotFoundException(
        `Delivery is unavailable for district '${cleanDistrict}'.`,
      );
    }
    return rule;
  }

  async updateRule(ruleId: string, dto: UpdateDeliveryFeeRuleDto) {
    const existing = await this.prisma.deliveryFeeRule.findUnique({
      where: { ruleId },
    });
    if (!existing) {
      throw new NotFoundException(`Delivery rule not found for ID '${ruleId}'.`);
    }

    const dataToUpdate: Prisma.DeliveryFeeRuleUpdateInput = {};

    if (dto.baseDeliveryFee !== undefined) {
      dataToUpdate.baseDeliveryFee = new Prisma.Decimal(dto.baseDeliveryFee);
    }
    if (dto.baseItemLimit !== undefined) {
      dataToUpdate.baseItemLimit = dto.baseItemLimit;
    }
    if (dto.additionalItemBlockSize !== undefined) {
      dataToUpdate.additionalItemBlockSize = dto.additionalItemBlockSize;
    }
    if (dto.additionalBlockFee !== undefined) {
      dataToUpdate.additionalBlockFee = new Prisma.Decimal(dto.additionalBlockFee);
    }
    if (dto.fuelSurchargePercentage !== undefined) {
      dataToUpdate.fuelSurchargePercentage = new Prisma.Decimal(
        dto.fuelSurchargePercentage,
      );
    }
    if (dto.isActive !== undefined) {
      dataToUpdate.isActive = dto.isActive;
    }

    return this.prisma.deliveryFeeRule.update({
      where: { ruleId },
      data: dataToUpdate,
    });
  }

  async bulkUpdateRules(dto: BulkUpdateDeliveryFeeRulesDto) {
    if (!dto.updates || Object.keys(dto.updates).length === 0) {
      throw new BadRequestException('At least one update field is required.');
    }

    const dataToUpdate: Prisma.DeliveryFeeRuleUpdateInput = {};

    if (dto.updates.baseDeliveryFee !== undefined) {
      dataToUpdate.baseDeliveryFee = new Prisma.Decimal(dto.updates.baseDeliveryFee);
    }
    if (dto.updates.baseItemLimit !== undefined) {
      dataToUpdate.baseItemLimit = dto.updates.baseItemLimit;
    }
    if (dto.updates.additionalItemBlockSize !== undefined) {
      dataToUpdate.additionalItemBlockSize = dto.updates.additionalItemBlockSize;
    }
    if (dto.updates.additionalBlockFee !== undefined) {
      dataToUpdate.additionalBlockFee = new Prisma.Decimal(dto.updates.additionalBlockFee);
    }
    if (dto.updates.fuelSurchargePercentage !== undefined) {
      dataToUpdate.fuelSurchargePercentage = new Prisma.Decimal(
        dto.updates.fuelSurchargePercentage,
      );
    }
    if (dto.updates.isActive !== undefined) {
      dataToUpdate.isActive = dto.updates.isActive;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      throw new BadRequestException('At least one update field is required.');
    }

    let count = 0;
    if (dto.applyToAll) {
      const result = await this.prisma.deliveryFeeRule.updateMany({
        data: dataToUpdate,
      });
      count = result.count;
    } else {
      if (!dto.ruleIds || !Array.isArray(dto.ruleIds) || dto.ruleIds.length === 0) {
        throw new BadRequestException(
          'At least one valid ruleId must be specified for bulk update.',
        );
      }
      const result = await this.prisma.deliveryFeeRule.updateMany({
        where: { ruleId: { in: dto.ruleIds } },
        data: dataToUpdate,
      });
      count = result.count;
    }

    return {
      count,
      message: `Successfully updated ${count} delivery fee rules.`,
    };
  }

  async calculateDeliveryFee(
    district: string,
    totalQuantity: number,
  ): Promise<DeliveryCalculationBreakdown> {
    if (
      typeof totalQuantity !== 'number' ||
      !Number.isInteger(totalQuantity) ||
      totalQuantity < 1
    ) {
      throw new BadRequestException(
        'totalQuantity must be a positive integer greater than or equal to 1.',
      );
    }

    const rule = await this.getRuleByDistrict(district);

    if (!rule.isActive) {
      throw new BadRequestException(
        'Delivery is currently unavailable for the selected district.',
      );
    }

    const baseDeliveryFee = Number(rule.baseDeliveryFee);
    const baseItemLimit = rule.baseItemLimit;
    const additionalItemBlockSize = rule.additionalItemBlockSize;
    const additionalBlockFee = Number(rule.additionalBlockFee);
    const fuelSurchargePercentage = Number(rule.fuelSurchargePercentage);

    const extraQuantity = Math.max(totalQuantity - baseItemLimit, 0);
    const additionalBlocks = Math.ceil(
      extraQuantity / additionalItemBlockSize,
    );
    const additionalCharge = additionalBlocks * additionalBlockFee;
    const baseDeliveryCharge = baseDeliveryFee + additionalCharge;

    const rawFuelSurcharge =
      baseDeliveryCharge * (fuelSurchargePercentage / 100);
    const fuelSurchargeAmount = Math.round(rawFuelSurcharge * 100) / 100;

    const rawTotal = baseDeliveryCharge + fuelSurchargeAmount;
    const totalDeliveryFee = Math.round(rawTotal * 100) / 100;

    return {
      district: rule.district,
      totalQuantity,
      baseItemLimit,
      baseDeliveryFee: Math.round(baseDeliveryFee * 100) / 100,
      additionalItemBlockSize,
      additionalBlockFee: Math.round(additionalBlockFee * 100) / 100,
      additionalBlocks,
      additionalCharge: Math.round(additionalCharge * 100) / 100,
      baseDeliveryCharge: Math.round(baseDeliveryCharge * 100) / 100,
      fuelSurchargePercentage: Math.round(fuelSurchargePercentage * 100) / 100,
      fuelSurchargeAmount,
      totalDeliveryFee,
    };
  }
}
