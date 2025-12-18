# ---------- Stage 1: Build frontend ----------
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy only package files for caching
COPY draw.it.client/package*.json ./
RUN npm ci

# Copy frontend source
COPY draw.it.client/ ./

# Build React app
RUN npm run build

# ---------- Stage 2: Build backend ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build

WORKDIR /src

# Copy backend csproj and restore
COPY Draw.it.Server/Draw.it.Server.csproj ./Draw.it.Server/
RUN dotnet restore Draw.it.Server/Draw.it.Server.csproj

# Copy backend source
COPY Draw.it.Server/ ./Draw.it.Server/

# Copy built frontend into backend wwwroot
COPY --from=frontend-build /app/dist/ ./Draw.it.Server/wwwroot/

# Publish backend for production
RUN dotnet publish Draw.it.Server/Draw.it.Server.csproj -c Release -o /app/publish

# ---------- Stage 3: Runtime image ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app

# Copy published backend + frontend
COPY --from=backend-build /app/publish/ ./

# Expose HTTP port
EXPOSE 8080

# Use environment variable to force Production
ENV ASPNETCORE_ENVIRONMENT=Production

# Entry point
ENTRYPOINT ["dotnet", "Draw.it.Server.dll"]
