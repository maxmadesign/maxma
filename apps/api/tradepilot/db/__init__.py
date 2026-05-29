"""Database layer (PostgreSQL via SQLAlchemy).

NOTE: the MVP demo runs the Arena in-memory for instant, key-free startup. These models define
the persistent schema (tables listed in the spec) and migrations target. Wiring the Arena to
persist/load from Postgres is the next step (see docs/architecture.md).
"""
from tradepilot.db.models import Base

__all__ = ["Base"]
