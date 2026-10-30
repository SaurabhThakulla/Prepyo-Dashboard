// A student's fee receipt as a one-page A4 PDF: drawn on a canvas in the institution's
// colours with its logo, then wrapped in a minimal PDF around one JPEG image.

export interface ReceiptPayment {
  receiptNo: number;
  paidOn: string; // YYYY-MM-DD
  method: string; // shown as given, e.g. "eSewa"
  amountNpr: number;
}

export interface ReceiptData {
  institution: { name: string; code: string; logoUrl?: string; brandColor: string; city?: string; email?: string };
  student: { name: string; username: string; course: string; batch: string };
  fee: { set: boolean; totalNpr: number; discountNpr: number; paidNpr: number; balanceNpr: number; dueOn: string | null; overdue: boolean };
  // Every payment, in any order.
  payments: ReceiptPayment[];
  // Who signs, and their signature image if the institution added one.
  signature?: { imageUrl: string | null; name: string; title: string };
  // Rs 1,25,000
  rupees: (amount: number) => string;
}

// A4 at 150 dots per inch.
const W = 1240;
const H = 1754;
const M = 96; // side margin

const INK = '#0f172a';
const BODY = '#334155';
const MUTED = '#64748b';
const FAINT = '#94a3b8';
const RULE = '#e2e8f0';
const ROW = '#f1f5f9';

// Each status as a solid pill: its colour, and the small icon drawn in a white disc.
const STATUS = {
  paid: { label: 'Paid in full', color: '#059669', icon: 'check' },
  received: { label: 'Payment received', color: '#059669', icon: 'check' },
  partly: { label: 'Partly paid', color: '#d97706', icon: 'clock' },
  due: { label: 'Due', color: '#d97706', icon: 'clock' },
  overdue: { label: 'Overdue', color: '#e11d48', icon: 'alert' },
  none: { label: 'No fee set', color: '#64748b', icon: 'dash' },
} as const;

type StatusIcon = (typeof STATUS)[keyof typeof STATUS]['icon'];

// A white disc with the status's mark, centred on (x, y).
function drawStatusIcon(ctx: CanvasRenderingContext2D, icon: StatusIcon, x: number, y: number, color: string) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (icon === 'check') {
    ctx.moveTo(x - 5, y + 0.5);
    ctx.lineTo(x - 1.5, y + 4);
    ctx.lineTo(x + 5.5, y - 3.5);
    ctx.stroke();
  } else if (icon === 'clock') {
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 4.5, y + 3);
    ctx.stroke();
  } else if (icon === 'alert') {
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + 5, 1.7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/** Which tag the receipt shows for this fee. */
export function receiptStatus(fee: ReceiptData['fee']): keyof typeof STATUS {
  if (!fee.set) return fee.paidNpr > 0 ? 'received' : 'none';
  if (fee.balanceNpr <= 0) return 'paid';
  if (fee.overdue) return 'overdue';
  return fee.paidNpr > 0 ? 'partly' : 'due';
}

const dmy = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const todayIso = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

// Draws an image inside a box, keeping its shape; align 'left' or 'center' within the box.
function drawContained(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, boxW: number, boxH: number, align: 'left' | 'center' = 'center') {
  const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, align === 'left' ? x : x + (boxW - w) / 2, y + (boxH - h) / 2, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';

// #rrggbb with an alpha, for soft fills in the brand colour.
const tint = (hex: string, alpha: number) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Cuts text to fit a width, ending in "…".
function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

const MAX_PAYMENT_ROWS = 6;

/** Draws the receipt and returns the canvas. */
export async function drawReceipt(data: ReceiptData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the receipt.');

  const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  const font = (size: number, weight = 400, style = '') => {
    ctx.font = `${style} ${weight} ${size}px ${family}`.trim();
  };
  const spaced = (px: number) => {
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  };
  const text = (value: string, x: number, y: number, align: CanvasTextAlign = 'left', color = INK) => {
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  };
  const rule = (y: number, color = RULE, x1 = M, x2 = W - M, width = 2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  };
  const label = (value: string, x: number, y: number, align: CanvasTextAlign = 'left') => {
    font(17, 600);
    spaced(2);
    text(value.toUpperCase(), x, y, align, FAINT);
    spaced(0);
  };

  const brand = /^#[0-9a-f]{6}$/i.test(data.institution.brandColor) ? data.institution.brandColor : '#1d4ed8';
  const { fee, rupees } = data;
  const status = receiptStatus(fee);
  const tag = STATUS[status];
  const payments = [...data.payments].sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.receiptNo - a.receiptNo);
  const latest = payments[0];
  const receiptNo = latest ? `${data.institution.code.toUpperCase()}-${String(latest.receiptNo).padStart(4, '0')}` : '—';

  const [logo, prepyo, signatureImage] = await Promise.all([
    data.institution.logoUrl ? loadImage(new URL(data.institution.logoUrl, window.location.origin).href) : Promise.resolve(null),
    loadImage('/prepyo-mark.webp'),
    data.signature?.imageUrl ? loadImage(new URL(data.signature.imageUrl, window.location.origin).href) : Promise.resolve(null),
  ]);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = brand;
  ctx.fillRect(0, 0, W, 12);

  // The brand stamp: the institution's logo, faint, in the middle of the page, under everything
  // else. Without a logo, its initials in a ring in its colour.
  const stampSize = 560;
  ctx.save();
  ctx.globalAlpha = 0.08;
  if (logo) {
    drawContained(ctx, logo, (W - stampSize) / 2, (H - stampSize) / 2 + 40, stampSize, stampSize);
  } else {
    ctx.strokeStyle = brand;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 + 40, stampSize / 2 - 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 + 40, stampSize / 2 - 40, 0, Math.PI * 2);
    ctx.stroke();
    font(200, 800);
    ctx.textBaseline = 'middle';
    text(initials(data.institution.name), W / 2, H / 2 + 48, 'center', brand);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  // Prepyo, top left; the site, top right.
  if (prepyo) ctx.drawImage(prepyo, M, 40, 34, 34);
  font(22, 700);
  text('prepyo', prepyo ? M + 44 : M, 66);
  font(18);
  text('prepyo.online', W - M, 66, 'right', FAINT);
  rule(100, ROW);

  // The institution on the left, the receipt's title and number on the right.
  let y = 136;
  const logoBox = 128;
  if (logo) {
    drawContained(ctx, logo, M, y, logoBox, logoBox, 'left');
  } else {
    ctx.fillStyle = brand;
    roundRect(ctx, M, y, logoBox, logoBox, 24);
    ctx.fill();
    font(48, 700);
    ctx.textBaseline = 'middle';
    text(initials(data.institution.name), M + logoBox / 2, y + logoBox / 2 + 2, 'center', '#ffffff');
    ctx.textBaseline = 'alphabetic';
  }
  const nameX = M + logoBox + 28;
  font(32, 700);
  text(fit(ctx, data.institution.name, 520), nameX, y + 52);
  font(20);
  const contact = [data.institution.city, data.institution.email].filter(Boolean).join('  ·  ');
  if (contact) text(fit(ctx, contact, 520), nameX, y + 88, 'left', MUTED);

  font(40, 700);
  spaced(3);
  text('FEE RECEIPT', W - M, y + 50, 'right', brand);
  spaced(0);
  font(20);
  text(`Receipt No.  ${receiptNo}`, W - M, y + 88, 'right', BODY);
  text(`Issued  ${dmy(todayIso())}`, W - M, y + 118, 'right', BODY);

  y += logoBox + 48;
  rule(y);

  // Who paid, and the receipt's details.
  y += 52;
  label('Received from', M, y);
  label('Receipt details', W / 2 + 40, y);
  y += 46;
  font(30, 700);
  text(fit(ctx, data.student.name, W / 2 - M - 40), M, y);
  font(21);
  text(`Username: ${data.student.username}`, M, y + 38, 'left', BODY);
  text(`Course: ${data.student.course || '—'}`, M, y + 72, 'left', BODY);
  text(`Batch: ${data.student.batch || '—'}`, M, y + 106, 'left', BODY);

  const details: [string, string][] = [
    ['Receipt no.', receiptNo],
    ['Issue date', dmy(todayIso())],
    ['Due date', fee.dueOn ? dmy(fee.dueOn) : '—'],
    ['Paid by', latest ? latest.method : '—'],
  ];
  const dx = W / 2 + 40;
  details.forEach(([k, v], i) => {
    const ry = y - 8 + i * 36;
    font(21);
    text(k, dx, ry, 'left', MUTED);
    font(21, 600);
    text(v, W - M, ry, 'right', INK);
  });
  y += 150;

  // The fee summary.
  const rowH = 62;
  ctx.fillStyle = tint(brand, 0.08);
  roundRect(ctx, M, y, W - 2 * M, rowH, 10);
  ctx.fill();
  label('Description', M + 24, y + 38);
  label('Amount', W - M - 24, y + 38, 'right');
  y += rowH;

  const lines: { name: string; amount: string; strong?: boolean }[] = fee.set
    ? [
        { name: 'Course fee', amount: rupees(fee.totalNpr) },
        { name: 'Discount', amount: fee.discountNpr ? `− ${rupees(fee.discountNpr)}` : rupees(0) },
        { name: 'Fee after discount', amount: rupees(fee.totalNpr - fee.discountNpr), strong: true },
        { name: 'Total paid', amount: `− ${rupees(fee.paidNpr)}` },
      ]
    : [
        { name: 'Course fee', amount: 'Not set' },
        { name: 'Total paid', amount: rupees(fee.paidNpr), strong: true },
      ];
  for (const line of lines) {
    font(23, line.strong ? 700 : 400);
    text(line.name, M + 24, y + 40, 'left', line.strong ? INK : BODY);
    text(line.amount, W - M - 24, y + 40, 'right', line.strong ? INK : BODY);
    y += rowH;
    rule(y, ROW, M + 24, W - M - 24);
  }

  // Balance due, set apart in the brand colour.
  const due = fee.set ? Math.max(0, fee.balanceNpr) : 0;
  y += 14;
  ctx.fillStyle = tint(brand, 0.1);
  roundRect(ctx, M, y, W - 2 * M, 84, 12);
  ctx.fill();
  font(26, 700);
  ctx.textBaseline = 'middle';
  text(fee.set && fee.balanceNpr < 0 ? 'Paid in advance' : 'Balance due', M + 24, y + 43, 'left', INK);
  font(34, 700);
  text(fee.set && fee.balanceNpr < 0 ? rupees(-fee.balanceNpr) : rupees(due), W - M - 24, y + 43, 'right', brand);
  // The status beside the label: a solid pill with an icon, softly lifted off the row.
  font(26, 700);
  const tagX = M + 24 + ctx.measureText(fee.set && fee.balanceNpr < 0 ? 'Paid in advance' : 'Balance due').width + 22;
  font(19, 600);
  const tagH = 42;
  const tagW = 12 + 24 + 10 + ctx.measureText(tag.label).width + 18;
  const tagY = y + 43 - tagH / 2;
  ctx.save();
  ctx.shadowColor = tint(tag.color, 0.35);
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, tagX, tagY, tagW, tagH, tagH / 2);
  ctx.fillStyle = tag.color;
  ctx.fill();
  ctx.restore();
  drawStatusIcon(ctx, tag.icon, tagX + 12 + 12, tagY + tagH / 2, tag.color);
  font(19, 600);
  text(tag.label, tagX + 12 + 24 + 10, tagY + tagH / 2 + 1, 'left', '#ffffff');
  ctx.textBaseline = 'alphabetic';
  y += 84 + 56;

  // Every payment, newest first.
  label('Payment history', M, y);
  y += 22;
  if (payments.length === 0) {
    font(21);
    text('No payments recorded yet.', M, y + 36, 'left', MUTED);
    y += 60;
  } else {
    const cols = [M + 24, M + 300, M + 560];
    ctx.fillStyle = ROW;
    roundRect(ctx, M, y, W - 2 * M, 52, 8);
    ctx.fill();
    font(18, 600);
    ['Receipt no.', 'Date', 'Method'].forEach((h, i) => text(h, cols[i], y + 33, 'left', MUTED));
    text('Amount', W - M - 24, y + 33, 'right', MUTED);
    y += 52;
    const shown = payments.slice(0, MAX_PAYMENT_ROWS);
    for (const p of shown) {
      font(21);
      text(String(p.receiptNo).padStart(4, '0'), cols[0], y + 36, 'left', BODY);
      text(dmy(p.paidOn), cols[1], y + 36, 'left', BODY);
      text(fit(ctx, p.method, 260), cols[2], y + 36, 'left', BODY);
      font(21, 600);
      text(rupees(p.amountNpr), W - M - 24, y + 36, 'right', INK);
      y += 54;
      rule(y, ROW, M + 24, W - M - 24);
    }
    if (payments.length > shown.length) {
      font(19);
      text(`and ${payments.length - shown.length} earlier payment${payments.length - shown.length === 1 ? '' : 's'}`, M + 24, y + 32, 'left', MUTED);
      y += 44;
    }
  }

  // A stamp when the fee is fully paid.
  if (status === 'paid') {
    ctx.save();
    // Left of the signature block, so it never covers the signature.
    ctx.translate(W - M - 620, H - 330);
    ctx.rotate(-0.2);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 6;
    roundRect(ctx, -150, -56, 300, 112, 16);
    ctx.stroke();
    ctx.lineWidth = 2;
    roundRect(ctx, -138, -44, 276, 88, 10);
    ctx.stroke();
    font(64, 800);
    spaced(10);
    ctx.textBaseline = 'middle';
    text('PAID', 5, 4, 'center', '#059669');
    ctx.restore();
    spaced(0);
    ctx.textBaseline = 'alphabetic';
  }

  // Signature and note.
  const signY = H - 230;
  if (signatureImage) drawContained(ctx, signatureImage, W - M - 360, signY - 110, 340, 100);
  rule(signY, '#cbd5e1', W - M - 380, W - M, 2);
  const signer = data.signature?.name || data.institution.name;
  const role = data.signature?.title ? `${data.signature.title} · Authorised signatory` : 'Authorised signatory';
  font(20, 600);
  text(fit(ctx, signer, 380), W - M - 190, signY + 34, 'center', INK);
  font(18);
  text(fit(ctx, role, 380), W - M - 190, signY + 62, 'center', MUTED);

  font(19);
  text(
    signatureImage ? 'This receipt is computer-generated.' : 'This receipt is computer-generated and valid without a signature.',
    M,
    signY + 34,
    'left',
    MUTED,
  );
  font(19, 400, 'italic');
  const closing = status === 'paid' ? 'Fee paid in full. Thank you.' : fee.paidNpr > 0 ? 'Payment received with thanks.' : 'Please pay by the due date.';
  text(closing, M, signY + 62, 'left', BODY);

  // Footer band.
  ctx.fillStyle = brand;
  ctx.fillRect(0, H - 76, W, 76);
  font(19, 500);
  ctx.textBaseline = 'middle';
  text(data.institution.name, M, H - 38, 'left', '#ffffff');
  text('Issued through Prepyo  ·  prepyo.online', W - M, H - 38, 'right', 'rgba(255,255,255,0.85)');
  ctx.textBaseline = 'alphabetic';
  return canvas;
}

/**
 * A one-page PDF holding one JPEG that fills an A4 page. The PDF is built by hand:
 * a catalog, a page tree, one page, the image and the content stream that draws it.
 */
export function jpegToPdf(jpeg: Uint8Array, widthPx: number, heightPx: number): Uint8Array<ArrayBuffer> {
  const pageW = 595.28;
  const pageH = 841.89;
  const enc = new TextEncoder();
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;

  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, body: () => void) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body();
    push('\nendobj\n');
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  object(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  object(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  object(3, () =>
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
  );
  object(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    push('\nendstream');
  });
  object(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));

  const xref = length;
  push(`xref\n0 6\n0000000000 65535 f \n`);
  for (let n = 1; n <= 5; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** Draws the receipt and saves it as a PDF named after the student. */
export async function downloadFeeReceipt(data: ReceiptData): Promise<void> {
  const canvas = await drawReceipt(data);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('The receipt could not be made.');
  const pdf = jpegToPdf(new Uint8Array(await blob.arrayBuffer()), W, H);
  const url = URL.createObjectURL(new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `fee-receipt-${data.student.username}-${todayIso()}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
