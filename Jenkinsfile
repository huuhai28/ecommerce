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
        stage('Checkout Code') {
            steps {
                script {
                    echo "Pulling latest code from git"
                    sh 'git pull origin main'
                }
            }
        }
        stage('Apply Infrastructure') {
            steps {
                script {
                    sh 'kubectl apply -f infrastructure/k8s/namespace.yaml'
                    sh 'kubectl apply -f infrastructure/k8s/storageclass-local.yaml'
                    sh 'kubectl apply -f infrastructure/k8s/postgres-pv-pvc.yaml'
                    sh 'kubectl apply -f infrastructure/k8s/cart-db-deployment.yaml'
                    sh 'kubectl apply -f infrastructure/k8s/ -n ecommerce || true'
                }
            }
        }

        
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
                        
                        if (params.SERVICE != 'all' || params.SERVICE == 'all') {
                            jobs[svc] = {
                                stage("Build ${svc}") {
                                    def imageName = "${svc}-service"
                                    def deploymentName = (svc == 'gateway') ? 'api-gateway' : "${svc}-service"
                                    def containerName = (svc == 'frontend') ? 'frontend' : (svc == 'gateway') ? 'api-gateway' : "${svc}-service"
                                    def imageTag = "${BUILD_NUMBER}"
                                    
                                    sh "docker build -t ${DOCKER_HUB_USER}/${imageName}:${imageTag} ./${folderPath}"
                                    sh "docker push ${DOCKER_HUB_USER}/${imageName}:${imageTag}"
                                    sh "kubectl set image deployment/${deploymentName} ${containerName}=${DOCKER_HUB_USER}/${imageName}:${imageTag} -n ecommerce"
                                }
                            }
                        }
                    }
                    if (jobs) {
                        parallel jobs
                    } else {
                        echo "Không có service nào để rebuild."
                    }
                }
            }
        }
        stage('Smoke Test') {
            steps {
                sleep 120
                sh 'chmod +x tests/e2e-smoke.sh'
                sh '''
                    GATEWAY_HOST=${GATEWAY_HOST} GATEWAY_PORT=${GATEWAY_PORT} EMAIL=e2e-${BUILD_NUMBER}@test.com tests/e2e-smoke.sh || {
                        echo "Smoke test failed. Checking gateway connectivity..."
                        curl -v http://${GATEWAY_HOST}:${GATEWAY_PORT}/health || echo "Gateway not reachable"
                        exit 1
                    }
                '''
            }
        }
    }
    post {
        always {
            sh 'docker image prune -f'
        }
    }
}