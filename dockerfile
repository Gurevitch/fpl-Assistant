# Step 1: Build Go backend
FROM golang:1.24.2 AS backend-builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download


COPY backend ./backend
COPY backend/internal ./internal  


RUN CGO_ENABLED=0 GOOS=linux go build -o main ./backend/cmd/main.go

# Step 2: Build React frontend
FROM node:18 AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install

COPY frontend/. ./
RUN yarn build

# Step 3: Combine backend binary and frontend build into final container
FROM alpine:latest

WORKDIR /app

COPY --from=backend-builder /app/main .
COPY --from=frontend-builder /frontend/build ./frontend/build
COPY backend/.env .env
COPY assets ./assets

EXPOSE 8080

CMD ["./main"]
