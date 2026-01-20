pipeline {
    agent any
    parameters {
        choice(name: 'SERVICE', 
               choices: ['all', 'frontend', 'backend', 'gateway', 'cart', 'catalogue', 'order', 'payment', 'shipping', 'user'], 
               )
    }
    environment {
        DOCKER_HUB_USER = 'huuhai123'
        LIST_SERVICES = 'frontend gateway cart catalogue order payment shipping user'
    }
    stages {
        stage('Build & Deploy Parallel') {
            steps {
                script {
                    def targetServices = (params.SERVICE == 'all') ? env.LIST_SERVICES.split(' ') : [params.SERVICE]
                    def jobs = [:]

                    targetServices.each {
                        svc -> jobs[svc] = {
                            stage("Processing ${svc}"){
                                def folderPath = (svc == 'frontend' || svc == 'gateway') ? svc : "services/${svc}"          
                                def isChanged = currentBuild.changeSets.any {
                                    cs -> cs.items.any { item -> item.affectedPaths.any { path -> path.startsWith(folderPath)}}
                                }

                                if (params.SERVICE != 'all' || isChanged){
                                    try{
                                        def imageName = "ecommerce-${svc}"
                                        def k8sName = (svc == 'frontend') ? "frontend-service" : (svc == 'gateway') ? "api-gateway" : "${svc}-service"

                                        sh "docker build -t ${DOCKER_HUB_USER}/${imageName}:latest ./${folderPath}"
                                        sh "docker push ${DOCKER_HUB_USER}/${imageName}:latest"
                                        sh "kubectl rollout restart deployment/${k8sName} -n ecommerce"
                                    } catch (Exception e){
                                        echo "Loi tai service ${svc}: ${e.getMessage()}"
                                        currentBuild.result = 'UNSTABLE'
                                    }
                                } else {
                                    echo " bo qua ${svc} vi khong co gi thay doi"
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
            sh "docker image prune -f"
        }
    }
}