/**
 * Client-side helpers to trigger branded Resend transactional emails
 * via the Express backend routes cleanly and non-blockingly.
 */

export async function notifyWelcomeEmail(params: {
  uid: string;
  email?: string | null;
  userName?: string | null;
  referralCode?: string;
}): Promise<void> {
  const email = params.email?.trim();
  if (!email || !email.includes('@') || !params.uid) return;

  const sentKey = `addmeup_welcome_email_sent_${params.uid}`;
  try {
    if (typeof window !== 'undefined' && localStorage.getItem(sentKey) === '1') {
      return;
    }
  } catch {}

  try {
    const res = await fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: params.uid,
        toEmail: email,
        userName: params.userName || email.split('@')[0],
        referralCode: params.referralCode || '',
      }),
    });
    if (res.ok) {
      try {
        localStorage.setItem(sentKey, '1');
      } catch {}
    }
  } catch {
    // Non-blocking in client-only preview
  }
}

export async function notifyDepositEmail(params: {
  toEmail?: string | null;
  amountNgn: number;
  credits: number;
  reference: string;
  paymentMethod?: string;
  userName?: string;
}): Promise<void> {
  const email = params.toEmail?.trim();
  if (!email || !email.includes('@') || !params.reference) return;

  try {
    await fetch('/api/email/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: email,
        amountNgn: params.amountNgn,
        credits: params.credits,
        reference: params.reference,
        paymentMethod: params.paymentMethod || 'Paystack Instant Payment',
        userName: params.userName || email.split('@')[0],
      }),
    });
  } catch {
    // Non-blocking fallback
  }
}

export async function requestBrandedPasswordReset(email: string): Promise<{
  handledByServer: boolean;
  fallbackToFirebaseClient?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { handledByServer: true };
    }
    if (data.fallbackToFirebaseClient) {
      return { handledByServer: false, fallbackToFirebaseClient: true };
    }
    return {
      handledByServer: false,
      fallbackToFirebaseClient: res.status === 404 || res.status >= 500,
      error: data.message,
    };
  } catch {
    return { handledByServer: false, fallbackToFirebaseClient: true };
  }
}

export async function notifyPasswordChangedEmail(params: {
  toEmail?: string | null;
  userName?: string | null;
}): Promise<void> {
  const email = params.toEmail?.trim();
  if (!email || !email.includes('@')) return;

  try {
    await fetch('/api/email/password-changed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: email,
        userName: params.userName || email.split('@')[0],
      }),
    });
  } catch {
    // Non-blocking
  }
}

export async function notifyWithdrawalEmail(params: {
  toEmail?: string | null;
  userName?: string | null;
  amountNgn: number;
  pointsDeducted?: number;
  bankName?: string;
  accountNumberMasked?: string;
  reference?: string;
  status?: 'requested' | 'approved' | 'paid' | 'rejected';
}): Promise<void> {
  const email = params.toEmail?.trim();
  if (!email || !email.includes('@')) return;

  try {
    await fetch('/api/email/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: email,
        userName: params.userName || email.split('@')[0],
        amountNgn: params.amountNgn,
        pointsDeducted: params.pointsDeducted || 0,
        bankName: params.bankName,
        accountNumberMasked: params.accountNumberMasked,
        reference: params.reference,
        status: params.status || 'requested',
      }),
    });
  } catch {
    // Non-blocking
  }
}

export async function sendDiagnosticTestEmail(toEmail: string): Promise<{
  success: boolean;
  sent?: boolean;
  hasResendKey?: boolean;
  id?: string;
  reason?: string;
  message?: string;
}> {
  const res = await fetch('/api/email/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toEmail: toEmail.trim() }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      reason: 'Email API route did not return JSON. Ensure the Express server is running.',
    };
  }
}

