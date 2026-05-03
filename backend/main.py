import boto3
import json
import random
import time

# AWS SNS client
sns = boto3.client("sns", region_name="us-east-1")

# Your SNS topic ARN
topic_arn = "arn:aws:sns:us-east-1:000876600788:driver-location-topic"

# Create 30 drivers with initial positions
drivers = {}

for i in range(1, 31):
    drivers[f"D{i}"] = {
        "latitude": 17.385 + random.uniform(-0.02, 0.02),
        "longitude": 78.486 + random.uniform(-0.02, 0.02),
        "status": "available"   # ✅ FIX: initialize properly
    }

print("🚀 Driver simulator started...\n")

while True:

    for driver_id, data in drivers.items():

        # Simulate movement (smooth movement)
        data["latitude"] += random.uniform(-0.001, 0.001)
        data["longitude"] += random.uniform(-0.001, 0.001)

        # OPTIONAL: Random status toggle (can disable if needed)
        if random.random() < 0.1:
            data["status"] = "busy" if data["status"] == "available" else "available"

        # Prepare message
        driver_data = {
            "driver_id": driver_id,
            "latitude": data["latitude"],
            "longitude": data["longitude"],
            "status": data["status"]
        }

        # Send to SNS
        sns.publish(
            TopicArn=topic_arn,
            Message=json.dumps(driver_data)
        )

        print("Sent:", driver_data)

    # Wait before next update
    time.sleep(3)