pipeline {
    agent any
    parameters {
        choice(name: 'SERVICE', 
               choices: ['all', 'frontend', 'gateway', 'cart', 'catalogue', 'order', 'payment', 'shipping', 'user'])
    }
    environment {
        DOCKER_HUB_USER = 'huuhai123'
        LIST_SERVICES = 'frontend gateway cart catalogue order payment shipping user'
        GATEWAY_HOST = '192.168.1.111'
        GATEWAY_PORT = '30004'
    }
    stages {
        stage('Prepare & Unit Test') {
            steps {
                script {
                    def targetServices = (params.SERVICE == 'all') ? env.LIST_SERVICES.split(' ') : [params.SERVICE]
                    targetServices.each { svc ->
                        def folderPath = (svc == 'frontend' || svc == 'gateway') ? svc : "services/${svc}"
                        dir(folderPath) {
                            if (sh(script: "find . -name '*.test.js' | wc -l", returnStdout: true).trim() != '0') {
                                echo " Running Unit Test cho ${svc} "
                                sh '''docker run --rm -v "$PWD":/app -w /app node:20-alpine sh -c "npm ci && npm test"'''
                            } else {
                                echo "Bo qua ${svc} vi khong co file test"
                            }
                        }
                    }
                }
            }
        }

        stage('Build & Deploy Parallel') {
            steps {
                script {
                    def targetServices = (params.SERVICE == 'all') ? env.LIST_SERVICES.split(' ') : [params.SERVICE]
                    def jobs = [:]
                    targetServices.each { svc ->
                        def folderPath = (svc == 'frontend' || svc == 'gateway') ? svc : "services/${svc}"
                        def isChanged = currentBuild.changeSets.any { cs -> cs.items.any { item -> item.affectedPaths.any { path -> path.startsWith(folderPath)} } }
                        
                        if (params.SERVICE != 'all' || isChanged) {
                            jobs[svc] = {
                                stage("Build ${svc}") {
                                    def imageName = "ecommerce-${svc}"
                                    def k8sName = (svc == 'frontend') ? 'frontend-service' : (svc == 'gateway') ? 'api-gateway' : "${svc}-service"
                                    
                                    sh "docker build -t ${DOCKER_HUB_USER}/${imageName}:latest ./${folderPath}"
                                    sh "docker push ${DOCKER_HUB_USER}/${imageName}:latest"
                                    sh "kubectl rollout restart deployment/${k8sName} -n ecommerce"
                                }
                            }
                        }
                    }
                    if (jobs) {
                        parallel jobs
                    } else {
                        echo "Không có service nào thay đổi, bỏ qua Build."
                    }
                }
            }
        }
        stage('Smoke Test') {
            steps {
                sleep 30
                sh 'chmod +x tests/e2e-smoke.sh'
                sh "GATEWAY_HOST=${env.GATEWAY_HOST} GATEWAY_PORT=${env.GATEWAY_PORT} EMAIL=e2e-${BUILD_NUMBER}@test.com tests/e2e-smoke.sh"
            }
        }
    }
    post {
        always {
            sh 'docker image prune -f'
        }
    }
}