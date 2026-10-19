import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { CitypakService } from './citypak.service';

@Controller('integrations/citypak/webhook')
export class CitypakWebhookController {
  constructor(private readonly citypakService: CitypakService) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() payload: any,
  ) {
    return this.citypakService.processWebhook(headers, payload);
  }
}
