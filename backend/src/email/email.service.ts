import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  EmailContent,
  paymentExpiredEmail,
  paymentRejectedEmail,
} from './email.templates';

/**
 * Reusable transactional email service.
 *
 * Sends through SMTP when the SMTP_* environment variables are configured
 * (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM). When SMTP is not
 * configured (e.g. local development) the rendered email is logged instead of
 * sent, so the surrounding business flow never fails because of email setup.
 *
 * Email failures are logged but never thrown: a failed email must not roll
 * back an order/payment state change that has already been saved.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    this.from =
      this.configService.get<string>('EMAIL_FROM') ??
      'Vergo Wear <no-reply@vergowear.com>';
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    } else {
      this.logger.warn(
        'SMTP_HOST is not configured — emails will be logged instead of sent.',
      );
    }
  }

  /** Sends (or logs, when SMTP is unconfigured) a rendered email. */
  async send(to: string, content: EmailContent): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(
        `[email skipped - SMTP not configured] to=${to} subject="${content.subject}"`,
      );
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
      this.logger.log(`Email sent to ${to}: "${content.subject}"`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      return false;
    }
  }

  async sendPaymentRejectedEmail(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    reason?: string | null;
  }): Promise<boolean> {
    return this.send(params.to, paymentRejectedEmail(params));
  }

  async sendPaymentExpiredEmail(params: {
    to: string;
    customerName: string;
    orderNumber: string;
  }): Promise<boolean> {
    return this.send(params.to, paymentExpiredEmail(params));
  }
}
