import {
  Controller,
  Post,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    return {
      success: true,
      message: "Order created successfully",
      order,
    };
  }

  @Post(":id/payment-proof")
  @UseInterceptors(FileInterceptor("file"))
  async uploadPaymentProof(
    @Param("id", new ParseUUIDPipe({ version: "4" }))
    orderId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: "Proof upload size must be under 5MB.",
          }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|webp|pdf)$/i,
          }),
        ],
      })
    )
    file: any,
  ) {
    if (!file) {
      throw new BadRequestException("No payment proof receipt file uploaded.");
    }

    const order = await this.ordersService.uploadPaymentProof(orderId, file.originalname);

    return {
      success: true,
      message: "Payment proof uploaded successfully.",
      order,
    };
  }
}
