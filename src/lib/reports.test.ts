import { describe, expect, it } from "vitest";

import { APP_URL, googleMapsUrl, newReportSchema, shareMessage } from "./reports";

const base = {
  product_id: "8b0e7c2e-6a3f-4c5f-9d0e-2b1a3c4d5e6f",
  product_name: "بطاطا",
  shop_name: "سوق باب الواد",
  price: 85,
  status: "available",
  latitude: 36.75,
  longitude: 3.05,
};

describe("new report rules", () => {
  it("accepts only the three statuses: available, queue, empty", () => {
    for (const status of ["available", "queue", "empty"]) {
      expect(newReportSchema.safeParse({ ...base, status }).success).toBe(true);
    }
    expect(newReportSchema.safeParse({ ...base, status: "unknown" }).success).toBe(false);
  });

  it("rejects a negative price in DA", () => {
    expect(newReportSchema.safeParse({ ...base, price: -5 }).success).toBe(false);
  });

  it("requires a shop or neighbourhood name", () => {
    expect(newReportSchema.safeParse({ ...base, shop_name: " " }).success).toBe(false);
  });
});

describe("share and directions", () => {
  it("builds the share text with shop, price in دج and the app link", () => {
    expect(shareMessage({ shop_name: "سوق باب الواد", price: 85 })).toBe(
      "السلعة متوفرة الآن عند سوق باب الواد بسعر 85 دج - شاهد الموقع على تطبيق وين راهي https://souq-signal-algeria.lovable.app",
    );
  });

  it("shares the published app address", () => {
    expect(APP_URL).toBe("https://souq-signal-algeria.lovable.app");
  });

  it("opens Google Maps directions to the shop coordinates", () => {
    expect(googleMapsUrl(36.75, 3.05)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=36.75,3.05",
    );
  });
});
