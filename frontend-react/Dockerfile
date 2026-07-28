# ビルドステージ
FROM node:18-alpine as build

WORKDIR /app

# 依存関係をコピーしてインストール
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN npm run build

# 本番ステージ
FROM nginx:alpine

# ビルド成果物をコピー
COPY --from=build /app/dist /usr/share/nginx/html

# nginx設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
