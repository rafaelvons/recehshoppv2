import type { Order } from "../types";

const CATALOG: Array<[string, string[]]> = [
  ["Mobile Legends", ["Diamond 86", "Diamond 172", "Diamond 344", "Weekly Diamond Pass", "Twilight Pass", "Skin Starlight"]],
  ["Free Fire", ["Diamond 70", "Diamond 140", "Diamond 355", "Membership Mingguan", "Elite Pass"]],
  ["PUBG Mobile", ["UC 60", "UC 325", "UC 660", "Royale Pass"]],
  ["Genshin Impact", ["Genesis Crystal 60", "Genesis Crystal 300", "Welkin Moon"]],
  ["Google Play", ["Voucher 50rb", "Voucher 100rb", "Voucher 150rb"]],
  ["Steam Wallet", ["Wallet 50rb", "Wallet 100rb", "Wallet 200rb"]],
];

const PRICES = [25000, 48000, 90000, 149000, 24000, 39000, 68000, 110000, 195000];
const STATUSES: Order["status"][] = [
  "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED",
  "REQUIRE_PROCESS", "REFUNDED",
];

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function seedDemo(): Order[] {
  const out: Order[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let n = 0;

  for (let d = 29; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(day.getDate() - d);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const count = weekend ? 3 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const [game, products] = CATALOG[Math.floor(Math.random() * CATALOG.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const price = PRICES[Math.floor(Math.random() * PRICES.length)];
      const qty = Math.random() < 0.25 ? 2 : 1;
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const dt = new Date(day);
      dt.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0);

      out.push({
        id: uid(),
        no: "OD" + String(1000000 + n++),
        product,
        game,
        price,
        qty,
        income: Math.round((price * qty * 92) / 100),
        status,
        date: dt.toISOString(),
      });
    }
  }
  return out;
}
