"""TradePilot Arena — backend domain core + FastAPI app.

The domain core (schemas, risk engine, paper broker, simulation engine, providers,
market data) is pure-Python and importable without a running database, so it can be
unit-tested in isolation and reused by the API and the ``services/*`` workers.
"""

__version__ = "0.1.0"
