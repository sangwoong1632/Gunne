# 1. Node.js가 깔린 리눅스(Alpine) 이미지를 가져옵니다.
FROM node:20-alpine

# 2. 컨테이너 내부의 작업 폴더를 정합니다.
WORKDIR /usr/src/app

# 3. 패키지 설치 파일들을 먼저 복사하고 설치합니다.
COPY package*.json ./
RUN npm install

# 4. 나머지 소스 코드를 전부 복사합니다.
COPY . .

# 5. dist 폴더 생성 및 권한 설정 (권한 문제 방지)
RUN mkdir -p dist && chown -R node:node dist

# 6. root가 아닌 node 사용자로 실행 (권한 문제 방지)
# node 이미지는 기본적으로 node 사용자를 제공합니다
USER node

# 7. 서버를 실행합니다. (개발 모드)
CMD ["npm", "run", "start:dev"]