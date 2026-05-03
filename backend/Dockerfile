FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python simulator script
COPY main.py .

# Run the simulator
CMD ["python", "main.py"]
