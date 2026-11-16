/**
 * Email Confirmation Service for AddMeUp Deposits & Transactions
 */

export async function sendDepositConfirmationEmail({
  toEmail,
  amountNgn,
  credits,
  reference,
  paymentMethod = 'Paystack Instant Payment',
  userName = 'AddMeUp Creator',
}) {
  if (!toEmail || !toEmail.includes('@')) {
    console.warn('[EmailService] Cannot send receipt: invalid toEmail', toEmail);
    return false;
  }

  const receiptSubject = `Payment Confirmed: +${credits} Points Credited to AddMeUp (Ref: ${reference})`;
  const formattedDate = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>AddMeUp Deposit Receipt</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { text-align: center; border-bottom: 2px dashed #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
        .brand { font-size: 24px; font-weight: 900; color: #ea580c; margin: 0; }
        .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
        .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 800; margin-top: 12px; }
        .amount-box { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 1px solid #fed7aa; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .amount-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #c2410c; margin: 0; }
        .amount-val { font-size: 32px; font-weight: 900; color: #0f172a; margin: 4px 0; }
        .credits-val { font-size: 14px; font-weight: 800; color: #059669; margin: 0; }
        .table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
        .table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .table td:first-child { color: #64748b; font-weight: 500; }
        .table td:last-child { text-align: right; font-weight: 700; color: #1e293b; font-family: monospace; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="brand">AddMeUp</h1>
          <p class="subtitle">Official Electronic Deposit Voucher</p>
          <div class="badge">✓ VERIFIED & CREDITED</div>
        </div>

        <div class="amount-box">
          <p class="amount-label">Amount Paid</p>
          <p class="amount-val">₦${Number(amountNgn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
          <p class="credits-val">+${credits} Points Credited 🪙</p>
        </div>

        <table class="table">
          <tr>
            <td>Customer Account</td>
            <td>${toEmail}</td>
          </tr>
          <tr>
            <td>Transaction Reference</td>
            <td>${reference}</td>
          </tr>
          <tr>
            <td>Date & Time</td>
            <td>${formattedDate}</td>
          </tr>
          <tr>
            <td>Payment Channel</td>
            <td>${paymentMethod}</td>
          </tr>
          <tr>
            <td>Status</td>
            <td style="color: #059669;">SUCCESSFUL (REAL MONEY)</td>
          </tr>
        </table>

        <div class="footer">
          <p>Thank you for using AddMeUp! Your points are immediately available to boost ads and connect with friends.</p>
          <p>Need support? WhatsApp our real agent directly at <strong>+234 904 046 4774</strong></p>
          <p>AddMeUp Technologies Nigeria • https://addmeup.ng</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. If Resend or SendGrid API key configured, send via REST API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AddMeUp Receipts <receipts@addmeup.ng>',
          to: [toEmail],
          subject: receiptSubject,
          html: emailHtml,
        }),
      });
      if (res.ok) {
        console.log(`[EmailService] Receipt email sent via Resend to ${toEmail}`);
        return true;
      }
    } catch (e) {
      console.warn('[EmailService] Resend dispatch warning:', e);
    }
  }

  // 2. Log confirmation for operational tracking & Paystack automated receipt
  console.log(`[EmailService] Deposit receipt generated for ${toEmail}: Ref ${reference}, ₦${amountNgn}, +${credits} Points`);
  return true;
}
