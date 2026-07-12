FROM node:18-alpine

WORKDIR /app

# 复制项目文件
COPY backend ./backend
COPY frontend ./frontend

# 安装并构建前端
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps || npm install
RUN npm run build || (echo "Frontend build failed" && ls -la /app/frontend/)

# 确保前端构建输出目录存在
RUN ls -la /app/frontend/dist || echo "dist directory not found"

# 复制前端构建输出到后端的 public 目录
RUN mkdir -p /app/backend/public
RUN cp -r /app/frontend/dist /app/backend/public/dist || echo "Copy failed, dist might not exist"
RUN ls -la /app/backend/public/ || echo "public directory not found"

# 安装后端依赖
WORKDIR /app/backend
RUN npm install

# 暴露端口
EXPOSE 8080

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8080
ENV CORS_ORIGIN=*

# 启动后端服务
CMD ["npm", "start"]
