"""Pure-python technical indicators used to build the strategy checklist."""
from __future__ import annotations

from tradepilot.domain import Bar


def ema(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    k = 2 / (period + 1)
    e = values[0]
    for v in values[1:]:
        e = v * k + e * (1 - k)
    return e


def rsi(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    gains, losses = 0.0, 0.0
    for i in range(-period, 0):
        diff = closes[i] - closes[i - 1]
        if diff >= 0:
            gains += diff
        else:
            losses -= diff
    avg_gain = gains / period
    avg_loss = losses / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def atr(bars: list[Bar], period: int = 14) -> float | None:
    if len(bars) < period + 1:
        return None
    trs = []
    for i in range(1, len(bars)):
        h, l, pc = bars[i].high, bars[i].low, bars[i - 1].close
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    return sum(trs[-period:]) / period


def vwap(bars: list[Bar]) -> float | None:
    if not bars:
        return None
    pv = sum(((b.high + b.low + b.close) / 3) * b.volume for b in bars)
    vol = sum(b.volume for b in bars)
    return pv / vol if vol else None


def volume_ratio(bars: list[Bar], lookback: int = 20) -> float | None:
    if len(bars) < lookback + 1:
        return None
    avg = sum(b.volume for b in bars[-lookback - 1:-1]) / lookback
    return bars[-1].volume / avg if avg else None


def candle_body_ratio(bar: Bar) -> float:
    rng = bar.high - bar.low
    if rng <= 0:
        return 0.0
    return abs(bar.close - bar.open) / rng


def prev_high(bars: list[Bar], lookback: int = 20) -> float | None:
    if len(bars) < lookback + 1:
        return None
    return max(b.high for b in bars[-lookback - 1:-1])
