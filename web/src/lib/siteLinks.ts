/** Shared outbound links for the site */
export const PAYPAL_DONATE_URL = 'https://www.paypal.com/paypalme/sachta2023';

export const EMPOWER_AFFILIATE_ID = '294';
export const EMPOWER_BILLING_URL = `https://billing.empowerservers.com/aff.php?aff=${EMPOWER_AFFILIATE_ID}`;

export function empowerGameUrl(game: 'reforger' | 'arma3'): string {
  return `/api/click/empower?game=${game}`;
}

export function empowerDirectUrl(game: 'reforger' | 'arma3'): string {
  return game === 'arma3'
    ? `https://empowerservers.com/games/arma3/?aff=${EMPOWER_AFFILIATE_ID}`
    : `https://empowerservers.com/games/arma-reforger/?aff=${EMPOWER_AFFILIATE_ID}`;
}
