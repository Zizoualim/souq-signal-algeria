import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crosshair, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import {
  REPORT_STATUSES,
  STATUS_META,
  newReportSchema,
  type Product,
  type Report,
  type ReportStatus,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  defaultProductName: string | null;
  fallbackCenter: () => [number, number];
  onCreated: (report: Report) => void;
};

type GeoState =
  | { kind: "locating" }
  | { kind: "gps"; lat: number; lng: number; accuracy: number }
  | { kind: "fallback"; lat: number; lng: number };

export function AddReportSheet({
  open,
  onOpenChange,
  products,
  defaultProductName,
  fallbackCenter,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [geo, setGeo] = useState<GeoState>({ kind: "locating" });
  const [error, setError] = useState<string | null>(null);

  const locate = () => {
    setGeo({ kind: "locating" });
    if (!("geolocation" in navigator)) {
      const [lat, lng] = fallbackCenter();
      setGeo({ kind: "fallback", lat, lng });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          kind: "gps",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => {
        const [lat, lng] = fallbackCenter();
        setGeo({ kind: "fallback", lat, lng });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    const preset = products.find((p) => p.name === defaultProductName);
    setProductId(preset?.id ?? null);
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const create = useMutation({
    mutationFn: async () => {
      const product = products.find((p) => p.id === productId);
      if (geo.kind === "locating") throw new Error("انتظر حتى نحدد موقعك");
      const parsed = newReportSchema.safeParse({
        product_id: productId ?? "",
        product_name: product?.name ?? "",
        shop_name: shopName,
        price: price.trim() === "" ? null : Number(price.replace(",", ".")),
        status: status ?? "",
        latitude: geo.lat,
        longitude: geo.lng,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "تحقق من البيانات");
      const { data, error } = await supabase.from("reports").insert(parsed.data).select().single();
      if (error) throw new Error("ما قدرناش نضيفو البلاغ، عاود جرب");
      return data;
    },
    onSuccess: (report) => {
      queryClient.setQueryData<Report[]>(["reports"], (old) => [report, ...(old ?? [])]);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("تمت إضافة البلاغ، يعطيك الصحة! 🌿");
      setShopName("");
      setPrice("");
      setStatus(null);
      onOpenChange(false);
      onCreated(report);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-lg border-none">
        <form
          dir="rtl"
          className="overflow-y-auto px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            create.mutate();
          }}
        >
          <DrawerTitle className="text-xl font-bold">بلاغ جديد</DrawerTitle>
          <DrawerDescription className="mt-1">ساعد جيرانك: واش كاين وبقداش؟</DrawerDescription>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-bold">السلعة</legend>
            <div className="grid grid-cols-3 gap-2">
              {products.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProductId(p.id)}
                  aria-pressed={productId === p.id}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-xs font-semibold transition-all active:scale-95",
                    productId === p.id
                      ? "border-primary bg-primary-soft text-accent-foreground"
                      : "border-border bg-card",
                  )}
                >
                  <span className="text-2xl" aria-hidden>
                    {p.icon}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold">اسم المحل أو الحي</span>
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="مثلاً: حانوت عمي السعيد، باب الزوار"
              maxLength={120}
              className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold">
              السعر بالدينار <span className="font-normal text-muted-foreground">(اختياري)</span>
            </span>
            <div className="relative">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="h-12 w-full rounded-2xl border border-input bg-card px-4 pe-14 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-sm font-bold text-muted-foreground">
                DA
              </span>
            </div>
          </label>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-bold">الحالة</legend>
            <div className="grid grid-cols-3 gap-2">
              {REPORT_STATUSES.map((s) => {
                const meta = STATUS_META[s];
                const active = status === s;
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatus(s)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-12 items-center justify-center gap-1.5 rounded-2xl border-2 text-sm font-bold transition-all active:scale-95",
                      active ? cn("border-transparent", meta.badge) : "border-border bg-card",
                    )}
                  >
                    <span className={cn("size-2.5 rounded-full", meta.dot)} />
                    {s === "empty" ? "نفدت" : meta.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-muted p-3 text-sm">
            {geo.kind === "locating" ? (
              <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
            ) : geo.kind === "gps" ? (
              <LocateFixed className="size-5 shrink-0 text-primary" aria-hidden />
            ) : (
              <Crosshair className="size-5 shrink-0 text-status-queue" aria-hidden />
            )}
            <span className="flex-1">
              {geo.kind === "locating" && "جاري تحديد موقعك…"}
              {geo.kind === "gps" && `تم تحديد موقعك بدقة ±${Math.round(geo.accuracy)} م`}
              {geo.kind === "fallback" &&
                "ما قدرناش نوصلو للـGPS، سنستعمل وسط الخريطة كموقع للبلاغ"}
            </span>
            {geo.kind !== "locating" && (
              <button type="button" onClick={locate} className="text-xs font-bold text-primary">
                إعادة
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={create.isPending || geo.kind === "locating"}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-fab transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {create.isPending && <Loader2 className="size-5 animate-spin" aria-hidden />}
            نشر البلاغ
          </button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
