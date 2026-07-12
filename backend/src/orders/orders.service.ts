import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto, SRI_LANKAN_DISTRICTS } from "./dto/create-order.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException("Order must contain at least one item.");
    }

    // 1. Enforce that Guest checkouts cannot select Bank Transfer
    const isGuest = !createOrderDto.customerId;
    const isBankTransfer = createOrderDto.paymentMethod.toLowerCase().includes("bank");
    if (isGuest && isBankTransfer) {
      throw new BadRequestException(
        "Guest checkouts are not allowed to use Bank Transfer payment. Please sign in or choose Cash on Delivery."
      );
    }

    // 2. Validate that district is one of the supported districts
    const enteredDistrict = createOrderDto.shippingDetails.district.trim().toLowerCase();
    const isValidDistrict = SRI_LANKAN_DISTRICTS.some(
      (d) => d.toLowerCase() === enteredDistrict
    );
    if (!isValidDistrict) {
      throw new BadRequestException(
        `Shipping district "${createOrderDto.shippingDetails.district}" is not a valid Sri Lankan district.`
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Validate variants and collect pricing details
        let productTotal = 0;
        const itemsToCreate: {
          variantId: string;
          quantity: number;
          unitPrice: Prisma.Decimal;
          subtotal: Prisma.Decimal;
        }[] = [];

        for (const item of createOrderDto.items) {
          const variant = await tx.productVariant.findUnique({
            where: { variantId: item.variantId },
            include: { product: true },
          });

          if (!variant) {
            throw new BadRequestException(`Product variant with ID ${item.variantId} not found.`);
          }

          // Calculate variant-specific price: variant.priceAdjustment + product.basePrice
          const basePrice = Number(variant.product?.basePrice || 0);
          const priceAdjustment = Number(variant.priceAdjustment || 0);
          const unitPrice = basePrice + priceAdjustment;
          const subtotal = unitPrice * item.quantity;

          productTotal += subtotal;

          itemsToCreate.push({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(unitPrice),
            subtotal: new Prisma.Decimal(subtotal),
          });
        }

        // 2. Prepare totals
        const deliveryFee = Number(createOrderDto.deliveryFee);
        const totalAmount = productTotal + deliveryFee;
        
        // Save COD amount for COD orders (matches totalAmount), otherwise 0
        const isCod = createOrderDto.paymentMethod.toLowerCase() === "cod" || 
                      createOrderDto.paymentMethod.toLowerCase() === "cash on delivery";
        const codAmount = isCod ? totalAmount : 0.00;

        // 3. Construct a standard shipping address string representation
        const sd = createOrderDto.shippingDetails;
        const shippingAddress = `${sd.addressLine1}${sd.addressLine2 ? ", " + sd.addressLine2 : ""}, ${sd.city}, ${sd.district}${sd.postalCode ? " (" + sd.postalCode + ")" : ""}`;

        // 4. Set appropriate order status based on payment method
        const orderStatus = isCod ? "Pending Verification" : "Pending Payment";

        // 5. Create main Order record
        const order = await tx.orders.create({
          data: {
            customerId: createOrderDto.customerId || null,
            totalAmount: new Prisma.Decimal(totalAmount),
            productTotal: new Prisma.Decimal(productTotal),
            deliveryFee: new Prisma.Decimal(deliveryFee),
            codAmount: new Prisma.Decimal(codAmount),
            paymentMethod: createOrderDto.paymentMethod,
            shippingAddress: shippingAddress,
            orderStatus: orderStatus,
          },
        });

        // 6. Create Order Items and link to order_id and variant_id
        for (const item of itemsToCreate) {
          await tx.orderItem.create({
            data: {
              orderId: order.orderId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            },
          });
        }

        // 7. Save customer classification and contact details
        const customerType = createOrderDto.customerId ? "registered" : "guest";
        await tx.orderCustomerDetails.create({
          data: {
            orderId: order.orderId,
            firstName: createOrderDto.contactDetails.firstName,
            lastName: createOrderDto.contactDetails.lastName,
            email: createOrderDto.contactDetails.email,
            phone: createOrderDto.contactDetails.phone,
            customerType: customerType,
          },
        });

        // 8. Save order shipping details
        await tx.orderShippingDetails.create({
          data: {
            orderId: order.orderId,
            receiverName: sd.receiverName,
            phone: sd.phone,
            addressLine1: sd.addressLine1,
            addressLine2: sd.addressLine2 || null,
            city: sd.city,
            district: sd.district,
            postalCode: sd.postalCode || null,
            deliveryNote: sd.deliveryNote || null,
          },
        });

        return order;
      });
    } catch (dbError) {
      if (dbError instanceof BadRequestException) {
        throw dbError;
      }
      throw new InternalServerErrorException("Failed to create order.");
    }
  }

  async uploadPaymentProof(orderId: string, originalname: string) {
    const order = await this.prisma.orders.findUnique({
      where: { orderId },
    });

    if (!order) {
      throw new BadRequestException(`Order with ID ${orderId} not found.`);
    }

    const receiptUrl = `/uploads/proofs/${orderId}_${originalname}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.paymentProofs.create({
      data: {
        orderId,
        receiptUrl,
        uploadedAt: new Date(),
        expiresAt,
        status: "Pending Verification",
      },
    });

    return await this.prisma.orders.update({
      where: { orderId },
      data: {
        orderStatus: "Pending Verification",
      },
    });
  }
}
