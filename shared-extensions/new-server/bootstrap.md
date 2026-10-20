### 新建用户
```bash
# 创建用户(自动建 home 目录,指定默认 shell)
sudo useradd -m -s /bin/bash cheng-dev
# 设置密码
sudo passwd 123123213213
# 添加sudo权限
usermod -aG sudo cheng-dev # 
usermod -aG wheel cheng-dev # centos
```
### 安装

#### tmux
```bash
sudo yum install -y tmux
tmux -V # 验证版本
```
#### git
```bash
sudo apt install -y git curl
sudo yum install -y git curl

git --version   # 验证
```
#### nvm
```bash
# 安装 nvm(版本号建议去 https://github.com/nvm-sh/nvm 确认最新,这里是常见稳定版)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash

# 让当前 shell 立即生效(或者关掉重开终端)
source ~/.bashrc

# 装 Node LTS 并设为默认
nvm install --lts
nvm alias default 'lts/*'

node --version && npm --version   # 验证
```

#### agent
```bash
npm install -g @anthropic-ai/claude-code@latest
claude --version

npm install -g @openai/codex
codex --version   # 验证
```