pipeline{
    agent any
    parameters {
        // Cho phép bạn chọn Service cần xử lý ngay trên Jenkins Dashboard
        choice(name: 'SERVICE', 
               choices: ['gateway', 'cart', 'catalogue', 'order', 'payment', 'shipping', 'user'], 
               description: 'Chọn Microservice bạn muốn Build và Deploy')
    }
    environment {
        DOCKER_HUB_USER = 'huuhai123'
        SERVICE_NAME = "ecommerce-${params.SERVICE}"
        SERVICE_PATH = "service/${params.service}"
    }
    stages {
        stage('Checkout code'){
            steps{
                git 'https://github.com/huuhai28/ecommerce.git'
            }
        }
        stage('build and push image'){
            steps{
                script{

                sh "docker build -t ${DOCKER_HUB_USER}/${SERVICE_NAME}:latest ."
                sh "docker push ${DOCKER_HUB_USER}/${SERVICE_NAME}:latest"
                }
            }
        }
        stage('deploy to rancher'){
            steps{
                sh "kubectl rollout restart deployment/${SERVICE_NAME} -n ecommerce"
            }
        }
    }
}