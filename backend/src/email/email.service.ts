import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import {
  EmailContent,
  paymentExpiredEmail,
  paymentRejectedEmail,
  employeeWelcomeEmail,
} from './email.templates';

export interface SendTemplateOptions {
  to: string;
  template: string;
  variables: Record<string, string | number>;
  from?: string;
  idempotencyKey?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

/**
 * Reusable transactional email service.
 *
 * Supports both official Resend API templates and legacy Nodemailer SMTP fallback.
 * Email failures are logged but never thrown: a failed email must not roll
 * back an order/payment state change that has already been saved.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly from: string;
  private readonly resend: Resend | null = null;
  private readonly resendCustomerFrom: string;
  private readonly resendAdminFrom: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      process.env.EMAIL_FROM ||
      '';

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(
          this.configService.get<string>('SMTP_PORT') ||
          process.env.SMTP_PORT ||
          587,
        ),
        secure:
          (this.configService.get<string>('SMTP_SECURE') ||
            process.env.SMTP_SECURE) === 'true',
        auth: {
          user:
            this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER,
          pass:
            this.configService.get<string>('SMTP_PASS') || process.env.SMTP_PASS,
        },
      });
    } else {
      this.logger.warn(
        'SMTP_HOST is not configured — legacy SMTP emails will be logged instead of sent.',
      );
    }

    const resendApiKey =
      this.configService.get<string>('RESEND_API_KEY') || process.env.RESEND_API_KEY;
    this.resendCustomerFrom =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      process.env.RESEND_FROM_EMAIL ||
      '';
    this.resendAdminFrom =
      this.configService.get<string>('RESEND_ADMIN_FROM_EMAIL') ||
      process.env.RESEND_ADMIN_FROM_EMAIL ||
      '';

    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not configured — transactional template emails will be logged instead of sent.',
      );
    }
  }

  /**
   * Sends a published Resend email template using the official Resend SDK.
   * Handles Resend API errors, network failures, quota limits, and idempotency.
   */
  async sendTemplate(options: SendTemplateOptions): Promise<boolean> {
    const { to, template, variables, from, idempotencyKey, attachments } = options;

    if (!this.resend) {
      this.logger.log(
        `[email skipped - RESEND_API_KEY not configured] to=${to} template="${template}"`,
      );
      return false;
    }

    if (!to || !template) {
      this.logger.warn(
        `sendTemplate aborted: missing recipient (${to}) or template alias (${template})`,
      );
      return false;
    }

    const sender = from || this.resendCustomerFrom;

    // Resend template variables must strictly be strings in the payload
    const sanitizedVariables: Record<string, string> = {};
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        sanitizedVariables[key] = value !== null && value !== undefined ? String(value) : '';
      }
    }

    try {
      const response = await this.resend.emails.send(
        {
          from: sender,
          to,
          template: {
            id: template,
            variables: sanitizedVariables,
          },
          ...(attachments && attachments.length > 0 ? { attachments } : {}),
        },
        idempotencyKey ? { idempotencyKey } : undefined,
      );

      if (response.error) {
        this.logger.error(
          `Resend API error sending template "${template}" to ${to}: [${response.error.name}] ${response.error.message}`,
        );
        return false;
      }

      this.logger.log(
        `Resend email sent successfully to ${to} with template "${template}". Email ID: ${response.data?.id}`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `Network or service error sending Resend template "${template}" to ${to}: ${error?.message || error}`,
      );
      return false;
    }
  }

  /**
   * Template: new-order-notification
   * Recipient: Administrator
   */
  async sendNewOrderAdminEmail(params: {
    to: string;
    variables: Record<string, string | number>;
    idempotencyKey?: string;
  }): Promise<boolean> {
    const template =
      this.configService.get<string>('RESEND_TEMPLATE_NEW_ORDER') ||
      process.env.RESEND_TEMPLATE_NEW_ORDER ||
      '';

    return this.sendTemplate({
      to: params.to,
      template,
      from: this.resendAdminFrom,
      variables: params.variables,
      idempotencyKey: params.idempotencyKey,
    });
  }

  /**
   * Template: Order Received, Waiting for Admin Approval
   * Recipient: Customer
   */
  async sendOrderReceivedEmail(params: {
    to: string;
    customerName: string;
    orderReference: string;
    idempotencyKey?: string;
    invoicePdfBuffer?: Buffer;
    attachmentBuffer?: Buffer;
    attachmentFilename?: string;
    variables?: Record<string, string | number>;
  }): Promise<boolean> {
    const template =
      this.configService.get<string>('RESEND_TEMPLATE_ORDER_RECEIVED') ||
      process.env.RESEND_TEMPLATE_ORDER_RECEIVED ||
      '';

    const cleanRef = params.orderReference.replace(/^#/, '');
    const buffer = params.attachmentBuffer || params.invoicePdfBuffer;
    const filename =
      params.attachmentFilename || `order-${cleanRef}.pdf`;

    const attachments = buffer
      ? [
        {
          filename,
          content: buffer,
        },
      ]
      : undefined;

    return this.sendTemplate({
      to: params.to,
      template,
      from: this.resendCustomerFrom,
      variables: {
        CUSTOMER_NAME: params.customerName,
        ORDER_REFERENCE: params.orderReference,
        ...(params.variables || {}),
      },
      idempotencyKey: params.idempotencyKey,
      attachments,
    });
  }

  /**
   * Template: order-approved
   * Recipient: Customer
   */
  async sendOrderApprovedEmail(params: {
    to: string;
    customerName: string;
    orderReference: string;
    variables?: Record<string, string | number>;
    idempotencyKey?: string;
  }): Promise<boolean> {
    const template =
      this.configService.get<string>('RESEND_TEMPLATE_ORDER_APPROVED') ||
      process.env.RESEND_TEMPLATE_ORDER_APPROVED ||
      '';

    return this.sendTemplate({
      to: params.to,
      template,
      from: this.resendCustomerFrom,
      variables: {
        CUSTOMER_NAME: params.customerName,
        ORDER_REFERENCE: params.orderReference,
        order_reference: params.orderReference,
        customer_name: params.customerName,
        ...(params.variables || {}),
      },
      idempotencyKey: params.idempotencyKey,
    });
  }

  /**
   * Template: order-rejection
   * Recipient: Customer
   */
  async sendOrderRejectedEmail(params: {
    to: string;
    customerName: string;
    orderReference: string;
    variables?: Record<string, string | number>;
    idempotencyKey?: string;
  }): Promise<boolean> {
    const template =
      this.configService.get<string>('RESEND_TEMPLATE_ORDER_REJECTED') ||
      process.env.RESEND_TEMPLATE_ORDER_REJECTED ||
      '';

    return this.sendTemplate({
      to: params.to,
      template,
      from: this.resendCustomerFrom,
      variables: {
        CUSTOMER_NAME: params.customerName,
        ORDER_REFERENCE: params.orderReference,
        order_reference: params.orderReference,
        customer_name: params.customerName,
        ...(params.variables || {}),
      },
      idempotencyKey: params.idempotencyKey,
    });
  }

  /**
   * Template: delivery-notification
   * Recipient: Customer
   */
  async sendDeliveryNotificationEmail(params: {
    to: string;
    customerName: string;
    orderReference: string;
    idempotencyKey?: string;
  }): Promise<boolean> {
    const template =
      this.configService.get<string>('RESEND_TEMPLATE_DELIVERY') ||
      process.env.RESEND_TEMPLATE_DELIVERY ||
      '';

    return this.sendTemplate({
      to: params.to,
      template,
      from: this.resendCustomerFrom,
      variables: {
        CUSTOMER_NAME: params.customerName,
        ORDER_REFERENCE: params.orderReference,
      },
      idempotencyKey: params.idempotencyKey,
    });
  }

  /**
   * Template: employee-account-creation
   * Recipient: Newly created employee
   */
  async sendEmployeeAccountCreatedEmail(params: {
    to: string;
    employeeName: string;
    email: string;
    temporaryPassword: string;
    branchName: string;
    idempotencyKey?: string;
  }): Promise<boolean> {
    const template =
      this.configService.get<string>('RESEND_TEMPLATE_EMPLOYEE') ||
      process.env.RESEND_TEMPLATE_EMPLOYEE ||
      '';

    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      ''
    ).replace(/\/$/, '');
    const loginUrl = frontendUrl ? `${frontendUrl}/auth/login` : 'https://www.vergo.lk/auth/login';

    const sent = await this.sendTemplate({
      to: params.to,
      template,
      from: this.resendAdminFrom,
      variables: {
        EMPLOYEE_NAME: params.employeeName,
        employee_name: params.employeeName,
        EMPLOYEE_EMAIL: params.email,
        employee_email: params.email,
        TEMPORARY_PASSWORD: params.temporaryPassword,
        temporary_password: params.temporaryPassword,
        BRANCH_NAME: params.branchName,
        branch_name: params.branchName,
        LOGIN_URL: loginUrl,
        login_url: loginUrl,
      },
      idempotencyKey: params.idempotencyKey,
    });

    if (!sent) {
      this.logger.log(
        `Resend employee welcome template unavailable or failed; falling back to SMTP welcome email.`,
      );
      return this.send(
        params.to,
        employeeWelcomeEmail({
          employeeName: params.employeeName,
          email: params.email,
          tempPassword: params.temporaryPassword,
          branchName: params.branchName,
        }),
      );
    }

    return true;
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

  async sendEmployeeWelcomeEmail(params: {
    to: string;
    employeeName: string;
    email: string;
    tempPassword: string;
    branchName: string;
  }): Promise<boolean> {
    return this.sendEmployeeAccountCreatedEmail({
      to: params.to,
      employeeName: params.employeeName,
      email: params.email,
      temporaryPassword: params.tempPassword,
      branchName: params.branchName,
    });
  }

  /**
   * Template: stock-request
   * Recipient: Administrator
   */
  async sendStockRequestAdminEmail(params: {
    to: string;
    variables: Record<string, string | number>;
    idempotencyKey?: string;
  }): Promise<boolean> {
    const template =
      this.configService.get<string>('RESEND_TEMPLATE_STOCK_REQUEST') ||
      process.env.RESEND_TEMPLATE_STOCK_REQUEST ||
      'stock-request';

    return this.sendTemplate({
      to: params.to,
      template,
      from: this.resendAdminFrom,
      variables: params.variables,
      idempotencyKey: params.idempotencyKey,
    });
  }

  /**
   * Template: stock-distribution
   * Recipient: Employee
   */
  async sendStockDistributionEmail(params: {
    to: string;
    variables: Record<string, string | number>;
    idempotencyKey?: string;
  }): Promise<boolean> {
    const template =
      this.configService.get<string>('RESEND_TEMPLATE_STOCK_DISTRIBUTION') ||
      process.env.RESEND_TEMPLATE_STOCK_DISTRIBUTION ||
      'stock-distribution';

    return this.sendTemplate({
      to: params.to,
      template,
      from: this.resendAdminFrom,
      variables: params.variables,
      idempotencyKey: params.idempotencyKey,
    });
  }
}
