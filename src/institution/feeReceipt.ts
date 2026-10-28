// A student's fee receipt as a one-page A4 PDF: drawn on a canvas in the institution's
// colours with its logo, then wrapped in a minimal PDF around one JPEG image.

export interface ReceiptData {
  institution: { name: string; code: string; logoUrl?: string; brandColor: string };
  student: { name: string; username: string; course: string; batch: string };
  fee: { set: boolean; totalNpr: number; discountNpr: number; paidNpr: number; balanceNpr: number; dueOn: string | null; overdue: boolean };
  // The latest payment, if any.
  lastPayment: { receiptNo: number; paidOn: string; method: string } | null;
  // Rs 1,25,000
  rupees: (amount: number) => string;
}

// A4 at 150 dots per inch.
const W = 1240;
const H = 1754;
const MARGIN = 120;

const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e5e7eb';

const STATUS = {
  paid: { label: 'PAID IN FULL', ink: '#047857', fill: '#ecfdf5', edge: '#6ee7b7' },
  received: { label: 'PAYMENT RECEIVED', ink: '#047857', fill: '#ecfdf5', edge: '#6ee7b7' },
  partly: { label: 'PARTLY PAID', ink: '#b45309', fill: '#fffbeb', edge: '#fcd34d' },
  due: { label: 'DUE', ink: '#b45309', fill: '#fffbeb', edge: '#fcd34d' },
  overdue: { label: 'OVERDUE', ink: '#be123c', fill: '#fff1f2', edge: '#fda4af' },
  none: { label: 'NO FEE SET', ink: '#475569', fill: '#f1f5f9', edge: '#cbd5e1' },
} as const;

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

// Draws an image inside a box, keeping its shape, centred on (cx, top).
function drawContained(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, top: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, cx - w / 2, top + (maxH - h) / 2, w, h);
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

/** Draws the receipt and returns the canvas. */
export async function drawReceipt(data: ReceiptData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the receipt.');

  const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  const set = (size: number, weight = 400, style = '') => (ctx.font = `${style} ${weight} ${size}px ${font}`.trim());
  const brand = /^#[0-9a-f]{6}$/i.test(data.institution.brandColor) ? data.institution.brandColor : '#1d4ed8';

  const [logo, prepyo] = await Promise.all([
    data.institution.logoUrl ? loadImage(new URL(data.institution.logoUrl, window.location.origin).href) : Promise.resolve(null),
    loadImage('/prepyo-mark.webp'),
  ]);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  // A thin band in the institution's colour along the top.
  ctx.fillStyle = brand;
  ctx.fillRect(0, 0, W, 10);

  // Prepyo, top left.
  if (prepyo) ctx.drawImage(prepyo, 56, 44, 44, 44);
  set(26, 700);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('prepyo', prepyo ? 110 : 56, 67);

  // The institution's logo, centred, or its initials in its colour.
  const cx = W / 2;
  let y = 110;
  if (logo) {
    drawContained(ctx, logo, cx, y, 360, 150);
  } else {
    ctx.fillStyle = brand;
    ctx.beginPath();
    ctx.arc(cx, y + 75, 72, 0, Math.PI * 2);
    ctx.fill();
    set(56, 700);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(initials(data.institution.name), cx, y + 77);
  }
  y += 190;

  ctx.textAlign = 'center';
  set(30, 600);
  ctx.fillStyle = brand;
  ctx.fillText(data.institution.name.toUpperCase(), cx, y);
  y += 78;
  set(60, 700);
  ctx.fillStyle = INK;
  ctx.fillText('Fee Receipt', cx, y);
  y += 62;
  set(28, 600);
  const receiptNo = data.lastPayment ? `${data.institution.code.toUpperCase()}-${data.lastPayment.receiptNo}` : '—';
  ctx.fillText(`Receipt #: ${receiptNo}`, cx, y);
  y += 42;
  ctx.fillText(`Date: ${dmy(todayIso())}`, cx, y);
  y += 50;

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y);
  ctx.lineTo(W - MARGIN, y);
  ctx.stroke();
  y += 24;

  // The logo again, faint, behind the details.
  if (logo) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    drawContained(ctx, logo, cx, y + 120, 640, 640);
    ctx.restore();
  }

  const { fee, rupees } = data;
  const rows: [string, string][] = [
    ['Student Name', data.student.name],
    ['Username', data.student.username],
    ['Course', data.student.course || '—'],
    ['Batch', data.student.batch || '—'],
    ['Course Fee', fee.set ? rupees(fee.totalNpr) : 'Not set'],
    ['Discount', fee.set ? rupees(fee.discountNpr) : '—'],
    ['Fee After Discount', fee.set ? rupees(fee.totalNpr - fee.discountNpr) : '—'],
    ['Total Paid', rupees(fee.paidNpr)],
    ['Balance', fee.set ? (fee.balanceNpr < 0 ? `${rupees(-fee.balanceNpr)} extra` : rupees(fee.balanceNpr)) : '—'],
    ['Due Date', fee.dueOn ? dmy(fee.dueOn) : '—'],
    ['Last Payment', data.lastPayment ? `${dmy(data.lastPayment.paidOn)} · ${data.lastPayment.method}` : '—'],
  ];

  const rowH = 76;
  for (const [label, value] of rows) {
    const mid = y + rowH / 2;
    set(28, 400);
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(label, MARGIN, mid);
    set(28, 600);
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(value, W - MARGIN, mid);
    y += rowH;
    ctx.strokeStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(MARGIN, y);
    ctx.lineTo(W - MARGIN, y);
    ctx.stroke();
  }

  // Fee status with its tag.
  const status = STATUS[receiptStatus(fee)];
  const mid = y + rowH / 2;
  set(28, 400);
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'left';
  ctx.fillText('Fee Status', MARGIN, mid);
  set(24, 700);
  const tagW = ctx.measureText(status.label).width + 48;
  roundRect(ctx, W - MARGIN - tagW, mid - 26, tagW, 52, 10);
  ctx.fillStyle = status.fill;
  ctx.fill();
  ctx.strokeStyle = status.edge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = status.ink;
  ctx.textAlign = 'center';
  ctx.fillText(status.label, W - MARGIN - tagW / 2, mid + 1);
  y += rowH + 40;

  // Dashed rule, then who issued it.
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(MARGIN, y);
  ctx.lineTo(W - MARGIN, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 60;

  ctx.textAlign = 'center';
  set(28, 700);
  ctx.fillStyle = INK;
  ctx.fillText(`${data.institution.name} (Admin)`, cx, y);
  y += 40;
  set(22, 400);
  ctx.fillStyle = MUTED;
  ctx.fillText('Official computer-generated fee receipt', cx, y);
  y += 44;
  set(22, 600, 'italic');
  ctx.fillStyle = INK;
  const closing =
    receiptStatus(fee) === 'paid' ? '*Fee paid in full. Thank you.*' : fee.paidNpr > 0 ? '*Payment received with thanks.*' : '*Please pay by the due date.*';
  ctx.fillText(closing, cx, y);

  set(20, 400);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Issued through Prepyo · prepyo.online', cx, H - 60);
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
