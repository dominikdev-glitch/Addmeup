/**
 * Transactional Email Service via Resend for AddMeUp (verified domain: addmeup.ng)
 * Handles Signup Welcome, Deposit Receipts, Withdrawal Notifications,
 * Password Reset Links, and Password Change Security Alerts.
 */

const DEFAULT_FROM_GENERAL = process.env.RESEND_FROM_EMAIL || 'AddMeUp <noreply@addmeup.ng>';
const DEFAULT_FROM_RECEIPTS = process.env.RESEND_FROM_RECEIPTS || 'AddMeUp Receipts <receipts@addmeup.ng>';
const DEFAULT_FROM_SECURITY = process.env.RESEND_FROM_SECURITY || 'AddMeUp Security <security@addmeup.ng>';
const DEFAULT_REPLY_TO = process.env.RESEND_REPLY_TO || 'heisgag1@gmail.com';

// Simple bounded in-memory deduplication caches so retries don't double-send
const sentDepositRefs = new Set();
const sentWelcomeEmails = new Set();
const sentWithdrawalRefs = new Set();

function rememberKey(set, key, max = 500) {
  if (!key) return;
  if (set.size >= max) {
    const first = set.values().next().value;
    if (first) set.delete(first);
  }
  set.add(key);
}

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapEmailLayout({ title, subtitle, badgeText, badgeBg = '#ecfdf5', badgeColor = '#047857', badgeBorder = '#a7f3d0', bodyHtml }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#fffaf0;margin:0;padding:24px 12px;color:#1e293b;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #fed7aa;padding:32px 24px;box-shadow:0 4px 16px rgba(15,23,42,0.06);">
    <div style="text-align:center;border-bottom:2px dashed #f1f5f9;padding-bottom:20px;margin-bottom:24px;">
      <div style="font-size:24px;font-weight:900;color:#ea580c;letter-spacing:-0.5px;margin:0;">AddMeUp</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;font-weight:600;">${escapeHtml(subtitle)}</div>
      ${badgeText ? `<div style="display:inline-block;background:${badgeBg};color:${badgeColor};border:1px solid ${badgeBorder};padding:6px 14px;border-radius:999px;font-size:11px;font-weight:800;margin-top:12px;">${escapeHtml(badgeText)}</div>` : ''}
    </div>

    ${bodyHtml}

    <div style="text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:20px;margin-top:24px;line-height:1.6;">
      <p style="margin:0 0 6px;">Need help? Chat directly with our support agent on WhatsApp: <strong style="color:#475569;">+234 904 046 4774</strong></p>
      <p style="margin:0;">AddMeUp Technologies Nigeria &bull; <a href="https://addmeup.ng" style="color:#ea580c;text-decoration:none;font-weight:700;">https://addmeup.ng</a></p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Core Resend REST API sender
 */
export async function sendResendEmail({
  from = DEFAULT_FROM_GENERAL,
  to,
  subject,
  html,
  replyTo = DEFAULT_REPLY_TO,
}) {
  if (!to || !String(to).includes('@')) {
    return { sent: false, reason: 'Invalid recipient email' };
  }

  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!resendApiKey) {
    console.log(`[EmailService] RESEND_API_KEY not configured — skipped sending "${subject}" to ${to}`);
    return { sent: false, reason: 'RESEND_API_KEY not configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [String(to).trim()],
        reply_to: replyTo,
        subject,
        html,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`[EmailService] Sent "${subject}" via Resend to ${to} (id: ${payload.id || 'ok'})`);
      return { sent: true, id: payload.id };
    }

    console.warn(`[EmailService] Resend rejected "${subject}" to ${to}:`, res.status, payload);
    return { sent: false, reason: payload?.message || `HTTP ${res.status}` };
  } catch (err) {
    console.warn(`[EmailService] Resend request error for "${subject}":`, err.message);
    return { sent: false, reason: err.message };
  }
}

/**
 * 1. Welcome Email on Signup (Native Google or Email/Password)
 */
export async function sendWelcomeEmail({
  toEmail,
  userName = 'Friend',
  referralCode = '',
}) {
  const cleanEmail = String(toEmail || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) return { sent: false, reason: 'Invalid email' };
  if (sentWelcomeEmails.has(cleanEmail)) return { sent: true, deduplicated: true };

  const safeName = escapeHtml(userName || cleanEmail.split('@')[0] || 'Friend');
  const safeRef = escapeHtml(referralCode);

  const html = wrapEmailLayout({
    title: 'Welcome to AddMeUp!',
    subtitle: 'Your Social Growth Wallet is Ready',
    badgeText: '+20 FREE WELCOME POINTS CREDITED',
    bodyHtml: `
      <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Hi <strong>${safeName}</strong>,</p>
      <p style="font-size:13px;line-height:1.6;color:#475569;margin:0 0 20px;">
        Welcome to <strong>AddMeUp</strong>! Your account is active and we have credited your wallet with <strong>+20 Free Points</strong> to help you get started right away.
      </p>

      <div style="background:linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%);border:1px solid #fed7aa;border-radius:16px;padding:18px;text-align:center;margin-bottom:20px;">
        <div style="font-size:11px;text-transform:uppercase;font-weight:800;color:#c2410c;">Starting Wallet Balance</div>
        <div style="font-size:28px;font-weight:900;color:#0f172a;margin:4px 0;">+20 Points</div>
        <div style="font-size:12px;color:#047857;font-weight:700;">Earn +5 points per verified add on Snapchat &amp; WhatsApp</div>
      </div>

      ${safeRef ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:20px;font-size:12px;color:#334155;">
        <strong>Your Invite Code:</strong> <span style="font-family:monospace;font-weight:800;color:#ea580c;">${safeRef}</span><br/>
        <span style="color:#64748b;">Share your link in the Wallet tab to earn <strong>+10 bonus points</strong> for each friend who joins.</span>
      </div>` : ''}

      <div style="text-align:center;margin:24px 0 8px;">
        <a href="https://addmeup.ng" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:12px 28px;border-radius:12px;">Open AddMeUp Feed</a>
      </div>
    `,
  });

  const result = await sendResendEmail({
    from: DEFAULT_FROM_GENERAL,
    to: cleanEmail,
    subject: 'Welcome to AddMeUp! Here are your +20 Free Points',
    html,
  });

  if (result.sent) {
    rememberKey(sentWelcomeEmails, cleanEmail);
  }
  return result;
}

/**
 * 2. Official Deposit Confirmation Receipt Email
 */
export async function sendDepositConfirmationEmail({
  toEmail,
  amountNgn,
  credits,
  reference,
  paymentMethod = 'Paystack Instant Payment',
  userName = 'AddMeUp Creator',
}) {
  if (!toEmail || !String(toEmail).includes('@')) {
    console.warn('[EmailService] Cannot send receipt: invalid toEmail', toEmail);
    return { sent: false, reason: 'Invalid email' };
  }

  if (reference && sentDepositRefs.has(reference)) {
    return { sent: true, deduplicated: true };
  }

  const receiptSubject = `Payment Confirmed: +${credits} Points Credited to AddMeUp (Ref: ${reference})`;
  const formattedDate = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = wrapEmailLayout({
    title: 'AddMeUp Deposit Receipt',
    subtitle: 'Official Electronic Deposit Voucher',
    badgeText: 'VERIFIED & CREDITED',
    bodyHtml: `
      <div style="background:linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%);border:1px solid #fed7aa;border-radius:16px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="font-size:11px;text-transform:uppercase;font-weight:800;color:#c2410c;margin:0;">Amount Paid</p>
        <p style="font-size:32px;font-weight:900;color:#0f172a;margin:4px 0;">₦${Number(amountNgn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
        <p style="font-size:14px;font-weight:800;color:#059669;margin:0;">+${Number(credits || 0)} Points Credited</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Account</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e293b;">${escapeHtml(userName)} (${escapeHtml(toEmail)})</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Transaction Reference</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e293b;font-family:monospace;">${escapeHtml(reference)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Date &amp; Time</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e293b;">${escapeHtml(formattedDate)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Payment Channel</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e293b;">${escapeHtml(paymentMethod)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Status</td>
          <td style="padding:10px 0;text-align:right;font-weight:800;color:#059669;">SUCCESSFUL</td>
        </tr>
      </table>
    `,
  });

  const result = await sendResendEmail({
    from: DEFAULT_FROM_RECEIPTS,
    to: toEmail,
    subject: receiptSubject,
    html,
  });

  if (result.sent && reference) {
    rememberKey(sentDepositRefs, reference);
  }
  return result;
}

/**
 * 3. Withdrawal / Payout Notification Email
 */
export async function sendWithdrawalConfirmationEmail({
  toEmail,
  userName = 'Creator',
  amountNgn,
  pointsDeducted,
  bankName = 'Bank Account',
  accountNumberMasked = '****',
  reference,
  status = 'requested', // 'requested' | 'approved' | 'paid' | 'rejected'
}) {
  if (!toEmail || !String(toEmail).includes('@')) {
    return { sent: false, reason: 'Invalid email' };
  }

  const dedupeKey = reference ? `${reference}_${status}` : null;
  if (dedupeKey && sentWithdrawalRefs.has(dedupeKey)) {
    return { sent: true, deduplicated: true };
  }

  const statusMeta = {
    requested: { label: 'WITHDRAWAL REQUEST RECEIVED', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', title: 'Withdrawal Request Submitted' },
    approved: { label: 'PAYOUT APPROVED', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', title: 'Withdrawal Approved & Processing' },
    paid: { label: 'PAYOUT COMPLETED', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', title: 'Withdrawal Sent to Your Bank' },
    rejected: { label: 'WITHDRAWAL RETURNED', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', title: 'Withdrawal Request Declined' },
  }[status] || { label: 'WITHDRAWAL UPDATE', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', title: 'Withdrawal Status Update' };

  const html = wrapEmailLayout({
    title: statusMeta.title,
    subtitle: 'Wallet Withdrawal & Payout Notice',
    badgeText: statusMeta.label,
    badgeBg: statusMeta.bg,
    badgeColor: statusMeta.color,
    badgeBorder: statusMeta.border,
    bodyHtml: `
      <p style="font-size:13px;line-height:1.6;color:#475569;margin:0 0 18px;">Hi <strong>${escapeHtml(userName)}</strong>, here is an update on your AddMeUp payout:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px;text-align:center;margin-bottom:20px;">
        <div style="font-size:11px;text-transform:uppercase;font-weight:800;color:#64748b;">Payout Amount</div>
        <div style="font-size:30px;font-weight:900;color:#0f172a;margin:4px 0;">₦${Number(amountNgn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
        ${pointsDeducted ? `<div style="font-size:12px;color:#475569;font-weight:700;">${Number(pointsDeducted)} Points Converted</div>` : ''}
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Destination Bank</td>
          <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;">${escapeHtml(bankName)} (${escapeHtml(accountNumberMasked)})</td>
        </tr>
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Reference</td>
          <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;font-family:monospace;">${escapeHtml(reference || 'N/A')}</td>
        </tr>
        <tr>
          <td style="padding:9px 0;color:#64748b;">Status</td>
          <td style="padding:9px 0;text-align:right;font-weight:800;color:${statusMeta.color};text-transform:uppercase;">${escapeHtml(status)}</td>
        </tr>
      </table>
    `,
  });

  const result = await sendResendEmail({
    from: DEFAULT_FROM_RECEIPTS,
    to: toEmail,
    subject: `${statusMeta.title} — ₦${Number(amountNgn || 0).toLocaleString('en-NG')} (Ref: ${reference || 'AddMeUp'})`,
    html,
  });

  if (result.sent && dedupeKey) {
    rememberKey(sentWithdrawalRefs, dedupeKey);
  }
  return result;
}

/**
 * 4A. Branded Password Reset Link Email (via Resend from security@addmeup.ng)
 */
export async function sendPasswordResetResendEmail({
  toEmail,
  resetLink,
  userName = 'Friend',
}) {
  if (!toEmail || !resetLink) {
    return { sent: false, reason: 'Missing email or resetLink' };
  }

  const html = wrapEmailLayout({
    title: 'Reset Your AddMeUp Password',
    subtitle: 'Account Security Request',
    badgeText: 'PASSWORD RESET LINK',
    badgeBg: '#fff7ed',
    badgeColor: '#c2410c',
    badgeBorder: '#fed7aa',
    bodyHtml: `
      <p style="font-size:14px;line-height:1.6;margin:0 0 14px;">Hi <strong>${escapeHtml(userName)}</strong>,</p>
      <p style="font-size:13px;line-height:1.6;color:#475569;margin:0 0 20px;">
        We received a request to reset or set the password for your AddMeUp account (<strong>${escapeHtml(toEmail)}</strong>). Click the secure button below to choose a new password:
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:13px 28px;border-radius:12px;">Reset Password Now</a>
      </div>

      <p style="font-size:11px;line-height:1.6;color:#64748b;margin:16px 0 0;">
        If you did not request this, you can safely ignore this email—your account remains secure. This link expires automatically after use.
      </p>
    `,
  });

  return await sendResendEmail({
    from: DEFAULT_FROM_SECURITY,
    to: toEmail,
    subject: 'Reset your AddMeUp password',
    html,
  });
}

/**
 * 4B. Password Changed Security Confirmation Email
 */
export async function sendPasswordChangedEmail({
  toEmail,
  userName = 'Friend',
}) {
  if (!toEmail || !String(toEmail).includes('@')) {
    return { sent: false, reason: 'Invalid email' };
  }

  const changedAt = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = wrapEmailLayout({
    title: 'Your AddMeUp Password Was Changed',
    subtitle: 'Account Security Alert',
    badgeText: 'PASSWORD UPDATED',
    badgeBg: '#ecfdf5',
    badgeColor: '#047857',
    badgeBorder: '#a7f3d0',
    bodyHtml: `
      <p style="font-size:14px;line-height:1.6;margin:0 0 14px;">Hi <strong>${escapeHtml(userName)}</strong>,</p>
      <p style="font-size:13px;line-height:1.6;color:#475569;margin:0 0 16px;">
        This is a security confirmation that the password for your AddMeUp account (<strong>${escapeHtml(toEmail)}</strong>) was successfully updated on <strong>${escapeHtml(changedAt)}</strong>.
      </p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;font-size:12px;color:#9a3412;">
        If you did not make this change, please use "Forgot password" on addmeup.ng immediately or message support on WhatsApp at <strong>+234 904 046 4774</strong>.
      </div>
    `,
  });

  return await sendResendEmail({
    from: DEFAULT_FROM_SECURITY,
    to: toEmail,
    subject: 'Security Alert: Your AddMeUp password was changed',
    html,
  });
}

/**
 * 5. Diagnostic Test Email (from Admin Settings)
 */
export async function sendTestResendEmail({
  toEmail,
}) {
  const cleanEmail = String(toEmail || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { sent: false, reason: 'Please enter a valid recipient email address.' };
  }

  const sentAt = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = wrapEmailLayout({
    title: 'Resend Email Test Successful',
    subtitle: 'Verified Domain: addmeup.ng',
    badgeText: 'RESEND DELIVERY ACTIVE',
    badgeBg: '#ecfdf5',
    badgeColor: '#047857',
    badgeBorder: '#a7f3d0',
    bodyHtml: `
      <p style="font-size:14px;line-height:1.6;margin:0 0 14px;">Your AddMeUp transactional email pipeline is working!</p>
      <p style="font-size:13px;line-height:1.6;color:#475569;margin:0 0 18px;">
        This diagnostic test email was sent from <strong>${escapeHtml(DEFAULT_FROM_GENERAL)}</strong> via Resend at <strong>${escapeHtml(sentAt)}</strong>.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;font-size:12px;color:#334155;">
        Active transactional triggers: Signup Welcome, Deposit Receipts, Withdrawal Updates, Password Reset Links, and Password Change Alerts.
      </div>
    `,
  });

  return await sendResendEmail({
    from: DEFAULT_FROM_GENERAL,
    to: cleanEmail,
    subject: 'AddMeUp Email Test — addmeup.ng is live on Resend',
    html,
  });
}

