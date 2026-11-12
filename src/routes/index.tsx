import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LocateFixed, Plus } from "lucide-react";
import { toast } from "sonner";

import { AddReportSheet } from "@/components/app/AddReportSheet";
import { FilterBar } from "@/components/app/FilterBar";
import { ReportSheet } from "@/components/app/ReportSheet";
import { ReportsMap, type ReportsMapHandle } from "@/components/app/ReportsMap";
import { REPORT_STATUSES, STATUS_META, asStatus, productsQuery, reportsQuery } from "@/lib/reports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "وين راهي؟ — خريطة توفر السلع والأسعار في الجزائر" },
      {
        name: "description",
        content:
          "شوف وين كاين البطاطا، الزيت، الحليب، السميد، السيولة والدواء قرب منك، وشارك بلاغك في ثواني.",
      },
      { property: "og:title", content: "وين راهي؟ — خريطة توفر السلع في الجزائر" },
      {
        property: "og:description",
        content: "خريطة تشاركية لتوفر السلع والأسعار والطوابير قرب منك في الجزائر.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const mapRef = useRef<ReportsMapHandle>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  const { data: products = [] } = useQuery(productsQuery);
  const { data: reports = [], isError } = useQuery(reportsQuery);

  const iconByName = useMemo(() => new Map(products.map((p) => [p.name, p.icon])), [products]);
  const iconFor = useCallback((name: string) => iconByName.get(name) ?? "🛒", [iconByName]);

  const visible = useMemo(
    () => (filter ? reports.filter((r) => r.product_name === filter) : reports),
    [reports, filter],
  );
  const counts = useMemo(() => {
    const c = { available: 0, queue: 0, empty: 0 };
    for (const r of visible) c[asStatus(r.status)]++;
    return c;
  }, [visible]);
  const selected = reports.find((r) => r.id === selectedId) ?? null;

  const requestLocation = useCallback((fly: boolean) => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(p);
        if (fly) mapRef.current?.flyTo(p[0], p[1], 15);
      },
      () => {
        if (fly) toast.error("فعّل خدمة الموقع (GPS) باش نلقاوك على الخريطة");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    requestLocation(false);
  }, [requestLocation]);

  useEffect(() => {
    if (isError) toast.error("ما قدرناش نجيبو البلاغات، تحقق من الإنترنت");
  }, [isError]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-muted">
      <div className="absolute inset-0 isolate z-0">
        <ReportsMap
          ref={mapRef}
          reports={visible}
          iconFor={iconFor}
          selectedId={selectedId}
          userPosition={userPos}
          onSelect={setSelectedId}
        />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto mx-4 mb-3 flex items-center justify-between rounded-2xl glass px-4 py-2.5 shadow-float">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="" width={32} height={32} className="size-8 rounded-lg" />
            <div>
              <h1 className="text-lg font-extrabold leading-tight text-foreground">وين راهي؟</h1>
              <p className="text-[11px] leading-tight text-muted-foreground">
                السلع والأسعار قرب منك
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            {visible.length} بلاغ
          </div>
        </div>
        <div className="pointer-events-auto">
          <FilterBar products={products} value={filter} onChange={setFilter} />
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex flex-col gap-1 rounded-2xl glass px-3 py-2 text-xs font-semibold shadow-float">
          {REPORT_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", STATUS_META[s].dot)} />
              <span className="flex-1">{STATUS_META[s].label}</span>
              <span className="text-muted-foreground">{counts[s]}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setAddOpen(true)}
          aria-label="إضافة بلاغ جديد"
          className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-fab ring-4 ring-background transition-transform active:scale-90"
        >
          <Plus className="size-8" strokeWidth={2.75} />
        </button>

        <button
          onClick={() => requestLocation(true)}
          aria-label="موقعي"
          className="pointer-events-auto flex size-12 items-center justify-center rounded-2xl glass text-primary shadow-float active:scale-95"
        >
          <LocateFixed className="size-5" />
        </button>
      </div>

      <ReportSheet
        report={selected}
        icon={selected ? iconFor(selected.product_name) : "🛒"}
        onClose={() => setSelectedId(null)}
      />
      <AddReportSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        products={products}
        defaultProductName={filter}
        fallbackCenter={() => userPos ?? mapRef.current?.getCenter() ?? [36.7538, 3.0588]}
        onCreated={(r) => {
          if (filter && filter !== r.product_name) setFilter(null);
          mapRef.current?.flyTo(r.latitude, r.longitude, 16);
          setSelectedId(r.id);
        }}
      />
    </main>
  );
}
