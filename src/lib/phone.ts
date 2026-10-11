// Country codes a learner's number may arrive with: Nepal, and India for
// learners using an Indian SIM.
const COUNTRY_CODES = ['977', '91'];
const NATIONAL_DIGITS = 10;

/**
 * A phone number without its country code, the way it is written on a wallet
 * receipt: "+977 9812345678" and "919373532312" both come back as ten digits.
 *
 * Browsers autofill the international form, which is how "+91…" ended up in
 * payment requests. Anything that is not clearly a country code is left alone,
 * so a half-typed number is not chewed up while the learner is still typing.
 */
export function localPhone(raw: string): string {
  const international = /^\s*(\+|00)/.test(raw);
  let digits = raw.replace(/\D/g, '');
  if (/^\s*00/.test(raw)) digits = digits.slice(2);

  for (const code of COUNTRY_CODES) {
    if (!digits.startsWith(code)) continue;
    const national = digits.slice(code.length);
    if (national.length === NATIONAL_DIGITS || (international && national.length >= 7)) {
      return national;
    }
  }
  return international ? digits : raw.trim();
}
