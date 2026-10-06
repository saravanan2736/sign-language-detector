from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from database import Base

class RecognitionHistory(Base):
    __tablename__ = "recognition_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="anonymous")
    predicted_label = Column(String, index=True)
    confidence_score = Column(Float)
    model_version = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
