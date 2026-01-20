pipeline {
    agent any
    parameters {
        choice(name: 'SERVICE', 
               choices: ['all', 'frontend', 'backend', 'gateway', 'cart', 'catalogue', 'order', 'payment', 'shipping', 'user'], 
               description: 'Chọn "all" để build tất cả (song song 2 cái một) hoặc chọn lẻ')
    }
    environment {
        DOCKER_HUB_USER = 'huuhai123'
        LIST_SERVICES = 'frontend backend gateway cart catalogue order payment shipping user'
    }
    stages {
        stage('Checkout code'){
            steps{
                git branch: 'main', url: 'https://github.com/huuhai28/ecommerce.git'
            }
        }
        stage('Build & Deploy Parallel') {
            steps {
                script {
                    def targetServices = (params.SERVICE == 'all') ? env.LIST_SERVICES.split(' ') : [params.SERVICE]
                    def jobs = [:]

                    targetServices.each { svc ->
                        // Tạo các job nhỏ để chạy song song
                        jobs[svc] = {
                            stage("Processing ${svc}") {
                                try {
                                    echo "--- BẮT ĐẦU: ${svc} ---"
                                    def buildFolder = (svc == 'frontend' || svc == 'backend' || svc == 'gateway') ? svc : "services/${svc}"
                                    def imageName = "ecommerce-${svc}"
                                    
                                    // Map tên deployment thực tế trên máy của bạn
                                    def k8sName = (svc == 'frontend') ? "frontend-service" : 
                                                  (svc == 'backend') ? "backend-api" : 
                                                  (svc == 'gateway') ? "api-gateway" : "${svc}-service"

                                    sh "docker build -t ${DOCKER_HUB_USER}/${imageName}:latest ./${buildFolder}"
                                    sh "docker push ${DOCKER_HUB_USER}/${imageName}:latest"
                                    sh "kubectl rollout restart deployment/${k8sName} -n ecommerce"
                                } catch (Exception e) {
                                    echo "LỖI tại service ${svc}: ${e.getMessage()}"
                                    currentBuild.result = 'UNSTABLE' // Không làm dừng cả Pipeline nếu 1 cái lỗi
                                }
                            }
                        }
                    }
                    // Giới hạn chỉ chạy 2 service song song để bảo vệ CPU máy Master
                    parallel jobs
                }
            }
        }
    }
    post {
        always {
            // Dọn dẹp các layer rác để máy không bị đầy ổ cứng
            sh "docker image prune -f"
        }
    }
}