import type { Order, OrderStatus } from "../types";

/**
 * Klien Tokoku API (itemku Seller Open API).
 * Docs: https://files.itemku.com/document/Tokoku+API+Docs.pdf
 *
 * Auth: JWT HS256
 * - header  : {"X-Api-Key": apiKey, "Nonce": nonce, "alg": "HS256"}
 * - payload : params yang dikirim (sama persis dengan body request)
 * - token   : base64url(header) + "." + base64url(payload) + "." + HMAC-SHA256(secret, unsignedToken)
 */

const API_URL = "https://tokoku-gateway.itemku.com/api/order/list";
const KEY_STORE = "itemku_dash_api_key";
const SECRET_STORE = "itemku_dash_api_secret";

export interface ItemkuCredentials {
  apiKey: string;
  apiSecret: string;
}

export function loadCredentials(): ItemkuCredentials {
  try {
    return {
      apiKey: localStorage.getItem(KEY_STORE) ?? "",
      apiSecret: localStorage.getItem(SECRET_STORE) ?? "",
    };
  } catch {
    return { apiKey: "", apiSecret: "" };
  }
}

export function saveCredentials(creds: ItemkuCredentials) {
  try {
    localStorage.setItem(KEY_STORE, creds.apiKey);
    localStorage.setItem(SECRET_STORE, creds.apiSecret);
  } catch {
    /* storage penuh / private mode - abaikan */
  }
}

export function clearCredentials() {
  try {
    localStorage.removeItem(KEY_STORE);
    localStorage.removeItem(SECRET_STORE);
  } catch {
    /* ignore */
  }
}

function buildAuthToken(apiKey: string, apiSecret: string, payload: object, nonce: string): Promise<string> {
  const header = { "X-Api-Key": apiKey, Nonce: nonce, alg: "HS256" };
  // jsrsasign dimuat dynamic supaya bundle utama tetap kecil
  return new Promise<string>((resolve, reject) => {
    void import("jsrsasign").then(
      (mod) => {
        try {
          const KJUR = (mod as any).KJUR;
          resolve(KJUR.jws.JWS.sign("HS256", header, payload, { utf8: apiSecret }));
        } catch (e) {
          reject(e);
        }
      },
      reject
    );
  });
}

const VALID_STATUS: OrderStatus[] = ["DELIVERED", "REQUIRE_PROCESS", "REFUNDED"];

export function mapItemkuOrder(raw: any): Order | null {
  const status = String(raw.status ?? "").toUpperCase() as OrderStatus;
  if (!VALID_STATUS.includes(status)) return null;
  const no = String(raw.order_number ?? "");
  const ts = raw.order_created_at ? new Date(raw.order_created_at).getTime() : 0;
  if (!no || !ts) return null;
  return {
    id: "tk-" + (raw.order_id ?? no) + "-" + ts,
    no,
    product: String(raw.product_name ?? "-"),
    game: String(raw.game_name ?? "-"),
    price: Number(raw.price) || 0,
    qty: Number(raw.quantity) || 1,
    income: Number(raw.order_income) || 0,
    status,
    date: new Date(ts).toISOString(),
  };
}

export interface SyncResult {
  orders: Order[];
  rawCount: number;
}

/**
 * Tarik daftar order dari itemku.
 * @param dateStart format YYYY-MM-DD, maksimal 60 hari ke belakang dari hari ini
 * @param limit 1-30 (default 10)
 */
export async function fetchItemkuOrders(
  creds: ItemkuCredentials,
  dateStart: string,
  limit: number = 30
): Promise<SyncResult> {
  const nonce = String(Math.floor(Date.now() / 1000));
  const payload = { date_start: dateStart, limit };
  const token = await buildAuthToken(creds.apiKey, creds.apiSecret, payload, nonce);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": creds.apiKey,
      Authorization: "Bearer " + token,
      Nonce: nonce,
    },
    body: JSON.stringify(payload),
  });

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error("Respons dari itemku bukan JSON (HTTP " + res.status + "). Cek API key/secret.");
  }

  if (!res.ok || json.success !== true) {
    const msg = json?.message || json?.error || "Gagal menarik data dari itemku";
    throw new Error(typeof msg === "string" ? msg : "Gagal menarik data dari itemku (HTTP " + res.status + ")");
  }

  const raw: any[] = Array.isArray(json.data) ? json.data : [];
  const orders = raw.map(mapItemkuOrder).filter((o): o is Order => o !== null);
  return { orders, rawCount: raw.length };
}
