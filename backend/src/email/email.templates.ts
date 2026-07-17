/** Rendered email content ready to hand to the mail transport. */
export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const wrapHtml = (title: string, bodyHtml: string) => `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
    <div style="background: #111; color: #fff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 20px; letter-spacing: 2px;">VERGO WEAR</h1>
    </div>
    <div style="padding: 24px; border: 1px solid #e5e5e5; border-top: none;">
      <h2 style="margin-top: 0; font-size: 18px;">${title}</h2>
      ${bodyHtml}
      <p style="color: #666; font-size: 12px; margin-top: 32px;">
        This is an automated message from Vergo Wear. Please do not reply to this email.
      </p>
    </div>
  </div>
`;

export function paymentRejectedEmail(params: {
  customerName: string;
  orderNumber: string;
  reason?: string | null;
}): EmailContent {
  const { customerName, orderNumber, reason } = params;
  return {
    subject: `Payment Rejected - Order ${orderNumber}`,
    text: [
      `Hi ${customerName},`,
      '',
      `Your bank transfer payment for Order ${orderNumber} has been rejected.`,
      ...(reason ? [`Reason: ${reason}`] : []),
      '',
      'Please sign in to your account and upload a new payment receipt so we can continue processing your order.',
      '',
      'Thank you,',
      'Vergo Wear',
    ].join('\n'),
    html: wrapHtml(
      `Payment Rejected - Order ${orderNumber}`,
      `
      <p>Hi ${customerName},</p>
      <p>Your bank transfer payment for <strong>Order ${orderNumber}</strong> has been <strong>rejected</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please sign in to your account and upload a new payment receipt so we can continue processing your order.</p>
      `,
    ),
  };
}

export function paymentExpiredEmail(params: {
  customerName: string;
  orderNumber: string;
}): EmailContent {
  const { customerName, orderNumber } = params;
  return {
    subject: `Payment Expired - Order ${orderNumber}`,
    text: [
      `Hi ${customerName},`,
      '',
      `Your payment proof for Order ${orderNumber} has expired.`,
      '',
      'To keep your order active, please sign in to your account and upload a new payment receipt. If you no longer wish to proceed, no further action is needed.',
      '',
      'Thank you,',
      'Vergo Wear',
    ].join('\n'),
    html: wrapHtml(
      `Payment Expired - Order ${orderNumber}`,
      `
      <p>Hi ${customerName},</p>
      <p>Your payment proof for <strong>Order ${orderNumber}</strong> has <strong>expired</strong>.</p>
      <p>To keep your order active, please sign in to your account and upload a new payment receipt. If you no longer wish to proceed, no further action is needed.</p>
      `,
    ),
  };
}
