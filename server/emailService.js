import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Transactional Email Service via Resend for AddMeUp (verified domain: addmeup.ng)
 * Handles Signup Welcome, Deposit Receipts, Withdrawal Notifications,
 * Password Reset Links, Password Change Security Alerts, and Diagnostics.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_FROM_GENERAL = process.env.RESEND_FROM_EMAIL || 'AddMeUp <noreply@addmeup.ng>';
const DEFAULT_FROM_RECEIPTS = process.env.RESEND_FROM_RECEIPTS || 'AddMeUp Receipts <receipts@addmeup.ng>';
const DEFAULT_FROM_SECURITY = process.env.RESEND_FROM_SECURITY || 'AddMeUp Security <security@addmeup.ng>';
const DEFAULT_REPLY_TO = process.env.RESEND_REPLY_TO || 'heisgag1@gmail.com';

const PUBLIC_LOGO_URL = 'https://addmeup.ng/icon-192.png';
const LOGO_CID = 'addmeup-logo';

// Load PNG logo once at startup for CID inline embedding so Gmail/Outlook never block it
let cachedLogoBase64 = null;
try {
  const logoCandidates = [
    path.resolve(__dirname, '..', 'public', 'icon-192.png'),
    path.resolve(__dirname, '..', 'dist', 'icon-192.png'),
  ];
  for (const candidate of logoCandidates) {
    if (fs.existsSync(candidate)) {
      cachedLogoBase64 = fs.readFileSync(candidate).toString('base64');
      break;
    }
  }
} catch (err) {
  console.warn('[EmailService] Could not preload inline logo PNG:', err?.message);
}

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

function getLogoSrc() {
  return cachedLogoBase64 ? `cid:${LOGO_CID}` : PUBLIC_LOGO_URL;
}

function getEmailAttachments() {
  if (!cachedLogoBase64) return undefined;
  return [
    {
      filename: 'addmeup-logo.png',
      content: cachedLogoBase64,
      content_id: LOGO_CID,
    },
  ];
}

function wrapEmailLayout({
  title,
  preheader = '',
  subtitle,
  badgeText,
  badgeBg = '#ecfdf5',
  badgeColor = '#047857',
  badgeBorder = '#a7f3d0',
  bodyHtml,
}) {
  const logoSrc = getLogoSrc();
  const safePreheader = escapeHtml(preheader || subtitle || title);
  // Preheader spacer prevents email clients from pulling body/header labels into the inbox preview snippet
  const preheaderSpacer = '&#847;&zwnj;&nbsp;'.repeat(35);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${safePreheader}${preheaderSpacer}</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f5f7" style="background-color:#f4f5f7;padding:28px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.06);">
          <!-- Top Orange Brand Strip -->
          <tr>
            <td height="5" bgcolor="#ea580c" style="background:linear-gradient(90deg,#ea580c 0%,#f97316 55%,#fb923c 100%);background-color:#ea580c;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Clean Fintech Horizontal Header -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:22px 28px;border-bottom:1px solid #f1f5f9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" style="width:62px;">
                    <img
                      src="${logoSrc}"
                      alt="AddMeUp"
                      width="54"
                      height="54"
                      style="display:block;width:54px;height:54px;border-radius:14px;border:1px solid #fed7aa;background-color:#fff7ed;object-fit:cover;"
                    />
                  </td>
                  <td valign="middle" style="padding-left:14px;">
                    <div style="font-size:18px;font-weight:900;letter-spacing:-0.4px;color:#0f172a;line-height:1.2;">Add<span style="color:#ea580c;">MeUp</span></div>
                    <div style="font-size:12px;font-weight:600;color:#64748b;margin-top:2px;">${escapeHtml(subtitle)}</div>
                  </td>
                  <td valign="middle" align="right">
                    <span style="display:inline-block;background-color:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:999px;padding:4px 10px;font-size:10px;font-weight:800;letter-spacing:0.04em;">addmeup.ng</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:26px 28px 24px;background-color:#ffffff;">
              ${badgeText ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;">
                <tr>
                  <td style="background-color:${badgeBg};color:${badgeColor};border:1px solid ${badgeBorder};border-radius:999px;padding:5px 12px;font-size:10px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;">
                    ${escapeHtml(badgeText)}
                  </td>
                </tr>
              </table>` : ''}

              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#f8fafc" style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#475569;font-weight:600;">
                Need assistance? WhatsApp Support: <strong style="color:#0f172a;">+234 904 046 4774</strong>
              </p>
              <p style="margin:0 0 6px;font-size:11px;color:#64748b;">
                <a href="https://addmeup.ng" style="color:#ea580c;text-decoration:none;font-weight:700;">addmeup.ng</a>
                &nbsp;&bull;&nbsp; Social Handle Growth &amp; Rewards Platform
              </p>
              <p style="margin:0;font-size:10px;color:#94a3b8;">
                Sent securely from our verified domain <strong style="color:#64748b;">addmeup.ng</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
    const attachments = getEmailAttachments();
    const requestBody = {
      from,
      to: [String(to).trim()],
      reply_to: replyTo,
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
    preheader: 'Your AddMeUp wallet is active with +20 Free Points credited.',
    subtitle: 'Your Social Growth Wallet is Ready',
    badgeText: '+20 Free Welcome Points Credited',
    bodyHtml: `
      <h1 style="font-size:21px;font-weight:900;color:#0f172a;margin:0 0 10px;letter-spacing:-0.3px;">Welcome aboard, ${safeName}!</h1>
      <p style="font-size:14px;line-height:1.65;color:#475569;margin:0 0 20px;">
        Your <strong>AddMeUp</strong> account is officially active. We've credited your wallet with <strong>+20 Free Points</strong> so you can start growing your Snapchat &amp; WhatsApp contacts right away.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:16px;margin-bottom:20px;">
        <tr>
          <td style="padding:20px;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;font-weight:800;letter-spacing:0.06em;color:#c2410c;">Starting Wallet Balance</div>
            <div style="font-size:32px;font-weight:900;color:#0f172a;margin:6px 0 4px;">+20 Points</div>
            <div style="font-size:12px;color:#047857;font-weight:700;">Earn +5 more points for every verified add</div>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:14px 16px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:6px;">How to make the most of AddMeUp:</div>
            <div style="font-size:12px;color:#475569;line-height:1.75;">
              1. Add verified peers on Snapchat &amp; WhatsApp to earn <strong>+5 Pts</strong> per claim.<br/>
              2. Check in daily for ascending streak bonuses up to <strong>+10 Pts/day</strong>.<br/>
              3. Publish or VIP-boost your handle to attract real daily adds.
            </div>
          </td>
        </tr>
      </table>

      ${safeRef ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:22px;">
        <tr>
          <td style="padding:14px 16px;background-color:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;font-size:12px;color:#334155;">
            <strong>Your Invite Code:</strong> <span style="font-family:monospace;font-weight:900;color:#ea580c;font-size:13px;">${safeRef}</span><br/>
            <span style="color:#64748b;">Share your link inside the Wallet tab to earn <strong>+10 bonus points</strong> for every friend who signs up.</span>
          </td>
        </tr>
      </table>` : ''}

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:6px auto 2px;">
        <tr>
          <td align="center" bgcolor="#ea580c" style="border-radius:12px;background-color:#ea580c;">
            <a href="https://addmeup.ng" style="display:inline-block;padding:13px 30px;font-size:13px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;">Open AddMeUp Feed &rarr;</a>
          </td>
        </tr>
      </table>
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

  const receiptSubject = `Payment Confirmed: +${credits} Points Credited (Ref: ${reference})`;
  const formattedDate = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = wrapEmailLayout({
    title: 'AddMeUp Deposit Receipt',
    preheader: `₦${Number(amountNgn || 0).toLocaleString('en-NG')} payment confirmed. +${credits} Points added to your wallet.`,
    subtitle: 'Official Electronic Deposit Voucher',
    badgeText: 'Verified & Settled',
    bodyHtml: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:16px;margin-bottom:22px;">
        <tr>
          <td style="padding:22px 20px;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;font-weight:800;letter-spacing:0.06em;color:#c2410c;">Amount Paid</div>
            <div style="font-size:34px;font-weight:900;color:#0f172a;margin:6px 0 4px;">₦${Number(amountNgn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
            <div style="font-size:14px;font-weight:800;color:#059669;">+${Number(credits || 0).toLocaleString()} Points Credited to Wallet</div>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:13px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;background-color:#f8fafc;">Account</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;">${escapeHtml(userName)} (${escapeHtml(toEmail)})</td>
        </tr>
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;background-color:#f8fafc;">Reference ID</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;font-family:monospace;">${escapeHtml(reference)}</td>
        </tr>
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;background-color:#f8fafc;">Date &amp; Time</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;">${escapeHtml(formattedDate)}</td>
        </tr>
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;background-color:#f8fafc;">Payment Channel</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;">${escapeHtml(paymentMethod)}</td>
        </tr>
        <tr>
          <td style="padding:11px 14px;color:#64748b;background-color:#f8fafc;">Settlement Status</td>
          <td style="padding:11px 14px;text-align:right;font-weight:800;color:#059669;">SUCCESSFUL</td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:22px auto 2px;">
        <tr>
          <td align="center" bgcolor="#0f172a" style="border-radius:12px;background-color:#0f172a;">
            <a href="https://addmeup.ng" style="display:inline-block;padding:12px 26px;font-size:13px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;">Open Wallet Balance &rarr;</a>
          </td>
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
  status = 'requested',
}) {
  if (!toEmail || !String(toEmail).includes('@')) {
    return { sent: false, reason: 'Invalid email' };
  }

  const dedupeKey = reference ? `${reference}_${status}` : null;
  if (dedupeKey && sentWithdrawalRefs.has(dedupeKey)) {
    return { sent: true, deduplicated: true };
  }

  const statusMeta = {
    requested: { label: 'Withdrawal Request Received', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', title: 'Withdrawal Request Submitted' },
    approved: { label: 'Payout Approved', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', title: 'Withdrawal Approved & Processing' },
    paid: { label: 'Payout Completed', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', title: 'Withdrawal Sent to Your Bank' },
    rejected: { label: 'Withdrawal Returned', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', title: 'Withdrawal Request Declined' },
  }[status] || { label: 'Withdrawal Update', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', title: 'Withdrawal Status Update' };

  const html = wrapEmailLayout({
    title: statusMeta.title,
    preheader: `Update on your ₦${Number(amountNgn || 0).toLocaleString('en-NG')} AddMeUp payout.`,
    subtitle: 'Wallet Withdrawal & Payout Notice',
    badgeText: statusMeta.label,
    badgeBg: statusMeta.bg,
    badgeColor: statusMeta.color,
    badgeBorder: statusMeta.border,
    bodyHtml: `
      <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 18px;">Hi <strong>${escapeHtml(userName)}</strong>, here is the latest status on your AddMeUp payout:</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;margin-bottom:20px;">
        <tr>
          <td style="padding:20px;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;font-weight:800;letter-spacing:0.06em;color:#64748b;">Payout Amount</div>
            <div style="font-size:32px;font-weight:900;color:#0f172a;margin:6px 0 4px;">₦${Number(amountNgn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
            ${pointsDeducted ? `<div style="font-size:12px;color:#475569;font-weight:700;">${Number(pointsDeducted).toLocaleString()} Points Converted</div>` : ''}
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:13px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;background-color:#f8fafc;">Destination Bank</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;">${escapeHtml(bankName)} (${escapeHtml(accountNumberMasked)})</td>
        </tr>
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;background-color:#f8fafc;">Reference ID</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;font-family:monospace;">${escapeHtml(reference || 'N/A')}</td>
        </tr>
        <tr>
          <td style="padding:11px 14px;color:#64748b;background-color:#f8fafc;">Status</td>
          <td style="padding:11px 14px;text-align:right;font-weight:800;color:${statusMeta.color};text-transform:uppercase;">${escapeHtml(status)}</td>
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
    preheader: 'Use this secure link to set a new password for your AddMeUp account.',
    subtitle: 'Account Security Verification',
    badgeText: 'Password Reset Request',
    badgeBg: '#fff7ed',
    badgeColor: '#c2410c',
    badgeBorder: '#fed7aa',
    bodyHtml: `
      <h1 style="font-size:19px;font-weight:900;color:#0f172a;margin:0 0 10px;">Reset your password</h1>
      <p style="font-size:14px;line-height:1.65;color:#475569;margin:0 0 18px;">
        Hi <strong>${escapeHtml(userName)}</strong>, we received a request to reset or set the password for your AddMeUp account (<strong>${escapeHtml(toEmail)}</strong>).
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:22px auto;">
        <tr>
          <td align="center" bgcolor="#0f172a" style="border-radius:12px;background-color:#0f172a;">
            <a href="${escapeHtml(resetLink)}" style="display:inline-block;padding:13px 28px;font-size:13px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;">Reset Password Now &rarr;</a>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:14px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-size:12px;line-height:1.6;color:#64748b;">
            If you didn't request a password reset, you can safely ignore this email &mdash; your account remains protected. This single-use link expires automatically.
          </td>
        </tr>
      </table>
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
    preheader: 'Security confirmation that your AddMeUp password was updated.',
    subtitle: 'Account Security Alert',
    badgeText: 'Password Updated',
    badgeBg: '#ecfdf5',
    badgeColor: '#047857',
    badgeBorder: '#a7f3d0',
    bodyHtml: `
      <h1 style="font-size:19px;font-weight:900;color:#0f172a;margin:0 0 10px;">Password changed successfully</h1>
      <p style="font-size:14px;line-height:1.65;color:#475569;margin:0 0 18px;">
        Hi <strong>${escapeHtml(userName)}</strong>, this security notice confirms that the password for <strong>${escapeHtml(toEmail)}</strong> was updated on <strong>${escapeHtml(changedAt)}</strong>.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:14px 16px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:12px;font-size:12px;line-height:1.6;color:#9a3412;">
            Didn't make this change? Reset your password immediately at <a href="https://addmeup.ng" style="color:#c2410c;font-weight:800;">addmeup.ng</a> or message WhatsApp support on <strong>+234 904 046 4774</strong>.
          </td>
        </tr>
      </table>
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
    title: 'AddMeUp Email System Active',
    preheader: 'Your redesigned AddMeUp transactional email template & inline logo are live.',
    subtitle: 'Official Notification System',
    badgeText: 'Template Upgraded & Verified',
    badgeBg: '#ecfdf5',
    badgeColor: '#047857',
    badgeBorder: '#a7f3d0',
    bodyHtml: `
      <h1 style="font-size:21px;font-weight:900;color:#0f172a;margin:0 0 10px;letter-spacing:-0.3px;">Your redesigned AddMeUp template is live</h1>
      <p style="font-size:14px;line-height:1.65;color:#475569;margin:0 0 20px;">
        This test confirms your clean white-and-orange brand header and inline AddMeUp logo are rendering properly via <strong>Resend</strong> from <strong>${escapeHtml(DEFAULT_FROM_GENERAL)}</strong>.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:12px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:22px;">
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;background-color:#f8fafc;">Domain &amp; Sender</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;">noreply@addmeup.ng</td>
        </tr>
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;background-color:#f8fafc;">Email Body Logo</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#059669;">${cachedLogoBase64 ? 'Inline CID PNG Embedded' : 'HTTPS CDN URL'}</td>
        </tr>
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;background-color:#f8fafc;">BIMI Inbox Icon Asset</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;">addmeup.ng/bimi-logo.svg</td>
        </tr>
        <tr>
          <td style="padding:11px 14px;color:#64748b;background-color:#f8fafc;">Dispatched At</td>
          <td style="padding:11px 14px;text-align:right;font-weight:700;color:#0f172a;">${escapeHtml(sentAt)}</td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:4px auto;">
        <tr>
          <td align="center" bgcolor="#ea580c" style="border-radius:12px;background-color:#ea580c;">
            <a href="https://addmeup.ng" style="display:inline-block;padding:12px 28px;font-size:13px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;">Open AddMeUp Dashboard &rarr;</a>
          </td>
        </tr>
      </table>
    `,
  });

  return await sendResendEmail({
    from: DEFAULT_FROM_GENERAL,
    to: cleanEmail,
    subject: 'AddMeUp Email — Upgraded Template & Brand Header',
    html,
  });
}
