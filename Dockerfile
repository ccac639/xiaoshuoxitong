# 前端（Next.js 14）开发镜像，供 docker-compose 的 frontend 服务使用。
# 注意：仅用于开发期编排；生产请改用 npm run build + start。

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
