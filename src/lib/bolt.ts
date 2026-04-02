const BOLT_API_URL = process.env.BOLT_API_URL ?? '';
const BOLT_API_KEY = process.env.BOLT_API_KEY ?? '';

function boltFetch(path: string, options?: RequestInit) {
  return fetch(`${BOLT_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BOLT_API_KEY,
      ...(options?.headers ?? {}),
    },
    // Don't cache — always fetch live data
    cache: 'no-store',
  });
}

export interface BoltTransaction {
  id: number;
  type: 'spend' | 'refill';
  amount_sats: number;
  description: string | null;
  created_at: number;
}

export interface BoltCard {
  id: number;
  card_id: string | null;
  programmed: boolean;
  enabled: boolean;
  uid: string | null;
  tx_max_sats: number;
  day_max_sats: number;
}

export interface BoltUser {
  id: number;
  username: string;
  display_name: string;
  balance_sats: number;
  ln_address: string | null;
  magic_link_url: string;
  card: BoltCard | null;
  transactions: BoltTransaction[];
}

export async function createBoltUser(tskId: string, displayName: string): Promise<{ id: number; magic_link_url: string }> {
  const res = await boltFetch('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify({ username: tskId.toLowerCase(), display_name: displayName }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bolt createUser ${res.status}: ${body}`);
  }
  return res.json();
}

export async function createBoltCard(boltUserId: number, cardId: string): Promise<{ id: number; setup_token: string }> {
  const res = await boltFetch(`/api/v1/users/${boltUserId}/card`, {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bolt createCard ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getBoltUser(boltUserId: string): Promise<BoltUser | null> {
  try {
    const res = await boltFetch(`/api/v1/users/${boltUserId}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
