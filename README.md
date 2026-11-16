  # Ride Dispatch Project

A project consisting of a backend driver simulator and a frontend UI.

## Structure

- `backend/`: Python driver simulator script.
- `frontend-ui/`: React application (Vite template).

## Getting Started

### Backend
1. Ensure you have Python installed.
2. Install dependencies: `pip install boto3`
3. Run the simulator: `python backend/driver_simulator.py`

### Frontend
1. Navigate to `frontend-ui/`.
2. Run `npm install`.
3. Start the dev server: `npm run dev`.

---

## Docker & Kubernetes Deployment

You can now run this project using Docker and Kubernetes to ensure a consistent, cloud-native environment.

### Prerequisites
* **Docker Desktop**: Make sure it is installed and **running** in the background. If you get a "pipe/dockerDesktopLinuxEngine" error, it means the Docker daemon is not running.
* **Kubectl / Minikube**: A local Kubernetes cluster. Docker Desktop has a built-in Kubernetes option you can enable in settings.

### 1. Build the Docker Images
Open your terminal in the root project directory and build the images:

```bash
# Build the Python backend image
cd backend
docker build -t ride-backend:latest .
cd ..

# Build the React frontend image
cd frontend-ui
docker build -t ride-frontend:latest .
cd ..
```

### 2. Deploy to Kubernetes
Apply the Kubernetes manifests from the `k8s/` folder:

```bash
kubectl apply -f k8s/
```

### 3. Verify the Deployment
Check if the containers (pods) are running and get the service details:

```bash
kubectl get pods
kubectl get services
```
The frontend should be accessible via the External IP (or `localhost` if using Docker Desktop) on port 80.

---

### What to do after restarting your computer
When you restart your computer or close VS Code, **you do NOT need to run the build or apply commands again.** 

Docker saves your built images, and Kubernetes saves your deployment state. 

To start the project again:
1. Open and start the **Docker Desktop** application.
2. Wait for the engine to start running.
3. Kubernetes will automatically wake up and start your containers in the background.

You can verify it is running by opening a terminal and typing:
```bash
kubectl get pods
```

```bash
minikube service frontend-service
```
