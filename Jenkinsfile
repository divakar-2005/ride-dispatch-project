pipeline {
    agent any

    environment {
        FRONTEND_IMAGE = 'ride-frontend:latest'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend-ui') {
                    script {
                        echo "Building Frontend Docker Image..."
                        sh "docker build -t ${FRONTEND_IMAGE} ."
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    echo "Deploying Frontend to Kubernetes cluster..."
                    // This assumes kubectl is configured on the Jenkins agent
                    sh "kubectl apply -f k8s/frontend-deployment.yaml"
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline complete."
            // Clean up old images if needed
            // sh "docker rmi ${FRONTEND_IMAGE} || true"
        }
        success {
            echo "Deployment successful."
        }
        failure {
            echo "Deployment failed."
        }
    }
}
