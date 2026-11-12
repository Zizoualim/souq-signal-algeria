import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type * as Leaflet from "leaflet";

import { ALGIERS, STALE_AFTER_MS, asStatus, type Report } from "@/lib/reports";

export type ReportsMapHandle = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  getCenter: () => [number, number];
};

type Props = {
  reports: Report[];
  iconFor: (productName: string) => string;
  selectedId: string | null;
  userPosition: [number, number] | null;
  onSelect: (id: string | null) => void;
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export const ReportsMap = forwardRef<ReportsMapHandle, Props>(function ReportsMap(
  { reports, iconFor, selectedId, userPosition, onSelect },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const userMarkerRef = useRef<Leaflet.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const readyRef = useRef(false);
  const latestRef = useRef({ reports, iconFor, selectedId, userPosition });
  latestRef.current = { reports, iconFor, selectedId, userPosition };
  const centeredOnUser = useRef(false);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 15) => mapRef.current?.flyTo([lat, lng], zoom, { duration: 0.8 }),
    getCenter: () => {
      const c = mapRef.current?.getCenter();
      return c ? [c.lat, c.lng] : ALGIERS;
    },
  }));

  const renderMarkers = () => {
    const L = LRef.current;
    const layer = layerRef.current;
    if (!L || !layer) return;
    const { reports, iconFor, selectedId } = latestRef.current;
    layer.clearLayers();
    const now = Date.now();
    for (const r of reports) {
      const status = asStatus(r.status);
      const stale = now - new Date(r.created_at).getTime() > STALE_AFTER_MS;
      const icon = L.divIcon({
        className: "",
        iconSize: [36, 44],
        iconAnchor: [18, 42],
        html: `<div class="wr-pin" data-status="${status}" data-stale="${stale}" data-active="${r.id === selectedId}"><div class="wr-pin__body"></div><div class="wr-pin__icon">${escapeHtml(iconFor(r.product_name))}</div></div>`,
      });
      const marker = L.marker([r.latitude, r.longitude], {
        icon,
        title: `${r.product_name} — ${r.shop_name}`,
        zIndexOffset: r.id === selectedId ? 1000 : 0,
      });
      marker.on("click", () => onSelectRef.current(r.id));
      marker.addTo(layer);
    }
  };

  const renderUser = () => {
    const L = LRef.current;
    const map = mapRef.current;
    const pos = latestRef.current.userPosition;
    if (!L || !map || !pos) return;
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(pos, {
        icon: L.divIcon({
          className: "",
          html: '<div class="wr-user-dot"></div>',
          iconSize: [18, 18],
        }),
        interactive: false,
        zIndexOffset: -100,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(pos);
    }
    if (!centeredOnUser.current) {
      centeredOnUser.current = true;
      map.setView(pos, 14);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      LRef.current = L;
      map = L.map(containerRef.current, {
        center: latestRef.current.userPosition ?? ALGIERS,
        zoom: 13,
        zoomControl: false,
        attributionControl: true,
      });
      map.attributionControl.setPrefix(false);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      map.on("click", () => onSelectRef.current(null));
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      readyRef.current = true;
      if (latestRef.current.userPosition) centeredOnUser.current = true;
      renderMarkers();
      renderUser();
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
      userMarkerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (readyRef.current) renderMarkers();
  }, [reports, selectedId, iconFor]);

  useEffect(() => {
    if (readyRef.current) renderUser();
  }, [userPosition]);

  return <div ref={containerRef} className="absolute inset-0" aria-label="خريطة البلاغات" />;
});
