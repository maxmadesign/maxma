import { describe, it, expect } from "vitest";
import { ACTION_TONES, RISK_TONES, AGENT_STATUS_TONES, PROVIDER_CHART_COLOR } from "@/lib/semantic";
import { fmtUsd, fmtPct } from "@/lib/utils";
import { dictionaries } from "@pkg/i18n";

describe("semantic tokens", () => {
  it("maps core trade actions to emerald/rose/slate", () => {
    expect(ACTION_TONES.buy.dot).toContain("emerald");
    expect(ACTION_TONES.sell.dot).toContain("rose");
    expect(ACTION_TONES.hold.dot).toContain("slate");
  });
  it("kill switch risk tone is high-danger red", () => {
    expect(RISK_TONES.kill_switch.badge).toContain("red");
  });
  it("thinking agent status pulses", () => {
    expect(AGENT_STATUS_TONES.thinking.badge).toContain("animate-pulseSoft");
  });
  it("each provider has a distinct chart colour", () => {
    const colors = Object.values(PROVIDER_CHART_COLOR);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("formatting", () => {
  it("formats usd and pct", () => {
    expect(fmtUsd(1234.5)).toBe("$1,234.50");
    expect(fmtPct(2.5)).toBe("+2.50%");
    expect(fmtPct(-1)).toBe("-1.00%");
  });
});

describe("i18n", () => {
  it("has zh-CN and en-US with matching top-level keys", () => {
    expect(Object.keys(dictionaries["zh-CN"]).sort()).toEqual(Object.keys(dictionaries["en-US"]).sort());
    expect(dictionaries["zh-CN"].nav.dashboard).toBe("模拟盘总览");
    expect(dictionaries["en-US"].nav.dashboard).toBe("Dashboard");
  });
});
