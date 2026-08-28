import { useCallback, useEffect, useState } from "react";
import type { Order } from "../types";
import { seedDemo } from "./seed";

const KEY = "itemku_dash_orders_v2";
const THEME_KEY = "itemku_dash_theme";

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Order[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If there are old demo orders, clear them to start at 0
        const isDemo = parsed.some((o) => o.id.startsWith("ord-") || o.id.startsWith("tk-"));
        if (isDemo) {
          localStorage.setItem(KEY, JSON.stringify([]));
          return [];
        }
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  localStorage.setItem(KEY, JSON.stringify([]));
  return [];
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(loadOrders);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(orders));
  }, [orders]);

  const addOrders = useCallback((incoming: Order[]) => {
    setOrders((prev) => [...prev, ...incoming]);
  }, []);

  const addOrder = useCallback((o: Order) => {
    setOrders((prev) => [...prev, o]);
  }, []);

  const removeOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const resetDemo = useCallback(() => {
    setOrders(seedDemo());
  }, []);

  const clearAll = useCallback(() => {
    setOrders([]);
  }, []);

  return { orders, addOrders, addOrder, removeOrder, resetDemo, clearAll };
}

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
