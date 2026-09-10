from sqlalchemy import Column, Integer, String, Float, DateTime, Index
import datetime
from .session import Base

class NetworkEvent(Base):
    __tablename__ = "network_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    src_ip = Column(String, index=True)
    dst_ip = Column(String, index=True)
    port = Column(Integer)
    txid = Column(String, index=True, nullable=True) # Used for correlation
    geo_asn = Column(String)

class BlockchainEvent(Base):
    __tablename__ = "blockchain_events"

    id = Column(Integer, primary_key=True, index=True)
    txid = Column(String, unique=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    # Storing wallets as comma-separated strings or JSON strings for MVP
    input_wallets = Column(String) 
    output_wallets = Column(String)
    amount = Column(Float)
    fee = Column(Float)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)

class EllipticFeature(Base):
    __tablename__ = "elliptic_features"

    tx_id = Column(String, primary_key=True, index=True)
    features = Column(String)  # JSON-encoded array of 166 float features (time_step + 165 features)

class HeistFeature(Base):
    __tablename__ = "heist_features"

    address = Column(String, primary_key=True, index=True)
    features = Column(String)  # JSON-encoded array of 8 float features


class TransactionEdge(Base):
    __tablename__ = "transaction_edges"

    id = Column(Integer, primary_key=True, index=True)
    source_tx = Column(String, index=True)
    target_tx = Column(String, index=True)

    __table_args__ = (
        Index("idx_source_target", "source_tx", "target_tx"),
        Index("idx_target_source", "target_tx", "source_tx"),
    )


