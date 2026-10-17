/**
 * Shared, mobile-first HTML shell for every campaign / broadcast email.
 *
 * It is deliberately a pure string builder (no Node-only imports) so the exact
 * same markup can be rendered both when sending (lib/email.ts) and inside the
 * admin "Preview" modal. That keeps the preview pixel-honest.
 *
 * Design goals:
 *  - Table based layout: the most reliable structure across Gmail, Outlook,
 *    Apple Mail and Android clients.
 *  - A fluid 600px card that collapses gracefully to a full-width column on
 *    phones (media query shrinks padding, headings and makes buttons full width).
 *  - Templates only provide their inner content; the shell owns the page
 *    background, the card, the responsive padding and the footer.
 */

export const CAMPAIGN_EMAIL_WIDTH = 600

export function buildCampaignEmailHtml(body: string, options?: { year?: number }): string {
  const year = options?.year ?? new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Preptio</title>
  <style>
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; background: #eef2f7; }
    body { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; display: block; max-width: 100%; height: auto; }
    a { color: #0f7938; }
    .pj-card a { word-break: break-word; }
    @media only screen and (max-width: 600px) {
      .pj-outer { padding: 12px 8px !important; }
      .pj-card { border-radius: 14px !important; }
      .pj-pad { padding: 22px 18px !important; }
      .pj-footer { padding: 18px 16px !important; }
      .pj-h1 { font-size: 22px !important; line-height: 1.3 !important; }
      .pj-h2 { font-size: 19px !important; line-height: 1.35 !important; }
      .pj-lead { font-size: 14.5px !important; }
      .pj-body { font-size: 15px !important; }
      .pj-hero { padding: 26px 18px !important; }
      .pj-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-left: 12px !important; padding-right: 12px !important; }
      .pj-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-right: 0 !important; text-align: center !important; }
      .pj-stack-icon { margin: 0 auto 10px auto !important; }
      .pj-hide-mobile { display: none !important; }
      .pj-center-mobile { text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;">
  <div style="display:none;font-size:1px;color:#eef2f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Preptio</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#eef2f7;">
    <tr>
      <td align="center" class="pj-outer" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="pj-card" style="width:100%;max-width:${CAMPAIGN_EMAIL_WIDTH}px;background:#ffffff;border-radius:18px;border:1px solid #e6ebf1;box-shadow:0 8px 24px -12px rgba(15,23,42,0.18);overflow:hidden;">
          <tr>
            <td class="pj-pad" style="padding:34px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.65;color:#334155;">
${body}
            </td>
          </tr>
          <tr>
            <td class="pj-footer" style="padding:20px 24px 26px;border-top:1px solid #eef2f6;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:800;letter-spacing:-0.01em;color:#0f172a;">Preptio</p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                The smarter way to prepare for your CA exams.<br />
                &copy; ${year} Preptio. All rights reserved.
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
