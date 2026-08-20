FROM node:20-alpine
WORKDIR /app
COPY . /app
RUN npm ci || npm install
EXPOSE 5173
CMD ["npm","run","dev","--","--host","0.0.0.0"]
