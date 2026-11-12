import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];

export const REPORT_STATUSES = ["available", "queue", "empty"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const STATUS_META: Record<
  ReportStatus,
  { label: string; emoji: string; dot: string; badge: string }
> = {
  available: {
    label: "متوفر",
    emoji: "✅",
    dot: "bg-status-available",
    badge: "bg-status-available-soft text-status-available",
  },
  queue: {
    label: "طابور",
    emoji: "⏳",
    dot: "bg-status-queue",
    badge: "bg-status-queue-soft text-status-queue",
  },
  empty: {
    label: "نفدت الكمية",
    emoji: "⛔",
    dot: "bg-status-empty",
    badge: "bg-status-empty-soft text-status-empty",
  },
};

export function asStatus(value: string): ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value)
    ? (value as ReportStatus)
    : "available";
}

/** Default map center: Algiers. */
export const ALGIERS: [number, number] = [36.7538, 3.0588];

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data;
  },
  staleTime: 1000 * 60 * 10,
});

export const reportsQuery = queryOptions({
  queryKey: ["reports"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data;
  },
  refetchInterval: 30_000,
});

export const newReportSchema = z.object({
  product_id: z.string().uuid({ message: "اختر السلعة" }),
  product_name: z.string().min(1),
  shop_name: z
    .string()
    .trim()
    .min(2, { message: "اكتب اسم المحل أو الحي" })
    .max(120, { message: "الاسم طويل بزاف" }),
  price: z
    .number({ invalid_type_error: "السعر غير صحيح" })
    .min(0, { message: "السعر لا يمكن أن يكون سالباً" })
    .max(9_999_999)
    .nullable(),
  status: z.enum(REPORT_STATUSES, { errorMap: () => ({ message: "اختر الحالة" }) }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type NewReport = z.infer<typeof newReportSchema>;

export function formatPrice(price: number | null) {
  if (price == null) return "—";
  return `${new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(price)} DA`;
}

const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

export function timeAgo(iso: string, now: number = Date.now()) {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "الآن";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

/** Reports older than this are shown faded on the map. */
export const STALE_AFTER_MS = 1000 * 60 * 60 * 12;

export const APP_URL = "https://win-rahi.dz";

export function shareMessage(report: Report, price: number | null) {
  const priceText = price == null ? "" : ` بسعر ${formatPrice(price)}`;
  return `السلعة متوفرة الآن عند ${report.shop_name}${priceText} - شاهد الموقع على تطبيق وين راهي ${APP_URL}`;
}

export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
