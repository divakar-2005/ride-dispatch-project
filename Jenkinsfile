pipeline {
    agent any

    environment {
        BACKEND_IMAGE  = 'ride-dispatch-backend:latest'
        FRONTEND_IMAGE = 'ride-dispatch-frontend:latest'
        REGISTRY       = "${env.DOCKER_REGISTRY ?: 'divakar2005'}"
    }

    stages {

        stage('📥 Checkout') {
            steps {
                checkout scm
                echo "✅ Code checked out from: ${env.GIT_URL}"
            }
        }

        stage('🐳 Build Backend Image') {
            steps {
                dir('backend') {
                    sh "docker build -t ${BACKEND_IMAGE} ."
                    echo "✅ Backend Docker image built."
                }
            }
        }

        stage('🌐 Build Frontend Image') {
            steps {
                dir('frontend-ui') {
                    sh "docker build --build-arg VITE_API_URL=http://backend:8000 -t ${FRONTEND_IMAGE} ."
                    echo "✅ Frontend Docker image built."
                }
            }
        }

        stage('🧪 Test Backend') {
            steps {
                sh """
                    docker run --rm ${BACKEND_IMAGE} python -c "
                    import main, math
                    dist = main.haversine(28.6139, 77.2090, 28.7041, 77.1025)
                    assert dist > 0, 'Distance must be positive'
                    print('✅ All tests passed. Distance:', round(dist,2), 'km')
                    "
                """
            }
        }

        stage('🚀 Deploy with Docker Compose') {
            steps {
                sh 'docker compose down --remove-orphans || true'
                sh 'docker compose up -d --build'
                sh 'sleep 5 && docker compose ps'
                echo "✅ Deployed! Frontend: http://localhost:8080  Jenkins: http://localhost:9090"
            }
        }

        stage('☸️ Deploy to Kubernetes') {
            when {
                environment name: 'DEPLOY_K8S', value: 'true'
            }
            steps {
                sh 'kubectl apply -f k8s/'
                sh 'kubectl rollout status deployment/ride-dispatch-backend  --timeout=120s'
                sh 'kubectl rollout status deployment/ride-dispatch-frontend --timeout=120s'
                sh 'kubectl get pods,services'
            }
        }

        stage('🏷️ Push to Docker Registry') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                                   usernameVariable: 'DOCKER_USER',
                                                   passwordVariable: 'DOCKER_PASS')]) {
                    sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                    sh "docker tag ${BACKEND_IMAGE}  ${REGISTRY}/${BACKEND_IMAGE}"
                    sh "docker tag ${FRONTEND_IMAGE} ${REGISTRY}/${FRONTEND_IMAGE}"
                    sh "docker push ${REGISTRY}/${BACKEND_IMAGE}"
                    sh "docker push ${REGISTRY}/${FRONTEND_IMAGE}"
                }
            }
        }
    }

    post {
        always {
            echo "📊 Pipeline complete."
            sh 'docker compose ps || true'
        }
        success { echo "🎉 Build & Deploy SUCCESS!" }
        failure { echo "💥 Build FAILED — check logs above." }
    }
}
