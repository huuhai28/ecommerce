# Setup Jenkins VM - Hướng dẫn Chi Tiết

## 1. Yêu cầu hệ thống
- **RAM**: 2GB (tối thiểu)
- **CPU**: 2 cores
- **Storage**: 20GB
- **OS**: Ubuntu 20.04 LTS hoặc CentOS 7+
- **Network**: Kết nối được với K8s Master Node

---

## 2. Bước 1: Tạo VM và Cài Đặt OS

### Windows Hypervisor (Hyper-V):
```powershell
# Tạo VM mới
New-VM -Name "Jenkins-Server" `
  -MemoryStartupBytes 2GB `
  -NewVhdPath "D:\VMs\Jenkins-Server.vhdx" `
  -NewVhdSizeBytes 20GB `
  -SwitchName "Default Switch"

# Khởi động VM
Start-VM -Name "Jenkins-Server"
```

### VirtualBox (Nếu dùng):
```bash
# Tạo VM Ubuntu 20.04
- RAM: 2GB
- CPU: 2 cores
- Storage: 20GB
- Network: Bridge Adapter (để kết nối với K8s)
```

---

## 3. Bước 2: Cài Đặt Java & Jenkins

### SSH vào VM:
```bash
ssh ubuntu@jenkins-vm-ip
# hoặc
ssh root@jenkins-vm-ip
```

### Update system:
```bash
sudo apt update && sudo apt upgrade -y
```

### Cài Java (OpenJDK 11):
```bash
sudo apt install -y openjdk-11-jdk

# Xác nhận
java -version
```

### Cài Jenkins:
```bash
# Thêm Jenkins Repository
wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo apt-key add -
sudo sh -c 'echo deb https://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'

# Cài Jenkins
sudo apt update
sudo apt install -y jenkins

# Khởi động Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Kiểm tra status
sudo systemctl status jenkins
```

---

## 4. Bước 3: Cài Docker (Để Build Images)

```bash
# Cài Docker
sudo apt install -y docker.io

# Thêm user vào docker group (để không dùng sudo)
sudo usermod -aG docker jenkins
sudo usermod -aG docker ubuntu

# Khởi động Docker
sudo systemctl start docker
sudo systemctl enable docker

# Xác nhận
docker --version
```

---

## 5. Bước 4: Cài Kubectl (Để Deploy vào K8s)

```bash
# Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Cài kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Xác nhận
kubectl version --client
```

---

## 6. Bước 5: Cấu Hình kubectl Config

### Copy kubeconfig từ K8s Master:
```bash
# Trên K8s Master Node:
cat ~/.kube/config

# Copy toàn bộ nội dung
```

### Trên Jenkins VM:
```bash
# Tạo .kube directory cho Jenkins user
sudo mkdir -p /var/lib/jenkins/.kube

# Tạo config file
sudo tee /var/lib/jenkins/.kube/config > /dev/null <<EOF
# PASTE nội dung kubeconfig từ trên đây
EOF

# Fix permissions
sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube
sudo chmod 600 /var/lib/jenkins/.kube/config

# Test kết nối
sudo -u jenkins kubectl get nodes
```

---

## 7. Bước 6: Truy cập Jenkins Web UI

### Lấy Jenkins Admin Password:
```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### Truy cập Jenkins:
```
http://<jenkins-vm-ip>:8080
```

### Đăng nhập:
- Username: `admin`
- Password: Lấy từ lệnh trên

---

## 8. Bước 7: Cấu Hình Jenkins Plugins

### Các plugins cần cài:
1. **Kubernetes Plugin** - Để deploy vào K8s
2. **Docker Pipeline** - Để build Docker images
3. **Git** - Để clone repository
4. **Pipeline** - Để dùng Declarative/Scripted Pipeline

### Cài plugins:
```
Manage Jenkins → Manage Plugins → Available
Tìm và cài:
- kubernetes
- docker-workflow
- git
```

---

## 9. Bước 8: Cấu Hình Kubernetes Cloud

### Trong Jenkins UI:
```
Manage Jenkins → Manage Nodes and Clouds → Configure Clouds
```

1. **Click "New cloud" → Select "Kubernetes"**

2. **Điền thông tin:**
   - **Name**: `kubernetes`
   - **Kubernetes URL**: `https://<master-node-ip>:6443`
   - **Kubernetes Namespace**: `default`
   - **Jenkins URL**: `http://<jenkins-vm-ip>:8080`

3. **Cấu Hình Credentials:**
   - Click "Add" → "Jenkins"
   - **Kind**: `Kubernetes service account`
   - Hoặc dùng kubeconfig từ VM

4. **Test Connection:**
   - Click "Test Connection"

---

## 10. Bước 9: Tạo Jenkins Pipeline

### Tạo Job mới:
```
New Item → Enter Job Name → Pipeline → OK
```

### Pipeline Script (Ví dụ):
```groovy
pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = "your-docker-registry"
        KUBECONFIG = "/var/lib/jenkins/.kube/config"
    }
    
    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/your-repo/doan.git'
            }
        }
        
        stage('Build Docker Images') {
            steps {
                script {
                    sh '''
                        docker build -t ${DOCKER_REGISTRY}/backend:latest ./backend
                        docker build -t ${DOCKER_REGISTRY}/frontend:latest ./frontend
                        docker build -t ${DOCKER_REGISTRY}/gateway:latest ./gateway
                    '''
                }
            }
        }
        
        stage('Push to Registry') {
            steps {
                script {
                    sh '''
                        docker push ${DOCKER_REGISTRY}/backend:latest
                        docker push ${DOCKER_REGISTRY}/frontend:latest
                        docker push ${DOCKER_REGISTRY}/gateway:latest
                    '''
                }
            }
        }
        
        stage('Deploy to K8s') {
            steps {
                script {
                    sh '''
                        kubectl apply -f infrastructure/k8s/
                    '''
                }
            }
        }
    }
}
```

---

## 11. Bước 10: Cấu Hình Firewall

### Mở ports:
```bash
# UFW (Ubuntu)
sudo ufw allow 8080/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# hoặc CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

---

## 12. Troubleshooting

### Jenkins không kết nối được K8s:
```bash
# Check logs
sudo journalctl -u jenkins -f

# Kiểm tra kubeconfig
sudo -u jenkins kubectl cluster-info
sudo -u jenkins kubectl get nodes
```

### Docker permission denied:
```bash
# Thêm jenkins vào docker group
sudo usermod -aG docker jenkins

# Restart Jenkins
sudo systemctl restart jenkins
```

### Memory insufficient:
```bash
# Check memory usage
free -h

# Tăng heap size Jenkins (nếu cần)
sudo nano /etc/default/jenkins

# Tìm JAVA_ARGS và sửa:
JAVA_ARGS="-Xmx1024m -Xms512m"

# Restart
sudo systemctl restart jenkins
```

---

## 13. Network Configuration

### Nếu K8s Network riêng (không phải Default Switch):

**Trên Hyper-V:**
```powershell
# Tạo Internal Switch cho K8s network
New-VMSwitch -Name "K8s-Network" -SwitchType Internal

# Thêm Jenkins VM vào switch này
Add-VMNetworkAdapter -VMName "Jenkins-Server" -SwitchName "K8s-Network"
```

**Cấu hình IP tĩnh:**
```bash
# On Jenkins VM
sudo nano /etc/netplan/00-installer-config.yaml

# Cấu hình như sau:
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
    eth1:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8]

# Apply
sudo netplan apply
```

---

## 14. Kiểm tra Final

```bash
# Trên Jenkins VM
java -version
docker ps
kubectl get nodes
curl http://localhost:8080

# Tất cả đều OK ✅
```

---

## Next Steps

1. ✅ Setup Jenkins VM hoàn tất
2. Tạo GitHub/GitLab webhook để trigger build
3. Tạo private Docker Registry (nếu cần)
4. Cấu hình backups cho Jenkins data
5. Monitor Jenkins performance

**Khi cần help, cho tôi biết lỗi cụ thể nhé!** 🚀
