"""Prediction service - ML model integration."""
import os
import sys
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Add shared modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from shared.schemas import HealthCheck, PredictionRequest, PredictionResponse
from shared.utils import get_logger

logger = get_logger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be configured")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class PredictionRecord(Base):
    """Prediction database model."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    model_name = Column(String, nullable=False)
    features = Column(JSON, nullable=False)
    prediction = Column(JSON, nullable=False)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Prediction Service",
    description="ML model integration service for clinical predictions",
    version="1.0.0"
)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DummyMLModel:
    """
    Dummy ML model for demonstration purposes.
    In production, this is replaced with actual ML models.
    """

    def __init__(self, model_name: str):
        self.model_name = model_name

    def predict(self, features: dict) -> tuple:
        """
        Make a prediction based on features.

        Returns:
            Tuple of (prediction, confidence)
        """
        # Simulate different models
        if self.model_name == "mortality_risk":
            # Simple mortality risk calculation
            age = features.get("age", 50)
            severity_score = features.get("severity_score", 5)
            risk = min((age / 100 + severity_score / 10) / 2, 1.0)
            return {
                "risk_score": round(risk, 3),
                "risk_level": self._get_risk_level(risk),
            }, round(0.85, 2)

        if self.model_name == "length_of_stay":
            # Simple length of stay prediction
            severity = features.get("severity_score", 5)
            age = features.get("age", 50)
            days = int(severity * 2 + age / 20)
            return {"predicted_days": days}, round(0.78, 2)

        if self.model_name == "readmission_risk":
            # Simple readmission risk
            comorbidities = features.get("comorbidities", 1)
            age = features.get("age", 50)
            risk = min((comorbidities * 0.2 + age / 200), 1.0)
            return {
                "risk_score": round(risk, 3),
                "risk_level": self._get_risk_level(risk),
            }, round(0.82, 2)

        return {"result": "unknown_model"}, 0.0
    
    def _get_risk_level(self, risk: float) -> str:
        """Convert risk score to level."""
        if risk < 0.3:
            return "low"
        if risk < 0.6:
            return "medium"

        return "high"


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(status="healthy", service="prediction")


@app.post("/predictions", response_model=PredictionResponse)
async def create_prediction(
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new prediction.

    Supported models:
    - mortality_risk: Predicts mortality risk based on age and severity score
    - length_of_stay: Predicts length of stay in ICU
    - readmission_risk: Predicts risk of readmission
    """
    logger.info(
        "Creating prediction for patient %s with model %s",
        request.patient_id,
        request.model_name,
    )

    # Load and run model
    try:
        model = DummyMLModel(request.model_name)
        prediction, confidence = model.predict(request.features)
    except Exception as e:
        logger.error("Error running model: %s", e)
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {str(e)}") from e

    # Save prediction to database
    db_prediction = PredictionRecord(
        patient_id=request.patient_id,
        model_name=request.model_name,
        features=request.features,
        prediction=prediction,
        confidence=confidence
    )
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)

    return PredictionResponse(
        patient_id=request.patient_id,
        model_name=request.model_name,
        prediction=prediction,
        confidence=confidence,
        timestamp=db_prediction.created_at.isoformat()
    )


@app.get("/predictions/{patient_id}")
async def get_patient_predictions(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """Get all predictions for a patient."""
    predictions = db.query(PredictionRecord).filter(
        PredictionRecord.patient_id == patient_id
    ).all()

    return {
        "patient_id": patient_id,
        "predictions": [
            {
                "id": p.id,
                "model_name": p.model_name,
                "prediction": p.prediction,
                "confidence": p.confidence,
                "created_at": p.created_at.isoformat()
            }
            for p in predictions
        ]
    }


@app.get("/models")
async def list_models():
    """List available prediction models."""
    return {
        "models": [
            {
                "name": "mortality_risk",
                "description": "Predicts mortality risk based on clinical features",
                "required_features": ["age", "severity_score"]
            },
            {
                "name": "length_of_stay",
                "description": "Predicts expected length of stay in ICU",
                "required_features": ["age", "severity_score"]
            },
            {
                "name": "readmission_risk",
                "description": "Predicts risk of hospital readmission",
                "required_features": ["age", "comorbidities"]
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
