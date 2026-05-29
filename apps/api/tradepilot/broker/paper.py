"""PaperBroker — full simulated execution.

Simulates fills with bid/ask spread, slippage and commissions; manages positions, cash,
bracket orders, stop-loss / take-profit / trailing-stop and time-based exits. All in-memory;
deterministic given the same market snapshots so all agents are treated identically.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from tradepilot.domain import Account, Fill, Order, Position, Trade
from tradepilot.schemas.enums import AssetType, OrderSide, OrderStatus, OrderType


COMMISSION_PER_SHARE = 0.005       # equities
OPTION_COMMISSION_PER_CONTRACT = 0.65
SLIPPAGE_BPS = 2.0                  # applied to fill price on market orders


class PaperBroker:
    is_paper = True
    live_enabled = False

    def __init__(self) -> None:
        self.open_orders: dict[str, list[Order]] = {}   # agent_id -> orders
        self.fills: list[Fill] = []
        self.trades: list[Trade] = []

    # ------------------------------------------------------------------ helpers
    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _commission(order: Order) -> float:
        if order.asset_type == AssetType.OPTION:
            return OPTION_COMMISSION_PER_CONTRACT * order.quantity
        return COMMISSION_PER_SHARE * order.quantity

    @staticmethod
    def _apply_slippage(price: float, side: OrderSide, order_type: OrderType) -> float:
        if order_type != OrderType.MARKET:
            return price
        adj = price * (SLIPPAGE_BPS / 10_000.0)
        return price + adj if side == OrderSide.LONG else price - adj

    # ------------------------------------------------------------------ orders
    def place_order(self, account: Account, order: Order, ref_price: float):
        """Simulate an immediate fill for market/limit orders at ref_price."""
        from tradepilot.broker.base import FillResult

        mult = 100.0 if order.asset_type == AssetType.OPTION else 1.0
        order.multiplier = mult

        fill_price = self._apply_slippage(ref_price, order.side, order.order_type)
        if order.order_type == OrderType.LIMIT and order.limit_price is not None:
            # only fill marketable limit orders
            if order.side == OrderSide.LONG and ref_price > order.limit_price:
                order.status = OrderStatus.SUBMITTED
                self.open_orders.setdefault(account.agent_id, []).append(order)
                return FillResult(order=order)
            fill_price = min(fill_price, order.limit_price) if order.side == OrderSide.LONG else fill_price

        commission = self._commission(order)
        is_close = self._is_closing(account, order)

        if is_close:
            pnl = self._close_position(account, order, fill_price, commission)
            order.status = OrderStatus.FILLED
            order.filled_quantity = order.quantity
            order.avg_fill_price = fill_price
            fill = self._record_fill(account, order, fill_price, commission)
            return FillResult(order=order, fill=fill, closed_trade_pnl=pnl)

        # opening / adding
        cost = fill_price * order.quantity * mult + commission
        if cost > account.cash:
            order.status = OrderStatus.REJECTED
            return FillResult(order=order)

        account.cash -= cost
        self._apply_open(account, order, fill_price)
        order.status = OrderStatus.FILLED
        order.filled_quantity = order.quantity
        order.avg_fill_price = fill_price
        account.trades_today += 1
        fill = self._record_fill(account, order, fill_price, commission)

        # open a trade record
        self.trades.append(Trade(
            id=str(uuid.uuid4()), agent_id=account.agent_id, symbol=order.symbol,
            asset_type=order.asset_type, side=order.side, quantity=order.quantity,
            entry_price=fill_price, opened_at=self._now(),
        ))
        return FillResult(order=order, fill=fill)

    def place_bracket_order(self, account: Account, order: Order, ref_price: float):
        """Bracket = entry + attached stop_loss + take_profit stored on the position."""
        result = self.place_order(account, order, ref_price)
        pos = account.positions.get(order.symbol)
        if pos is not None:
            pos.stop_loss = order.stop_loss
            pos.take_profit = order.take_profit
            pos.trailing_stop = order.trailing_stop
        return result

    def cancel_order(self, account: Account, order_id: str) -> bool:
        orders = self.open_orders.get(account.agent_id, [])
        for o in orders:
            if o.id == order_id and o.status in (OrderStatus.PENDING, OrderStatus.SUBMITTED):
                o.status = OrderStatus.CANCELLED
                orders.remove(o)
                return True
        return False

    def cancel_all(self, account: Account) -> int:
        orders = self.open_orders.get(account.agent_id, [])
        n = 0
        for o in list(orders):
            o.status = OrderStatus.CANCELLED
            orders.remove(o)
            n += 1
        return n

    # ------------------------------------------------------------------ position math
    @staticmethod
    def _is_closing(account: Account, order: Order) -> bool:
        pos = account.positions.get(order.symbol)
        if pos is None:
            return False
        # closing if order side is opposite to held side, or it's an explicit reduce/sell
        return order.side != pos.side

    def _apply_open(self, account: Account, order: Order, price: float) -> None:
        pos = account.positions.get(order.symbol)
        if pos is None:
            account.positions[order.symbol] = Position(
                symbol=order.symbol, asset_type=order.asset_type, quantity=order.quantity,
                avg_price=price, current_price=price, side=order.side,
                stop_loss=order.stop_loss, take_profit=order.take_profit,
                trailing_stop=order.trailing_stop,
                multiplier=100.0 if order.asset_type == AssetType.OPTION else 1.0,
                option_type=getattr(order, "option_type", None),
            )
        else:
            total = pos.quantity + order.quantity
            pos.avg_price = (pos.avg_price * pos.quantity + price * order.quantity) / total
            pos.quantity = total
            pos.current_price = price

    def _close_position(self, account: Account, order: Order, price: float,
                        commission: float, reason: str = "manual") -> float:
        pos = account.positions.get(order.symbol)
        if pos is None:
            return 0.0
        qty = min(order.quantity, pos.quantity)
        mult = pos.multiplier
        sign = 1 if pos.side == OrderSide.LONG else -1
        pnl = sign * (price - pos.avg_price) * qty * mult - commission
        account.cash += price * qty * mult - commission
        account.realized_pnl += pnl
        pos.quantity -= qty
        if pos.quantity <= 1e-9:
            del account.positions[order.symbol]

        # consecutive-loss tracking
        if pnl < 0:
            account.consecutive_losses += 1
        else:
            account.consecutive_losses = 0

        # close the matching trade record
        for t in reversed(self.trades):
            if t.agent_id == account.agent_id and t.symbol == order.symbol and t.closed_at is None:
                t.exit_price = price
                t.realized_pnl = pnl
                t.closed_at = self._now()
                t.reason_closed = reason
                break
        return pnl

    def _record_fill(self, account: Account, order: Order, price: float, commission: float) -> Fill:
        fill = Fill(
            id=str(uuid.uuid4()), order_id=order.id, agent_id=account.agent_id,
            symbol=order.symbol, quantity=order.quantity, price=price,
            commission=commission, timestamp=self._now(),
        )
        self.fills.append(fill)
        return fill

    # ------------------------------------------------------------------ exits (mark-to-market)
    def mark_and_check_exits(self, account: Account, prices: dict[str, float]) -> list[FillResult]:
        """Update mark prices and trigger stop-loss / take-profit / trailing-stop.

        Called every tick by the simulation engine. Returns any auto-close fills.
        """
        from tradepilot.broker.base import FillResult

        results: list[FillResult] = []
        for symbol, pos in list(account.positions.items()):
            px = prices.get(symbol)
            if px is None:
                continue
            pos.current_price = px

            # update trailing stop (long only in v1)
            if pos.trailing_stop and pos.side == OrderSide.LONG:
                new_stop = px - pos.trailing_stop
                if pos.stop_loss is None or new_stop > pos.stop_loss:
                    pos.stop_loss = new_stop

            reason = None
            if pos.side == OrderSide.LONG:
                if pos.stop_loss and px <= pos.stop_loss:
                    reason = "stop_loss"
                elif pos.take_profit and px >= pos.take_profit:
                    reason = "take_profit"
            if reason:
                close_order = Order(
                    id=str(uuid.uuid4()), agent_id=account.agent_id, symbol=symbol,
                    asset_type=pos.asset_type, side=OrderSide.SHORT, order_type=OrderType.MARKET,
                    quantity=pos.quantity, created_at=self._now(), updated_at=self._now(),
                )
                commission = self._commission(close_order)
                pnl = self._close_position(account, close_order, px, commission, reason=reason)
                close_order.status = OrderStatus.FILLED
                close_order.avg_fill_price = px
                fill = self._record_fill(account, close_order, px, commission)
                results.append(FillResult(order=close_order, fill=fill, closed_trade_pnl=pnl))
        # update high-water mark
        account.high_water_mark = max(account.high_water_mark, account.equity)
        return results

    # ------------------------------------------------------------------ flatten
    def flatten_position(self, account: Account, symbol: str, price: float):
        pos = account.positions.get(symbol)
        if pos is None:
            return None
        order = Order(id=str(uuid.uuid4()), agent_id=account.agent_id, symbol=symbol,
                      asset_type=pos.asset_type, side=OrderSide.SHORT, order_type=OrderType.MARKET,
                      quantity=pos.quantity, created_at=self._now(), updated_at=self._now())
        return self.place_order(account, order, price)

    def flatten_all_simulated(self, account: Account, prices: dict[str, float]) -> list:
        results = []
        for symbol in list(account.positions.keys()):
            px = prices.get(symbol, account.positions[symbol].current_price)
            r = self.flatten_position(account, symbol, px)
            if r:
                results.append(r)
        return results

    # ------------------------------------------------------------------ queries
    def get_positions(self, account: Account) -> list[Position]:
        return list(account.positions.values())

    def get_open_orders(self, account: Account) -> list[Order]:
        return self.open_orders.get(account.agent_id, [])

    def get_account_summary(self, account: Account) -> dict:
        return {
            "agent_id": account.agent_id,
            "cash": round(account.cash, 2),
            "equity": round(account.equity, 2),
            "buying_power": round(account.buying_power, 2),
            "realized_pnl": round(account.realized_pnl, 2),
            "unrealized_pnl": round(account.unrealized_pnl, 2),
            "daily_pnl": round(account.daily_pnl, 2),
            "option_exposure_pct": round(account.option_exposure_pct, 4),
            "open_positions": len(account.positions),
            "drawdown_pct": round(account.current_drawdown_pct, 4),
        }
