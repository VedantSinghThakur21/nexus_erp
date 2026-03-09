/**
 * Nexus ERP — Transactional Email Service
 * =========================================
 * Sends branded HTML emails via SMTP (nodemailer).
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USE_TLS, SMTP_EMAIL, SMTP_PASSWORD, SMTP_DISPLAY_NAME
 */

import nodemailer from 'nodemailer'

// ============================================================================
// Transporter
// ============================================================================

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const secure = port === 465 // true = implicit TLS, false = STARTTLS
  const user = process.env.SMTP_EMAIL
  const pass = process.env.SMTP_PASSWORD

  if (!host || !user || !pass) {
    throw new Error(
      'Email not configured. Set SMTP_HOST, SMTP_EMAIL, and SMTP_PASSWORD in your environment.'
    )
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // allow self-signed certs in dev
  })
}

// ============================================================================
// HTML Email Template
// ============================================================================

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Nexus ERP</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;">

          <!-- Logo / Brand Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:14px;padding:14px 24px;">
                    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      &#9679;&nbsp;Nexus&nbsp;<span style="color:#3b82f6;">ERP</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                This email was sent by <strong style="color:#64748b;">Nexus ERP</strong> &mdash; the modern operating system for your business.<br/>
                If you didn&rsquo;t expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ============================================================================
// Email Templates
// ============================================================================

export interface InviteEmailData {
  inviteeName: string
  inviteeEmail: string
  organizationName: string
  inviterName: string
  role: string
  loginUrl: string
  tempPassword: string
}

function inviteEmailHtml(data: InviteEmailData): string {
  const roleLabel = data.role.charAt(0).toUpperCase() + data.role.slice(1)

  const content = `
    <!-- Top accent bar -->
    <tr>
      <td style="height:5px;background:linear-gradient(90deg,#3b82f6 0%,#6366f1 100%);"></td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:40px 40px 32px;">

        <!-- Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td style="background:#eff6ff;border-radius:12px;width:52px;height:52px;text-align:center;vertical-align:middle;">
              <span style="font-size:26px;line-height:52px;display:block;">&#128101;</span>
            </td>
          </tr>
        </table>

        <!-- Heading -->
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">
          You&rsquo;re invited to join ${escapeHtml(data.organizationName)}
        </h1>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
          <strong style="color:#374151;">${escapeHtml(data.inviterName)}</strong> has invited you to collaborate on
          <strong style="color:#374151;">${escapeHtml(data.organizationName)}</strong> using Nexus ERP.
        </p>

        <!-- Role badge -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 16px;">
              <span style="font-size:13px;color:#0369a1;font-weight:600;">&#128274;&ensp;Your role: ${escapeHtml(roleLabel)}</span>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px;" />

        <!-- Credentials box -->
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">
          &#128272;&ensp;Your Login Credentials
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Email / Username</span>
                    <span style="font-size:14px;color:#1e293b;font-weight:500;">${escapeHtml(data.inviteeEmail)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;">
                    <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Temporary Password</span>
                    <span style="font-size:16px;color:#1e293b;font-weight:700;font-family:'Courier New',Courier,monospace;letter-spacing:0.12em;">${escapeHtml(data.tempPassword)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td style="border-radius:10px;background:linear-gradient(135deg,#2563eb 0%,#3b82f6 100%);">
              <a href="${data.loginUrl}" target="_blank" rel="noopener noreferrer"
                style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                Log In to Nexus ERP &rarr;
              </a>
            </td>
          </tr>
        </table>

        <!-- Warning note -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                <strong>&#9888;&ensp;Important:</strong> This is a temporary password. Please change it after your first login from your profile settings.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- Bottom strip -->
    <tr>
      <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;">
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
          If the button doesn&rsquo;t work, copy and paste this link into your browser:<br/>
          <a href="${data.loginUrl}" style="color:#3b82f6;word-break:break-all;">${data.loginUrl}</a>
        </p>
      </td>
    </tr>
  `

  return baseTemplate(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${content}</table>`)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ============================================================================
// Public Send Functions
// ============================================================================

export async function sendInviteEmail(data: InviteEmailData): Promise<void> {
  const transporter = createTransporter()
  const fromName = process.env.SMTP_DISPLAY_NAME || 'Nexus ERP'
  const fromEmail = process.env.SMTP_EMAIL!

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: `"${data.inviteeName}" <${data.inviteeEmail}>`,
    subject: `You've been invited to join ${data.organizationName} on Nexus ERP`,
    html: inviteEmailHtml(data),
    text: [
      `Hi ${data.inviteeName},`,
      '',
      `${data.inviterName} has invited you to join ${data.organizationName} on Nexus ERP.`,
      '',
      `Your login credentials:`,
      `  Email: ${data.inviteeEmail}`,
      `  Password: ${data.tempPassword}`,
      `  Role: ${data.role}`,
      '',
      `Log in at: ${data.loginUrl}`,
      '',
      `Please change your password after your first login.`,
    ].join('\n'),
  })
}
