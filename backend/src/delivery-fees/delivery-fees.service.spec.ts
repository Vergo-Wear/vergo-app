import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryFeesService } from './delivery-fees.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('DeliveryFeesService', () => {
  let service: DeliveryFeesService;
  let prismaMock: any;

  const mockDefaultRule = {
    ruleId: '11111111-1111-1111-1111-111111111111',
    district: 'Colombo',
    baseDeliveryFee: new Prisma.Decimal(400),
    baseItemLimit: 5,
    additionalItemBlockSize: 5,
    additionalBlockFee: new Prisma.Decimal(140),
    fuelSurchargePercentage: new Prisma.Decimal(15),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      deliveryFeeRule: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryFeesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DeliveryFeesService>(DeliveryFeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateDeliveryFee', () => {
    beforeEach(() => {
      prismaMock.deliveryFeeRule.findFirst.mockResolvedValue(mockDefaultRule);
    });

    it('rejects 0 quantity', async () => {
      await expect(
        service.calculateDeliveryFee('Colombo', 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects negative quantity', async () => {
      await expect(
        service.calculateDeliveryFee('Colombo', -5),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-integer quantity', async () => {
      await expect(
        service.calculateDeliveryFee('Colombo', 2.5),
      ).rejects.toThrow(BadRequestException);
    });

    it('calculates correctly for 1 item', async () => {
      const res = await service.calculateDeliveryFee('Colombo', 1);
      expect(res).toEqual({
        district: 'Colombo',
        totalQuantity: 1,
        baseItemLimit: 5,
        baseDeliveryFee: 400,
        additionalItemBlockSize: 5,
        additionalBlockFee: 140,
        additionalBlocks: 0,
        additionalCharge: 0,
        baseDeliveryCharge: 400,
        fuelSurchargePercentage: 15,
        fuelSurchargeAmount: 60,
        totalDeliveryFee: 460,
      });
    });

    it('calculates correctly for 4 items', async () => {
      const res = await service.calculateDeliveryFee('Colombo', 4);
      expect(res.baseDeliveryCharge).toBe(400);
      expect(res.additionalBlocks).toBe(0);
      expect(res.fuelSurchargeAmount).toBe(60);
      expect(res.totalDeliveryFee).toBe(460);
    });

    it('calculates correctly for 5 items', async () => {
      const res = await service.calculateDeliveryFee('Colombo', 5);
      expect(res.baseDeliveryCharge).toBe(400);
      expect(res.additionalBlocks).toBe(0);
      expect(res.fuelSurchargeAmount).toBe(60);
      expect(res.totalDeliveryFee).toBe(460);
    });

    it('calculates correctly for 6 items', async () => {
      const res = await service.calculateDeliveryFee('Colombo', 6);
      expect(res.additionalBlocks).toBe(1);
      expect(res.additionalCharge).toBe(140);
      expect(res.baseDeliveryCharge).toBe(540);
      expect(res.fuelSurchargeAmount).toBe(81);
      expect(res.totalDeliveryFee).toBe(621);
    });

    it('calculates correctly for 7 items (Colombo Example 1)', async () => {
      const res = await service.calculateDeliveryFee('Colombo', 7);
      expect(res.additionalBlocks).toBe(1);
      expect(res.additionalCharge).toBe(140);
      expect(res.baseDeliveryCharge).toBe(540);
      expect(res.fuelSurchargeAmount).toBe(81);
      expect(res.totalDeliveryFee).toBe(621);
    });

    it('calculates correctly for 10 items', async () => {
      const res = await service.calculateDeliveryFee('Colombo', 10);
      expect(res.additionalBlocks).toBe(1);
      expect(res.additionalCharge).toBe(140);
      expect(res.baseDeliveryCharge).toBe(540);
      expect(res.fuelSurchargeAmount).toBe(81);
      expect(res.totalDeliveryFee).toBe(621);
    });

    it('calculates correctly for 11 items', async () => {
      const res = await service.calculateDeliveryFee('Colombo', 11);
      expect(res.additionalBlocks).toBe(2);
      expect(res.additionalCharge).toBe(280);
      expect(res.baseDeliveryCharge).toBe(680);
      expect(res.fuelSurchargeAmount).toBe(102);
      expect(res.totalDeliveryFee).toBe(782);
    });

    it('calculates correctly for 15 items', async () => {
      const res = await service.calculateDeliveryFee('Colombo', 15);
      expect(res.additionalBlocks).toBe(2);
      expect(res.additionalCharge).toBe(280);
      expect(res.baseDeliveryCharge).toBe(680);
      expect(res.fuelSurchargeAmount).toBe(102);
      expect(res.totalDeliveryFee).toBe(782);
    });

    it('calculates correctly for 16 items', async () => {
      const res = await service.calculateDeliveryFee('Colombo', 16);
      expect(res.additionalBlocks).toBe(3);
      expect(res.additionalCharge).toBe(420);
      expect(res.baseDeliveryCharge).toBe(820);
      expect(res.fuelSurchargeAmount).toBe(123);
      expect(res.totalDeliveryFee).toBe(943);
    });

    it('calculates correctly for Jaffna (Example 2 with custom rules)', async () => {
      prismaMock.deliveryFeeRule.findFirst.mockResolvedValue({
        ruleId: 'rule-jaffna',
        district: 'Jaffna',
        baseDeliveryFee: new Prisma.Decimal(500),
        baseItemLimit: 4,
        additionalItemBlockSize: 4,
        additionalBlockFee: new Prisma.Decimal(180),
        fuelSurchargePercentage: new Prisma.Decimal(18),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.calculateDeliveryFee('Jaffna', 7);
      expect(res.district).toBe('Jaffna');
      expect(res.additionalBlocks).toBe(1);
      expect(res.additionalCharge).toBe(180);
      expect(res.baseDeliveryCharge).toBe(680);
      expect(res.fuelSurchargeAmount).toBe(122.4);
      expect(res.totalDeliveryFee).toBe(802.4);
    });

    it('proves district independence between Colombo and Jaffna', async () => {
      // Colombo: 400 / 5 / 5 / 140 / 15% -> Qty 7 = 621
      prismaMock.deliveryFeeRule.findFirst.mockImplementation(async (args) => {
        const dist = args.where?.district?.equals;
        if (dist === 'Jaffna') {
          return {
            ruleId: 'rule-jaffna',
            district: 'Jaffna',
            baseDeliveryFee: new Prisma.Decimal(500),
            baseItemLimit: 4,
            additionalItemBlockSize: 4,
            additionalBlockFee: new Prisma.Decimal(180),
            fuelSurchargePercentage: new Prisma.Decimal(18),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return mockDefaultRule;
      });

      const colomboRes = await service.calculateDeliveryFee('Colombo', 7);
      const jaffnaRes = await service.calculateDeliveryFee('Jaffna', 7);

      expect(colomboRes.totalDeliveryFee).toBe(621);
      expect(jaffnaRes.totalDeliveryFee).toBe(802.4);
    });

    it('rejects inactive district', async () => {
      prismaMock.deliveryFeeRule.findFirst.mockResolvedValue({
        ...mockDefaultRule,
        isActive: false,
      });

      await expect(
        service.calculateDeliveryFee('Colombo', 5),
      ).rejects.toThrow(
        new BadRequestException(
          'Delivery is currently unavailable for the selected district.',
        ),
      );
    });

    it('rejects missing district', async () => {
      prismaMock.deliveryFeeRule.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateDeliveryFee('UnknownDistrict', 5),
      ).rejects.toThrow(
        new NotFoundException(
          "Delivery is unavailable for district 'UnknownDistrict'.",
        ),
      );
    });
  });

  describe('bulkUpdateRules', () => {
    it('bulk updates selected rules', async () => {
      prismaMock.deliveryFeeRule.updateMany.mockResolvedValue({ count: 3 });

      const res = await service.bulkUpdateRules({
        ruleIds: ['rule-1', 'rule-2', 'rule-3'],
        updates: {
          baseDeliveryFee: 450,
          fuelSurchargePercentage: 18,
        },
      });

      expect(res.count).toBe(3);
      expect(prismaMock.deliveryFeeRule.updateMany).toHaveBeenCalledWith({
        where: { ruleId: { in: ['rule-1', 'rule-2', 'rule-3'] } },
        data: {
          baseDeliveryFee: expect.any(Object),
          fuelSurchargePercentage: expect.any(Object),
        },
      });
    });

    it('bulk updates all rules when applyToAll is true', async () => {
      prismaMock.deliveryFeeRule.updateMany.mockResolvedValue({ count: 25 });

      const res = await service.bulkUpdateRules({
        applyToAll: true,
        updates: {
          fuelSurchargePercentage: 18,
        },
      });

      expect(res.count).toBe(25);
      expect(prismaMock.deliveryFeeRule.updateMany).toHaveBeenCalledWith({
        data: {
          fuelSurchargePercentage: expect.any(Object),
        },
      });
    });

    it('rejects empty updates object', async () => {
      await expect(
        service.bulkUpdateRules({
          applyToAll: true,
          updates: {},
        }),
      ).rejects.toThrow(
        new BadRequestException('At least one update field is required.'),
      );
    });

    it('rejects missing ruleIds when applyToAll is false', async () => {
      await expect(
        service.bulkUpdateRules({
          applyToAll: false,
          ruleIds: [],
          updates: { baseDeliveryFee: 500 },
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'At least one valid ruleId must be specified for bulk update.',
        ),
      );
    });
  });
});
