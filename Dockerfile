FROM node:20-alpine

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# Vite 개발 서버 포트 노출
EXPOSE 5173

# 개발 서버 실행 (host 0.0.0.0 바인딩)
CMD ["npm", "run", "dev", "--", "--host"]
