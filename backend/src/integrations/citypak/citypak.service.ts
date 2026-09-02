import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateCitypakShipmentDto } from './dto/create-citypak-shipment.dto';
import { CreateCitypakPickupDto } from './dto/create-citypak-pickup.dto';
import { UpdateShipperProfileDto } from './dto/update-shipper-profile.dto';
import { Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class CitypakService {
  private readonly logger = new Logger(CitypakService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationsService,
  ) {}

  private getBaseUrl(): string {
    const raw =
      this.configService.get<string>('CITYPAK_BASE_URL') ||
      'https://staging.citypak.lk';
    return raw.replace(/\/+$/, '');
  }

  private getApiToken(): string {
    const token = this.configService.get<string>('CITYPAK_API_TOKEN');
    if (!token || !token.trim()) {
      throw new BadRequestException(
        'CITYPAK_API_TOKEN is not configured in backend environment.',
      );
    }
    return token.trim();
  }

  private getWebhookSecret(): string {
    const secret = this.configService.get<string>('CITYPAK_WEBHOOK_SECRET');
    return secret ? secret.trim() : '';
  }

  /**
   * Validates non-ASCII characters according to Citypak regex rule: /[^ \x00-\x7F]+/
   */
  private validateAscii(text: string | null | undefined, fieldName: string): void {
    if (!text) return;
    const nonAsciiRegex = /[^\x00-\x7F]+/;
    if (nonAsciiRegex.test(text)) {
      throw new BadRequestException(
        `The field "${fieldName}" contains non-ASCII characters that Citypak does not accept. Please correct it.`,
      );
    }
  }

  /**
   * Gets shipper return address profile (checks branch-specific Admin config, falls back to Main Warehouse)
   */
  async getShipperProfile(branchId?: string) {
    if (branchId) {
      const branchProfile = await this.prisma.courierShipperProfile.findFirst({
        where: { branchId, courierName: 'Citypak' },
      });
      if (branchProfile) return branchProfile;
    }

    const defaultProfile = await this.prisma.courierShipperProfile.findFirst({
      where: { isDefault: true, courierName: 'Citypak' },
    });
    if (defaultProfile) return defaultProfile;

    return {
      profileId: 'admin-main-warehouse',
      courierName: 'Citypak',
      branchId: null,
      shipperName: 'Vergo',
      addressLine1: 'No 20, Delkanda',
      addressLine2: null,
      addressLine3: null,
      addressLine4City: 'Delkanda',
      contactName: 'Vergo',
      contactNumber1: '0714685499',
      contactNumber2: null,
      isDefault: true,
    };
  }

  /**
   * Updates or creates default Shipper Return Address profile
   */
  async updateShipperProfile(dto: UpdateShipperProfileDto) {
    const existing = await this.prisma.courierShipperProfile.findFirst({
      where: { isDefault: true, courierName: 'Citypak' },
    });

    if (existing) {
      return this.prisma.courierShipperProfile.update({
        where: { profileId: existing.profileId },
        data: {
          shipperName: dto.shipperName,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2 || null,
          addressLine3: dto.addressLine3 || null,
          addressLine4City: dto.addressLine4City,
          contactName: dto.shipperName,
          contactNumber1: dto.contactNumber1,
          contactNumber2: dto.contactNumber2 || null,
        },
      });
    }

    return this.prisma.courierShipperProfile.create({
      data: {
        courierName: 'Citypak',
        shipperName: dto.shipperName,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 || null,
        addressLine3: dto.addressLine3 || null,
        addressLine4City: dto.addressLine4City,
        contactName: dto.shipperName,
        contactNumber1: dto.contactNumber1,
        contactNumber2: dto.contactNumber2 || null,
        isDefault: true,
      },
    });
  }

  /**
   * Submits a real Citypak order shipment
   */
  async createShipment(
    orderId: string,
    employeeProfileId: string,
    dto: CreateCitypakShipmentDto,
  ) {
    // 1. Resolve employee profile
    const employee = await this.prisma.employee.findFirst({
      where: { profileId: employeeProfileId },
    });

    if (!employee) {
      throw new NotFoundException('Employee profile not found.');
    }

    // 2. Load order with relations
    const order = await this.prisma.orders.findUnique({
      where: { orderId },
      include: {
        shippingDetails: true,
        orderItems: {
          include: {
            variant: {
              include: {
                product: true,
                color: true,
                size: true,
              },
            },
          },
        },
        delivery: {
          include: {
            waybills: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    // Check ownership if order is claimed by employee
    if (
      order.employeeId &&
      order.employeeId !== employee.employeeId
    ) {
      throw new UnauthorizedException(
        'You are not authorized to manage another employee’s claimed order.',
      );
    }

    // Verify order status eligibility
    if (!['Claimed', 'Preparing', 'Ready for Pickup'].includes(order.orderStatus)) {
      throw new BadRequestException(
        `Order #${order.orderId} must be in "Preparing" or "Ready for Pickup" status before creating a Citypak shipment. Current status: ${order.orderStatus}`,
      );
    }

    // Duplicate check: If a shipment was already submitted for this order, reuse it gracefully
    if (
      order.delivery &&
      order.delivery.submissionStatus === 'Submitted' &&
      order.delivery.waybills.length > 0
    ) {
      this.logger.log(
        `Reusing existing Citypak shipment for order #${order.orderId}. Tracking number: ${order.delivery.waybillNumber}`,
      );
      return {
        success: true,
        message: 'Citypak shipment already exists.',
        deliveryId: order.delivery.deliveryId,
        orderId,
        citypakOrderId: order.delivery.externalOrderId || order.delivery.courierReference,
        primaryTrackingNumber: order.delivery.waybillNumber,
        waybills: order.delivery.waybills.map((w) => w.trackingNumber),
        codAmount: Number(order.delivery.codAmount || 0),
      };
    }

    const shipping = order.shippingDetails;
    if (!shipping) {
      throw new BadRequestException(
        'Order shipping details are missing. Cannot create shipment.',
      );
    }

    // 3. Resolve COD amount server-side strictly
    let codAmount = 0;
    const isCOD =
      order.paymentMethod.toLowerCase().includes('cash') ||
      order.paymentMethod.toLowerCase().includes('cod');

    if (isCOD) {
      codAmount = Number(order.totalAmount);
      if (codAmount <= 0) {
        throw new BadRequestException(
          'COD order total amount must be greater than zero.',
        );
      }
    } else {
      // Bank Transfer / prepaid: strictly 0
      codAmount = 0;
    }

    // 4. Resolve Shipper profile
    const shipper = await this.getShipperProfile(
      employee.branchId || order.branchId || undefined,
    );

    // 5. Build package description (max 128 chars)
    let description = dto.description?.trim();
    if (!description) {
      const itemSummaries = order.orderItems.map((item) => {
        const prodName = item.variant?.product?.name || 'Garment';
        const sizeName = item.variant?.size?.name || '';
        return `${prodName} ${sizeName}`.trim();
      });
      description = itemSummaries.join(', ');
    }
    if (description.length > 128) {
      description = description.substring(0, 125) + '...';
    }

    // 6. ASCII Validations
    this.validateAscii(shipper.shipperName, 'Shipper Name');
    this.validateAscii(shipper.addressLine1, 'Shipper Address Line 1');
    this.validateAscii(shipper.addressLine4City, 'Shipper City');
    this.validateAscii(shipper.contactName, 'Shipper Contact Name');
    this.validateAscii(shipper.contactNumber1, 'Shipper Phone');
    this.validateAscii(shipping.receiverName, 'Receiver Name');
    this.validateAscii(shipping.addressLine1, 'Receiver Address Line 1');
    this.validateAscii(shipping.addressLine2, 'Receiver Address Line 2');
    this.validateAscii(shipping.city, 'Receiver City');
    this.validateAscii(shipping.phone, 'Receiver Phone');
    this.validateAscii(description, 'Package Description');

    // 7. Stable Reference
    const reference = order.orderId;
    const token = this.getApiToken();
    const baseUrl = this.getBaseUrl();

    // 8. Prepare payload
    const payload = {
      token,
      reference,
      from_name: shipper.shipperName,
      from_address_line_1: shipper.addressLine1,
      from_address_line_2: shipper.addressLine2 || '',
      from_address_line_3: shipper.addressLine3 || '',
      from_address_line_4: shipper.addressLine4City,
      from_contact_name: shipper.contactName,
      from_contact_1: this.cleanPhone(shipper.contactNumber1),
      from_contact_2: shipper.contactNumber2 ? this.cleanPhone(shipper.contactNumber2) : '',
      to_name: shipping.receiverName,
      to_address_line_1: shipping.addressLine1,
      to_address_line_2: shipping.addressLine2 || '',
      to_address_line_3: '',
      to_address_line_4: shipping.city,
      to_contact_name: shipping.receiverName,
      to_contact_1: this.cleanPhone(shipping.phone),
      to_contact_2: '',
      to_nic: '',
      description,
      weight_g: dto.weightGrams,
      cash_on_delivery_amount: codAmount,
      number_of_pieces: dto.numberOfPieces,
    };

    this.logger.log(
      `Submitting Citypak shipment for Order #${orderId}, Weight: ${dto.weightGrams}g, COD: Rs. ${codAmount}`,
    );

    let citypakOrderId: string | null = null;
    let items: Array<{
      tracking_number: string;
      reference?: string;
      delivery_facility_code?: string;
    }> = [];

    try {
      const response = await axios.post(`${baseUrl}/customer_api/v1/orders`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });

      const resData = response.data;
      if (!resData || resData.success === false) {
        const errorMsg = resData?.message || 'Citypak order creation failed.';
        throw new BadRequestException(`Citypak Error: ${errorMsg}`);
      }

      // Parse data response (array or object)
      const dataContent = resData.data;
      if (Array.isArray(dataContent)) {
        // Search for order_id or item array
        for (const element of dataContent) {
          if (typeof element === 'object' && element !== null) {
            if ('order_id' in element) citypakOrderId = String(element.order_id);
            if ('items' in element && Array.isArray(element.items)) {
              items = element.items;
            }
          }
        }
      } else if (typeof dataContent === 'object' && dataContent !== null) {
        if (dataContent.order_id) citypakOrderId = String(dataContent.order_id);
        if (Array.isArray(dataContent.items)) items = dataContent.items;
      }

      if (items.length === 0) {
        throw new BadRequestException(
          'Citypak created the order but returned no tracking items.',
        );
      }
    } catch (err: any) {
      const safeMessage =
        err.response?.data?.message || err.message || 'Network error calling Citypak API';
      this.logger.error(
        `Citypak Create Order request failed for Order #${orderId}: ${safeMessage}`,
      );

      // Record failure attempt locally
      await this.prisma.delivery.upsert({
        where: { orderId },
        update: {
          submissionStatus: 'Failed',
          failureReason: safeMessage,
        },
        create: {
          orderId,
          courierName: 'Citypak',
          submissionStatus: 'Failed',
          failureReason: safeMessage,
        },
      });

      throw new BadRequestException(`Citypak Shipment Creation Failed: ${safeMessage}`);
    }

    const primaryTrackingNumber = items[0]?.tracking_number;

    // 9. Save database transactionally
    const result = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.upsert({
        where: { orderId },
        update: {
          courierName: 'Citypak',
          courierReference: citypakOrderId,
          externalOrderId: citypakOrderId,
          shipmentReference: reference,
          waybillNumber: primaryTrackingNumber,
          submissionStatus: 'Submitted',
          submittedAt: new Date(),
          failureReason: null,
          packageWeightGrams: dto.weightGrams,
          numberOfPieces: dto.numberOfPieces,
          packageDescription: description,
          codAmount: new Prisma.Decimal(codAmount),
          receiverName: shipping.receiverName,
          submittedByEmployeeId: employee.employeeId,
          packageLengthCm: dto.lengthCm ? new Prisma.Decimal(dto.lengthCm) : null,
          packageWidthCm: dto.widthCm ? new Prisma.Decimal(dto.widthCm) : null,
          packageHeightCm: dto.heightCm ? new Prisma.Decimal(dto.heightCm) : null,
        },
        create: {
          orderId,
          courierName: 'Citypak',
          courierReference: citypakOrderId,
          externalOrderId: citypakOrderId,
          shipmentReference: reference,
          waybillNumber: primaryTrackingNumber,
          submissionStatus: 'Submitted',
          submittedAt: new Date(),
          packageWeightGrams: dto.weightGrams,
          numberOfPieces: dto.numberOfPieces,
          packageDescription: description,
          codAmount: new Prisma.Decimal(codAmount),
          receiverName: shipping.receiverName,
          submittedByEmployeeId: employee.employeeId,
          packageLengthCm: dto.lengthCm ? new Prisma.Decimal(dto.lengthCm) : null,
          packageWidthCm: dto.widthCm ? new Prisma.Decimal(dto.widthCm) : null,
          packageHeightCm: dto.heightCm ? new Prisma.Decimal(dto.heightCm) : null,
        },
      });

      // Upsert waybill records
      for (const item of items) {
        if (item.tracking_number) {
          await tx.deliveryWaybill.upsert({
            where: { trackingNumber: item.tracking_number },
            update: {
              deliveryId: delivery.deliveryId,
              reference: item.reference || reference,
              deliveryFacilityCode: item.delivery_facility_code || null,
            },
            create: {
              deliveryId: delivery.deliveryId,
              trackingNumber: item.tracking_number,
              reference: item.reference || reference,
              deliveryFacilityCode: item.delivery_facility_code || null,
            },
          });
        }
      }

      return delivery;
    });

    return {
      success: true,
      message: 'Citypak shipment created successfully.',
      deliveryId: result.deliveryId,
      orderId,
      citypakOrderId,
      primaryTrackingNumber,
      waybills: items.map((i) => i.tracking_number),
      codAmount,
    };
  }

  /**
   * Proxies PDF waybill stream by Citypak Order ID
   */
  async getWaybillPdfByOrderId(
    orderId: string,
    pageSize = '4X6',
    perPageCount = '1',
  ): Promise<Buffer> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
    });

    if (!delivery || (!delivery.externalOrderId && !delivery.courierReference)) {
      throw new NotFoundException(
        `No Citypak shipment order ID found for order #${orderId}. Complete Delivery Prep first.`,
      );
    }

    const citypakOrderId = delivery.externalOrderId || delivery.courierReference;
    const token = this.getApiToken();
    const baseUrl = this.getBaseUrl();

    try {
      const url = `${baseUrl}/customer_api/v1/orders/${citypakOrderId}/waybills?page_size=${pageSize}&per_page_waybill_count=${perPageCount}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      return Buffer.from(response.data);
    } catch (err: any) {
      const safeMessage =
        err.response?.data?.message || err.message || 'Failed to fetch waybill PDF from Citypak';
      this.logger.error(`Waybill PDF fetch failed for Order #${orderId}: ${safeMessage}`);
      throw new BadRequestException(`Could not retrieve waybill PDF: ${safeMessage}`);
    }
  }

  /**
   * Proxies PDF waybill stream by tracking numbers
   */
  async getWaybillPdfByTrackingNumbers(
    trackingNumbers: string[],
    pageSize = '4X6',
    perPageCount = '1',
  ): Promise<Buffer> {
    if (!trackingNumbers || trackingNumbers.length === 0) {
      throw new BadRequestException('At least one tracking number is required.');
    }

    const token = this.getApiToken();
    const baseUrl = this.getBaseUrl();
    const queryParams = trackingNumbers
      .map((tn) => `tracking_numbers[]=${encodeURIComponent(tn)}`)
      .join('&');

    try {
      const url = `${baseUrl}/customer_api/v1/waybills?${queryParams}&page_size=${pageSize}&per_page_waybill_count=${perPageCount}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      return Buffer.from(response.data);
    } catch (err: any) {
      const safeMessage =
        err.response?.data?.message || err.message || 'Failed to fetch waybill PDF from Citypak';
      this.logger.error(`Waybill PDF fetch by tracking numbers failed: ${safeMessage}`);
      throw new BadRequestException(`Could not retrieve waybill PDF: ${safeMessage}`);
    }
  }

  /**
   * Refreshes live tracking history from Citypak API
   */
  async trackShipmentByTrackingNumber(trackingNumber: string) {
    let waybill = await this.prisma.deliveryWaybill.findUnique({
      where: { trackingNumber },
      include: { delivery: { include: { order: true } } },
    });

    let delivery =
      waybill?.delivery ||
      (await this.prisma.delivery.findFirst({
        where: { OR: [{ waybillNumber: trackingNumber }, { orderId: trackingNumber }] },
        include: { order: true },
      }));

    let order: any = delivery?.order;
    if (!order) {
      order = await this.prisma.orders.findUnique({
        where: { orderId: trackingNumber },
        include: { customerDetails: true, shippingDetails: true },
      });
    }

    if (!delivery && !order) {
      throw new NotFoundException(
        `No delivery or order record found for tracking identifier "${trackingNumber}".`,
      );
    }

    const actualTrackingNum = waybill?.trackingNumber || delivery?.waybillNumber || trackingNumber;

    const token = this.getApiToken();
    const baseUrl = this.getBaseUrl();

    try {
      const url = `${baseUrl}/customer_api/v1/track?tracking_number=${encodeURIComponent(
        actualTrackingNum,
      )}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      const resData = response.data;
      if (resData && resData.is_success !== false && resData.data) {
        const data = resData.data;
        const history = data?.tracking_history || [];

        if (delivery) {
          for (const item of history) {
            if (item.date && item.status_type) {
              const [d, m, y] = item.date.split('-');
              const timeStr = item.time || '00:00:00';
              const isoDateStr = `${y}-${m}-${d}T${timeStr}Z`;
              const eventAt = new Date(isoDateStr);

              await this.prisma.deliveryTrackingEvent.upsert({
                where: {
                  trackingNumber_status_eventAt: {
                    trackingNumber: actualTrackingNum,
                    status: item.status_type,
                    eventAt,
                  },
                },
                update: {
                  statusCode: item.status_code || null,
                  description: item.description || null,
                  location: item.location || null,
                },
                create: {
                  deliveryId: delivery.deliveryId,
                  waybillId: waybill?.waybillId || null,
                  trackingNumber: actualTrackingNum,
                  status: item.status_type,
                  statusType: item.status_type,
                  statusCode: item.status_code || null,
                  description: item.description || null,
                  location: item.location || null,
                  eventAt,
                  source: 'TRACKING_API',
                },
              });
            }
          }
        }

        const updatedEvents = delivery
          ? await this.prisma.deliveryTrackingEvent.findMany({
              where: { deliveryId: delivery.deliveryId },
              orderBy: { eventAt: 'asc' },
            })
          : [];

        return {
          success: true,
          trackingNumber: actualTrackingNum,
          isDelivered: Boolean(data.is_delivered),
          courierStatus: data.status || delivery?.courierStatus || 'In Transit',
          receiverName: data.receiver_name,
          podImageUrl: data.pod_image_url,
          history: updatedEvents.length > 0 ? updatedEvents : history,
        };
      }
    } catch (err: any) {
      this.logger.warn(`Citypak remote tracking notice for ${trackingNumber}: ${err.message}`);
    }

    // Fallback: Synthesize timeline history from DB Order timestamps
    const dbStatus = order?.orderStatus || delivery?.deliveryStatus || 'Ready to Process';
    const isFinished = ['Finished', 'Delivered', 'Completed'].includes(dbStatus);
    const isHandedToCourier = isFinished || ['Handed to Citypak Courier', 'Sent'].includes(dbStatus);
    const isReadyForPickup = isHandedToCourier || ['Ready for Courier Pickup', 'Ready for Pickup', 'Ready'].includes(dbStatus);
    const isPrepared = isReadyForPickup || ['Package Prepared', 'Preparing'].includes(dbStatus);

    const history: any[] = [];
    const baseTime = order?.orderDate ? new Date(order.orderDate) : new Date();

    history.push({
      status: 'Order Placed',
      location: 'Store System',
      eventAt: order?.orderDate || baseTime.toISOString(),
      description: 'Order placed and payment confirmed.',
    });

    history.push({
      status: 'Admin Approved',
      location: 'Central Admin',
      eventAt: order?.orderDate || baseTime.toISOString(),
      description: 'Order approved for fulfillment.',
    });

    if (isPrepared) {
      history.push({
        status: 'Package Prepared',
        location: 'Fulfillment Hub',
        eventAt: order?.preparingAt || order?.claimedAt || new Date(baseTime.getTime() + 10 * 60000).toISOString(),
        description: 'Items picked and packed into parcel container.',
      });
    }

    if (isReadyForPickup) {
      history.push({
        status: 'Ready for Courier Pickup',
        location: 'Warehouse Staging',
        eventAt: order?.parcelReadyAt || new Date(baseTime.getTime() + 20 * 60000).toISOString(),
        description: 'Parcel assigned Citypak waybill. Awaiting courier pickup.',
      });
    }

    if (isHandedToCourier) {
      history.push({
        status: 'Handed to Citypak Courier',
        location: 'Citypak Hub',
        eventAt: order?.sentAt || new Date(baseTime.getTime() + 40 * 60000).toISOString(),
        description: 'Parcel collected by Citypak courier driver and in transit.',
      });
    }

    if (isFinished) {
      history.push({
        status: 'Finished',
        location: 'Destination',
        eventAt: order?.deliveredAt || order?.completedAt || new Date(baseTime.getTime() + 60 * 60000).toISOString(),
        description: 'Parcel successfully delivered to customer.',
      });
    }

    return {
      success: true,
      trackingNumber: actualTrackingNum,
      isDelivered: isFinished,
      courierStatus: isFinished ? 'Delivered' : isHandedToCourier ? 'In Transit' : isReadyForPickup ? 'Ready for Courier Pickup' : 'Package Prepared',
      history,
    };
  }

  /**
   * Submits a Pickup Request to Citypak
   */
  async createPickup(employeeProfileId: string, dto: CreateCitypakPickupDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { profileId: employeeProfileId },
    });

    if (!employee) {
      throw new NotFoundException('Employee profile not found.');
    }

    // Load deliveries
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        orderId: { in: dto.orderIds },
      },
      include: { waybills: true },
    });

    // Sum weights and waybill counts
    let totalWeightGrams = 0;
    let totalWaybillCount = 0;

    for (const d of deliveries) {
      totalWeightGrams += d.packageWeightGrams || 500;
      totalWaybillCount += d.waybills.length > 0 ? d.waybills.length : 1;
    }

    // If any selected orders don't have delivery records yet, include default estimate
    const unrecordedCount = dto.orderIds.length - deliveries.length;
    if (unrecordedCount > 0) {
      totalWaybillCount += unrecordedCount;
      totalWeightGrams += unrecordedCount * 500;
    }

    // Format datetimes as DD/MM/YYYY HH:mm
    const formatDateStr = (isoStr: string) => {
      const date = new Date(isoStr);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    };

    const fromFormatted = formatDateStr(dto.pickupFromDatetime);
    const toFormatted = formatDateStr(dto.pickupToDatetime);

    this.validateAscii(dto.pickupAddressLine1, 'Pickup Address Line 1');
    this.validateAscii(dto.pickupAddressLine4City, 'Pickup City');
    this.validateAscii(dto.pickupContactPerson, 'Pickup Contact Person');

    const token = this.getApiToken();
    const baseUrl = this.getBaseUrl();

    const cleanPhone = (phone: string) => {
      let cleaned = (phone || '').replace(/[^\d]/g, '');
      if (cleaned.startsWith('94')) {
        cleaned = '0' + cleaned.slice(2);
      }
      return cleaned;
    };

    const payload = {
      pickup_address_line_1: dto.pickupAddressLine1,
      pickup_address_line_2: dto.pickupAddressLine2 || '',
      pickup_address_line_3: dto.pickupAddressLine3 || '',
      pickup_address_line_4_city: dto.pickupAddressLine4City,
      pickup_contact_person: dto.pickupContactPerson,
      pickup_contact_number_1: cleanPhone(dto.pickupContactNumber1),
      estimated_pickup_weight_grams: Number(totalWeightGrams),
      estimated_waybill_count: Number(totalWaybillCount),
      pickup_from_datetime: fromFormatted,
      pickup_to_datetime: toFormatted,
    };

    let externalPickupId: number | null = null;

    try {
      this.logger.log(`Submitting Citypak Pickup Payload: ${JSON.stringify(payload)}`);

      const response = await axios.post(`${baseUrl}/customer_api/v1/pickups`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const resData = response.data;
      if (!resData || resData.success === false || resData.is_success === false) {
        const errorDetail = resData?.errors ? `: ${JSON.stringify(resData.errors)}` : '';
        const msg = resData?.message || 'Citypak pickup creation failed.';
        this.logger.error(`Citypak Pickup Creation failed: ${msg}${errorDetail}`);
        throw new BadRequestException(`Pickup creation failed: ${msg}${errorDetail}`);
      }

      externalPickupId = resData.data?.pickup_id || null;
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      const responseData = err.response?.data;
      const safeMessage =
        responseData?.message || err.message || 'Error requesting Citypak pickup';
      const detailErrors = responseData?.errors
        ? `: ${JSON.stringify(responseData.errors)}`
        : '';
      this.logger.error(`Citypak Pickup Creation failed: ${safeMessage}${detailErrors}`);
      throw new BadRequestException(`Pickup creation failed: ${safeMessage}${detailErrors}`);
    }

    // Save pickup record locally
    const pickupRecord = await this.prisma.$transaction(async (tx) => {
      const pickup = await tx.courierPickupRequest.create({
        data: {
          courierName: 'Citypak',
          externalPickupId,
          requestedByEmployeeId: employee.employeeId,
          branchId: employee.branchId,
          pickupAddressLine1: dto.pickupAddressLine1,
          pickupAddressLine2: dto.pickupAddressLine2 || null,
          pickupAddressLine3: dto.pickupAddressLine3 || null,
          pickupAddressLine4City: dto.pickupAddressLine4City,
          pickupContactPerson: dto.pickupContactPerson,
          pickupContactNumber1: dto.pickupContactNumber1,
          estimatedPickupWeightGrams: totalWeightGrams,
          estimatedWaybillCount: totalWaybillCount,
          pickupFromDatetime: new Date(dto.pickupFromDatetime),
          pickupToDatetime: new Date(dto.pickupToDatetime),
          status: 'Requested',
        },
      });

      for (const d of deliveries) {
        await tx.courierPickupDelivery.create({
          data: {
            pickupRequestId: pickup.pickupRequestId,
            deliveryId: d.deliveryId,
          },
        });
      }

      return pickup;
    });

    return {
      success: true,
      message: `Pickup requested successfully! Pickup ID: ${externalPickupId}`,
      pickupRequestId: pickupRecord.pickupRequestId,
      externalPickupId,
      estimatedWeightGrams: totalWeightGrams,
      estimatedWaybillCount: totalWaybillCount,
    };
  }

  /**
   * Processes inbound Push API webhooks securely from Citypak
   */
  async processWebhook(headers: Record<string, string>, payload: any) {
    const webhookSecret = this.getWebhookSecret();
    if (webhookSecret) {
      const incomingKey =
        headers['x-vergo-citypak-webhook-key'] ||
        headers['X-Vergo-Citypak-Webhook-Key'] ||
        headers['authorization'] ||
        headers['Authorization'];

      if (!incomingKey || incomingKey.replace(/^Bearer\s+/i, '').trim() !== webhookSecret) {
        this.logger.warn('Unauthorized Citypak webhook attempt rejected.');
        throw new UnauthorizedException('Invalid webhook secret key.');
      }
    }

    const trackingNumber = payload.tracking_number;
    if (!trackingNumber) {
      throw new BadRequestException('Webhook payload missing tracking_number.');
    }

    // Find delivery
    const waybill = await this.prisma.deliveryWaybill.findUnique({
      where: { trackingNumber },
      include: { delivery: { include: { order: true } } },
    });

    const delivery =
      waybill?.delivery ||
      (await this.prisma.delivery.findFirst({
        where: { waybillNumber: trackingNumber },
        include: { order: true },
      }));

    if (!delivery) {
      this.logger.warn(
        `Received Webhook event for unknown tracking number "${trackingNumber}".`,
      );
      return { success: true, message: 'Webhook received for unknown tracking number' };
    }

    const statusStr = payload.status?.trim() || '';
    const statusTypeStr = payload.status_type?.trim() || '';
    const dateStr = payload.action_datetime || payload.delivered_datetime;

    let eventAt = new Date();
    if (dateStr) {
      // Format d-m-Y H:i:s
      const [d, m, yAndTime] = dateStr.split('-');
      if (yAndTime) {
        const [yyyy, timePart] = yAndTime.split(' ');
        eventAt = new Date(`${yyyy}-${m}-${d}T${timePart || '00:00:00'}Z`);
      }
    }

    // Idempotent tracking event storage
    try {
      await this.prisma.deliveryTrackingEvent.upsert({
        where: {
          trackingNumber_status_eventAt: {
            trackingNumber,
            status: statusStr || statusTypeStr,
            eventAt,
          },
        },
        update: {
          reason: payload.reason || null,
        },
        create: {
          deliveryId: delivery.deliveryId,
          waybillId: waybill?.waybillId || null,
          trackingNumber,
          status: statusStr || statusTypeStr,
          statusType: statusTypeStr,
          reason: payload.reason || null,
          eventAt,
          source: 'WEBHOOK',
          externalItemId: payload.item_id || null,
        },
      });
    } catch (dbErr) {
      this.logger.log(`Webhook tracking event duplicate ignored for ${trackingNumber}`);
    }

    const orderId = delivery.orderId;
    const currentOrderStatus = delivery.order.orderStatus;

    // Handle status transitions
    if (statusStr.includes('FIRST MILE RECEIVE SCAN')) {
      // Courier physically collected package -> transition order Ready for Pickup -> Sent
      await this.prisma.delivery.update({
        where: { deliveryId: delivery.deliveryId },
        data: {
          deliveryStatus: 'In Transit',
          courierStatus: 'FIRST MILE RECEIVE SCAN',
          courierStatusType: statusTypeStr,
        },
      });

      if (currentOrderStatus === 'Ready for Pickup') {
        await this.prisma.orders.update({
          where: { orderId },
          data: {
            orderStatus: 'Sent',
            sentAt: delivery.order.sentAt || new Date(),
          },
        });

        // Trigger customer notification
        await this.notificationService.notifyOrderDispatched(orderId, trackingNumber);
      }
    } else if (statusStr.includes('OUT FOR DELIVERY')) {
      await this.prisma.delivery.update({
        where: { deliveryId: delivery.deliveryId },
        data: {
          deliveryStatus: 'In Transit',
          courierStatus: 'OUT FOR DELIVERY',
          courierStatusType: statusTypeStr,
        },
      });

      await this.notificationService.notifyOutForDelivery(orderId, trackingNumber);
    } else if (statusStr.includes('NOT DELIVERED')) {
      await this.prisma.delivery.update({
        where: { deliveryId: delivery.deliveryId },
        data: {
          courierStatus: 'NOT DELIVERED',
          failureReason: payload.reason || 'Unable to contact customer',
        },
      });
    } else if (statusStr.includes('DELIVERED') || statusTypeStr === 'DL') {
      if (statusTypeStr === 'RTM') {
        // Returned To Merchant
        await this.prisma.delivery.update({
          where: { deliveryId: delivery.deliveryId },
          data: {
            deliveryStatus: 'Returned',
            courierStatus: 'Returned To Merchant',
            courierStatusType: 'RTM',
          },
        });

        await this.prisma.orders.update({
          where: { orderId },
          data: { orderStatus: 'Returned' },
        });

        await this.notificationService.notifyOrderReturned(orderId);
      } else {
        // Delivered DL
        await this.prisma.delivery.update({
          where: { deliveryId: delivery.deliveryId },
          data: {
            deliveryStatus: 'Delivered',
            courierStatus: 'DELIVERED',
            courierStatusType: 'DL',
            deliveredAt: delivery.deliveredAt || eventAt,
          },
        });

        await this.prisma.orders.update({
          where: { orderId },
          data: {
            orderStatus: 'Delivered',
            deliveredAt: delivery.order.deliveredAt || eventAt,
          },
        });

        await this.notificationService.notifyOrderDelivered(orderId, trackingNumber);
      }
    }

    return { success: true, message: 'Webhook processed successfully' };
  }

  /**
   * Fetches internal list of submitted pickup requests for employee view
   */
  async listPickupRequests(employeeProfileId: string) {
    return this.prisma.courierPickupRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        deliveries: {
          include: {
            delivery: {
              include: {
                order: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Automatic scheduled cron job: Runs every 15 minutes to poll Citypak status
   */
  @Cron('*/15 * * * *')
  async handleScheduledSync() {
    this.logger.log('Cron Trigger: Starting Citypak active tracking sync...');
    try {
      const res = await this.syncActiveShipments();
      this.logger.log(
        `Cron Trigger Complete: Synced ${res.syncedCount} active shipments. Last sync: ${res.lastSyncAt}`,
      );
    } catch (err: any) {
      this.logger.error(`Scheduled Citypak Sync Error: ${err.message}`);
    }
  }

  /**
   * Performs manual or scheduled sync of active shipments with Citypak API
   */
  async syncActiveShipments() {
    const activeDeliveries = await this.prisma.delivery.findMany({
      where: {
        order: {
          orderStatus: { in: ['Sent', 'Ready for Pickup', 'Preparing'] },
        },
      },
      include: {
        waybills: true,
      },
    });

    let syncedCount = 0;
    const now = new Date();

    for (const del of activeDeliveries) {
      for (const wb of del.waybills) {
        if (wb.trackingNumber) {
          try {
            await this.trackShipmentByTrackingNumber(wb.trackingNumber);
            syncedCount++;
          } catch (err: any) {
            this.logger.warn(
              `Failed tracking sync for #${wb.trackingNumber}: ${err.message}`,
            );
          }
        }
      }

      await this.prisma.delivery.update({
        where: { deliveryId: del.deliveryId },
        data: { lastTrackingSyncAt: now },
      });
    }

    return {
      success: true,
      syncedCount,
      lastSyncAt: now.toISOString(),
    };
  }

  /**
   * Returns the most recent tracking sync timestamp across all deliveries
   */
  async getLastSyncTimestamp() {
    const latest = await this.prisma.delivery.findFirst({
      where: { lastTrackingSyncAt: { not: null } },
      orderBy: { lastTrackingSyncAt: 'desc' },
      select: { lastTrackingSyncAt: true },
    });

    return {
      lastSyncAt: latest?.lastTrackingSyncAt
        ? latest.lastTrackingSyncAt.toISOString()
        : null,
    };
  }

  private cleanPhone(phone: string): string {
    let cleaned = (phone || '').replace(/[^\d]/g, '');
    if (cleaned.startsWith('94')) {
      cleaned = '0' + cleaned.slice(2);
    }
    return cleaned;
  }
}
