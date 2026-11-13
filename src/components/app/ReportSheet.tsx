import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Copy, MapPin, Navigation, Share2, Store } from "lucide-react";
import { toast } from "sonner";

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_META,
  asStatus,
  formatPrice,
  shareMessage,
  googleMapsUrl,
  APP_URL,
  timeAgo,
  type Report,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

const VOTES_KEY = "wr-votes";

function readVotes(): Record<string, "up" | "down"> {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) ?? "{}") as Record<string, "up" | "down">;
  } catch {
    return {};
  }
}

type Props = {
  report: Report | null;
  icon: string;
  onClose: () => void;
};

export function ReportSheet({ report, icon, onClose }: Props) {
  const queryClient = useQueryClient();
  const [myVote, setMyVote] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (report) setMyVote(readVotes()[report.id] ?? null);
  }, [report]);

  const vote = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: "up" | "down" }) => {
      const { data, error } = await supabase.rpc("vote_report", { _report_id: id, _kind: kind });
      if (error) throw error;
      return data;
    },
    onSuccess: (updated, { id, kind }) => {
      const votes = readVotes();
      votes[id] = kind;
      localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
      setMyVote(kind);
      queryClient.setQueryData<Report[]>(["reports"], (old) =>
        old?.map((r) => (r.id === id && updated ? { ...r, ...updated } : r)),
      );
      toast.success(kind === "up" ? "شكراً! أكدت أن السلعة موجودة" : "شكراً! سجلنا أنها نفدت");
    },
    onError: () => toast.error("ما قدرناش نسجلو صوتك، عاود جرب"),
  });

  const status = report ? asStatus(report.status) : "available";
  const meta = STATUS_META[status];

  const openInMaps = () => {
    if (!report) return;
    window.open(googleMapsUrl(report.latitude, report.longitude), "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    if (!report) return;
    const text = shareMessage(report);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ رسالة البلاغ، الصقها في أي مكان");
    } catch {
      toast.error("ما قدرناش ننسخو الرسالة، عاود جرب");
    }
  };

  const shareTo = async (target: "whatsapp" | "facebook") => {
    if (!report) return;
    const text = shareMessage(report);
    if (target === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    // Facebook ignores pre-filled text, so copy it first for the user to paste.
    try {
      await navigator.clipboard.writeText(text);
      toast.success("نسخنا نص البلاغ، الصقه في منشورك على فيسبوك");
    } catch {
      /* clipboard unavailable: the link is still shared */
    }
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const nativeShare = async () => {
    if (!report) return;
    const text = shareMessage(report);
    if (navigator.share) {
      try {
        await navigator.share({ title: `وين راهي؟ — ${report.product_name}`, text });
      } catch {
        /* user cancelled */
      }
    } else {
      await copyLink();
    }
  };

  return (
    <Drawer open={!!report} onOpenChange={(o) => !o && onClose()} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-w-lg border-none pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {report && (
          <div className="px-5 pt-4" dir="rtl">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-3xl">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <DrawerTitle className="text-xl font-bold">{report.product_name}</DrawerTitle>
                <DrawerDescription className="mt-1 flex items-center gap-1.5 text-sm">
                  <Store className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{report.shop_name}</span>
                </DrawerDescription>
              </div>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                  meta.badge,
                )}
              >
                <span className={cn("size-2 rounded-full", meta.dot)} />
                {meta.label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted p-3">
                <div className="text-xs text-muted-foreground">السعر</div>
                <div className="mt-0.5 text-lg font-extrabold" dir="ltr">
                  {formatPrice(report.price)}
                </div>
              </div>
              <div className="rounded-2xl bg-muted p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden /> وقت الإضافة
                </div>
                <div className="mt-0.5 text-lg font-bold">{timeAgo(report.created_at)}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              {report.upvotes} أكدوا التوفر · {report.downvotes} قالوا نفدت
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                disabled={vote.isPending || myVote !== null}
                onClick={() => vote.mutate({ id: report.id, kind: "up" })}
                className={cn(
                  "flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-bold transition-all active:scale-95 disabled:opacity-60",
                  myVote === "up"
                    ? "bg-status-available text-primary-foreground"
                    : "bg-status-available-soft text-status-available",
                )}
              >
                موجود فعلاً 👍
                <span className="text-sm opacity-80">{report.upvotes}</span>
              </button>
              <button
                disabled={vote.isPending || myVote !== null}
                onClick={() => vote.mutate({ id: report.id, kind: "down" })}
                className={cn(
                  "flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-bold transition-all active:scale-95 disabled:opacity-60",
                  myVote === "down"
                    ? "bg-status-empty text-destructive-foreground"
                    : "bg-status-empty-soft text-status-empty",
                )}
              >
                نفدت الكمية 👎
                <span className="text-sm opacity-80">{report.downvotes}</span>
              </button>
            </div>
            {myVote && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                سجلنا رأيك على هذا البلاغ، شكراً لمساعدتك 🌿
              </p>
            )}

            <button
              onClick={openInMaps}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-fab transition-all active:scale-[0.98]"
            >
              <Navigation className="size-5" aria-hidden />
              خذني إليه 🧭
            </button>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={nativeShare}
                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card text-sm font-bold transition-all active:scale-95"
              >
                <Share2 className="size-4" aria-hidden /> مشاركة 📲
              </button>
              <button
                onClick={() => void shareTo("whatsapp")}
                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card text-sm font-bold transition-all active:scale-95"
              >
                واتساب
              </button>
              <button
                onClick={() => void shareTo("facebook")}
                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card text-sm font-bold transition-all active:scale-95"
              >
                فيسبوك
              </button>
            </div>
            <button
              onClick={copyLink}
              className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 text-xs font-bold text-primary transition-all active:scale-95"
            >
              <Copy className="size-3.5" aria-hidden /> نسخ نص المشاركة
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
