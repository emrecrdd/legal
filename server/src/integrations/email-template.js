const escapeHtml = (value) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const normalizeUrl = (value) => {
  const url = String(value ?? '').trim();

  if (!url) {
    return null;
  }

  if (!/^https?:\/\//i.test(url)) {
    return null;
  }

  return url;
};

const renderButton = ({
  label,
  url,
}) => {
  const safeUrl = normalizeUrl(url);

  if (!safeUrl || !label) {
    return '';
  }

  return `
    <div style="margin:28px 0;">
      <a
        href="${escapeHtml(safeUrl)}"
        style="
          display:inline-block;
          padding:12px 20px;
          background:#2563eb;
          color:#ffffff;
          text-decoration:none;
          border-radius:8px;
          font-weight:600;
        "
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `;
};

const renderDetails = (items = []) => {
  const validItems = items.filter(
    (item) =>
      item &&
      item.label &&
      item.value !== undefined &&
      item.value !== null &&
      String(item.value).trim()
  );

  if (validItems.length === 0) {
    return '';
  }

  const rows = validItems
    .map(
      (item) => `
        <tr>
          <td
            style="
              width:160px;
              padding:10px;
              border:1px solid #e5e7eb;
              font-weight:600;
              vertical-align:top;
            "
          >
            ${escapeHtml(item.label)}
          </td>

          <td
            style="
              padding:10px;
              border:1px solid #e5e7eb;
              vertical-align:top;
            "
          >
            ${escapeHtml(item.value)}
          </td>
        </tr>
      `
    )
    .join('');

  return `
    <table
      style="
        width:100%;
        border-collapse:collapse;
        margin:22px 0;
      "
    >
      ${rows}
    </table>
  `;
};

export const createEmailTemplate = ({
  title,
  greeting,
  paragraphs = [],
  details = [],
  button,
  warning,
  footer,
}) => {
  const safeTitle = escapeHtml(title || 'Derkenar');

  const paragraphHtml = paragraphs
    .filter(Boolean)
    .map(
      (paragraph) => `
        <p style="margin:0 0 16px;line-height:1.65;">
          ${escapeHtml(paragraph)}
        </p>
      `
    )
    .join('');

  const warningHtml = warning
    ? `
      <div
        style="
          margin:20px 0;
          padding:14px 16px;
          border:1px solid #fbbf24;
          border-radius:8px;
          background:#fffbeb;
          color:#92400e;
          line-height:1.5;
        "
      >
        ${escapeHtml(warning)}
      </div>
    `
    : '';

  return `
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8">
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >
        <title>${safeTitle}</title>
      </head>

      <body
        style="
          margin:0;
          padding:24px;
          background:#f3f4f6;
          font-family:Arial,Helvetica,sans-serif;
          color:#1f2937;
        "
      >
        <div
          style="
            max-width:640px;
            margin:0 auto;
            background:#ffffff;
            border:1px solid #e5e7eb;
            border-radius:12px;
            overflow:hidden;
          "
        >
          <div
            style="
              padding:22px 26px;
              background:#111827;
              color:#ffffff;
            "
          >
            <div
              style="
                font-size:12px;
                text-transform:uppercase;
                letter-spacing:.08em;
                opacity:.75;
                margin-bottom:8px;
              "
            >
              Derkenar
            </div>

            <h1
              style="
                margin:0;
                font-size:22px;
                line-height:1.3;
              "
            >
              ${safeTitle}
            </h1>
          </div>

          <div style="padding:26px;">
            ${
              greeting
                ? `
                  <p
                    style="
                      margin:0 0 18px;
                      font-weight:600;
                    "
                  >
                    ${escapeHtml(greeting)}
                  </p>
                `
                : ''
            }

            ${paragraphHtml}

            ${renderDetails(details)}

            ${warningHtml}

            ${
              button
                ? renderButton(button)
                : ''
            }

            <p
              style="
                margin:28px 0 0;
                padding-top:18px;
                border-top:1px solid #e5e7eb;
                color:#6b7280;
                font-size:12px;
                line-height:1.5;
              "
            >
              ${
                escapeHtml(
                  footer ||
                    'Bu e-posta Derkenar Hukuk Bürosu Yönetim Sistemi tarafından otomatik olarak gönderilmiştir.'
                )
              }
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const createPlainTextEmail = ({
  title,
  greeting,
  paragraphs = [],
  details = [],
  button,
  warning,
  footer,
}) => {
  const lines = [];

  if (title) {
    lines.push(title, '');
  }

  if (greeting) {
    lines.push(greeting, '');
  }

  for (const paragraph of paragraphs) {
    if (paragraph) {
      lines.push(String(paragraph), '');
    }
  }

  for (const item of details) {
    if (
      item?.label &&
      item?.value !== undefined &&
      item?.value !== null &&
      String(item.value).trim()
    ) {
      lines.push(
        `${item.label}: ${item.value}`
      );
    }
  }

  if (details.length > 0) {
    lines.push('');
  }

  if (warning) {
    lines.push(
      `Uyarı: ${warning}`,
      ''
    );
  }

  if (button?.url) {
    lines.push(
      `${button.label || 'Detayları görüntüle'}:`,
      button.url,
      ''
    );
  }

  lines.push(
    footer ||
      'Bu e-posta Derkenar Hukuk Bürosu Yönetim Sistemi tarafından otomatik olarak gönderilmiştir.'
  );

  return lines.join('\n').trim();
};