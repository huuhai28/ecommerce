pipeline {
    agent any
    parameters {
        choice(name: 'SERVICE', 
               choices: ['all', 'frontend', 'backend', 'gateway', 'cart', 'catalogue', 'order', 'payment', 'shipping', 'user'], 
               )
    }
    environment {
        DOCKER_HUB_USER = 'huuhai123'
        LIST_SERVICES = 'frontend backend gateway cart catalogue order payment shipping user'
    }
    stages {
        stage('Build & Deploy Parallel') {
            steps {
                script {
                    def targetServices = (params.SERVICE == 'all') ? env.LIST_SERVICES.split(' ') : [params.SERVICE]
                    def jobs = [:]

                    targetServices.each { svc ->
                        jobs[svc] = {
                            stage("Processing ${svc}") {
                                try {
                                    echo "--- BẮT ĐẦU: ${svc} ---"
                                    def buildFolder = (svc == 'frontend' || svc == 'backend' || svc == 'gateway') ? svc : "services/${svc}"
                                    def imageName = "ecommerce-${svc}"
                                    def k8sName = (svc == 'frontend') ? "frontend-service" : 
                                                  (svc == 'backend') ? "backend-api" : 
                                                  (svc == 'gateway') ? "api-gateway" : "${svc}-service"

                                    sh "docker build -t ${DOCKER_HUB_USER}/${imageName}:latest ./${buildFolder}"
                                    sh "docker push ${DOCKER_HUB_USER}/${imageName}:latest"
                                    sh "kubectl rollout restart deployment/${k8sName} -n ecommerce"
                                } catch (Exception e) {
                                    echo "LỖI tại service ${svc}: ${e.getMessage()}"
                                    currentBuild.result = 'UNSTABLE'
                                }
                            }
                        }
                    }
                    parallel jobs
                }
            }
        }
    }
    post {
        always {
            // Giúp máy Master không bị đầy bộ nhớ
            sh "docker image prune -f"
        }
    }
}