"""
Real-Time Ride Dispatch System — Local Backend API
Simulates AWS API Gateway + Lambda + DynamoDB + SNS locally.
Also publishes to real AWS SNS if credentials are set.
"""

import json
import math
import random
import time
import threading
import os
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Ride Dispatch API", version="2.0.0")

# Allow frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-Memory Driver Registry (simulates DynamoDB) ─────────────────────────
drivers_db: dict = {}

def init_drivers():
    """Initialize 30 drivers near New Delhi."""
    for i in range(1, 31):
        driver_id = f"D{i}"
        cars = ["EV Class", "Premium Class", "Standard Class", "SUV Class", "Bike Class"]
        drivers_db[driver_id] = {
            "driver_id": driver_id,
            "latitude": 28.6139 + random.uniform(-0.08, 0.08),
            "longitude": 77.2090 + random.uniform(-0.08, 0.08),
            "status": "available",
            "car": random.choice(cars),
            "rating": round(random.uniform(3.5, 5.0), 1),
            "last_updated": datetime.utcnow().isoformat()
        }

init_drivers()

# ─── Background Driver Movement Simulator ───────────────────────────────────
def simulate_driver_movement():
    """Continuously move drivers and randomly toggle their status."""
    while True:
        for driver_id, data in drivers_db.items():
            data["latitude"]  += random.uniform(-0.002, 0.002)
            data["longitude"] += random.uniform(-0.002, 0.002)
            if random.random() < 0.05:
                data["status"] = "busy" if data["status"] == "available" else "available"
            data["last_updated"] = datetime.utcnow().isoformat()

            # Optional: publish to real AWS SNS if credentials available
            try:
                import boto3
                aws_key = os.getenv("AWS_ACCESS_KEY_ID")
                aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
                topic_arn = os.getenv("SNS_TOPIC_ARN", "arn:aws:sns:us-east-1:000876600788:driver-location-topic")
                if aws_key and aws_secret:
                    sns = boto3.client("sns", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
                    sns.publish(TopicArn=topic_arn, Message=json.dumps(data))
            except Exception:
                pass  # Run offline if no AWS creds

        time.sleep(3)

# Start simulator in background thread
simulator_thread = threading.Thread(target=simulate_driver_movement, daemon=True)
simulator_thread.start()

# ─── Haversine Distance ──────────────────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# ─── Request Models ──────────────────────────────────────────────────────────
class DispatchRequest(BaseModel):
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None
    assign_driver_id: Optional[str] = None

# ─── API Endpoints ───────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "online", "service": "Ride Dispatch API v2.0", "drivers": len(drivers_db)}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/drivers")
def get_all_drivers():
    return {"drivers": list(drivers_db.values()), "count": len(drivers_db)}

@app.post("/dispatch")
def dispatch(req: DispatchRequest):
    # ── Assignment flow ──────────────────────────────────────────────────
    if req.assign_driver_id:
        driver = drivers_db.get(req.assign_driver_id)
        if not driver:
            raise HTTPException(status_code=404, detail=f"Driver {req.assign_driver_id} not found")
        driver["status"] = "busy"
        driver["last_updated"] = datetime.utcnow().isoformat()
        return {"message": f"Driver {req.assign_driver_id} assigned successfully", "driver": driver}

    # ── Nearest-driver search ────────────────────────────────────────────
    if req.user_lat is None or req.user_lon is None:
        raise HTTPException(status_code=400, detail="Provide user_lat and user_lon for dispatch search")

    available = [d for d in drivers_db.values() if d["status"] == "available"]
    for d in available:
        d["distance_km"] = round(haversine(req.user_lat, req.user_lon, d["latitude"], d["longitude"]), 2)

    nearest = sorted(available, key=lambda x: x["distance_km"])[:10]
    return {"nearest_drivers": nearest, "count": len(nearest), "user_location": {"lat": req.user_lat, "lon": req.user_lon}}

@app.get("/stats")
def stats():
    total = len(drivers_db)
    available = sum(1 for d in drivers_db.values() if d["status"] == "available")
    return {"total_drivers": total, "available": available, "busy": total - available}
