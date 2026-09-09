export const PAYMENT_ACCOUNT = {
  name: 'Saurabh Thakulla',
  phone: '9744711464',
};

export const PAYMENT_QR_INCLUDE_AMOUNT = false;

export interface PaymentMethod {
  id: string;
  label: string;
  short: string;
  gateway: string;
  accent: string;
  hint: string;
  buildQrPayload?: (amountNPR: number) => string;
  qrImage?: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'esewa',
    label: 'eSewa',
    short: 'eS',
    gateway: 'ESEWA',
    accent: '#60BB46',
    hint: 'Open eSewa → Scan QR → confirm the amount.',
    buildQrPayload: amountNPR =>
      JSON.stringify(
        PAYMENT_QR_INCLUDE_AMOUNT
          ? { eSewa_id: PAYMENT_ACCOUNT.phone, name: PAYMENT_ACCOUNT.name, amount: String(amountNPR) }
          : { eSewa_id: PAYMENT_ACCOUNT.phone, name: PAYMENT_ACCOUNT.name },
      ),
    qrImage: '/images/payment-qr-esewa.png',
  },
  {
    id: 'khalti',
    label: 'Khalti',
    short: 'Kh',
    gateway: 'KHALTI',
    accent: '#E5233D',
    hint: 'Open Khalti → Scan QR → confirm the amount.',
    qrImage: '/images/payment-qr-khalti.png',
  },
];
