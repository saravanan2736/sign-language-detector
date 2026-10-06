from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Assuming a local PostgreSQL setup
# Change user, password, and db_name as necessary for deployment
# SQLALCHEMY_DATABASE_URL = "postgresql://postgres:password@localhost/signdb"

# For local testing if postgres isn't running, you could swap to sqlite:
SQLALCHEMY_DATABASE_URL = "sqlite:///./signdb.sqlite3"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
