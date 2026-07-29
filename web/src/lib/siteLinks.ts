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

export const NITRADO_AFFILIATE_URL = 'https://www.nitrado-aff.com/5M99TRH/D42TT/';

export const GTXGAMING_AFFILIATE_URL = 'https://www.gtxgaming.co.uk/clientarea/aff.php?aff=4282';
export const PINGPERFECT_AFFILIATE_URL = 'https://pingperfect.com/aff.php?aff=2133';

export function nitradoClickUrl(): string {
  return '/api/click/nitrado';
}

export function gtxgamingClickUrl(): string {
  return '/api/click/gtxgaming';
}

export function pingperfectClickUrl(): string {
  return '/api/click/pingperfect';
}
