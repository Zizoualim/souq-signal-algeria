import { cn } from "@/lib/utils";
import type { Product } from "@/lib/reports";

type Props = {
  products: Product[];
  value: string | null;
  onChange: (productName: string | null) => void;
  loading?: boolean;
};

export function FilterBar({ products, value, onChange, loading = false }: Props) {
  const items: { key: string | null; label: string; icon: string }[] = [
    { key: null, label: "الكل", icon: "🗺️" },
    ...products.map((p) => ({ key: p.name, label: p.name, icon: p.icon })),
  ];
  return (
    <div
      role="tablist"
      aria-label="تصفية حسب السلعة"
      className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {items.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key ?? "all"}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold shadow-float transition-all active:scale-95",
              active
                ? "border-transparent bg-gradient-primary text-primary-foreground"
                : "glass border-border text-foreground",
            )}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
      {loading &&
        products.length === 0 &&
        [0, 1, 2, 3].map((i) => (
          <span
            key={`skeleton-${i}`}
            aria-hidden
            className="h-9 w-24 shrink-0 animate-pulse rounded-full glass shadow-float"
          />
        ))}
    </div>
  );
}
