FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Cloud Run/Functions set PORT; default to 8080
ENV PORT=8080

CMD ["npm", "start"]
