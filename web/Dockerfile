# ── Web image (Vite build served by nginx, proxying the API) ────
FROM node:20-slim AS build
WORKDIR /app

COPY package.json ./
COPY tsconfig.base.json ./
COPY packages/core/package.json packages/core/package.json
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm install

COPY packages/core packages/core
COPY web web
# core types are referenced by the app during type-check
RUN npm run build:core && npm run build:web

# ── Serve ───────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
