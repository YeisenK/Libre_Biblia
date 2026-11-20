# Construir desde la raíz del monorepo: docker build -f apps/web/Dockerfile -t bc-web .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
ARG NEXT_PUBLIC_DEFAULT_CATALOG_URL=
ENV NEXT_PUBLIC_DEFAULT_CATALOG_URL=$NEXT_PUBLIC_DEFAULT_CATALOG_URL
RUN pnpm install --frozen-lockfile --filter @bc/web... \
 && pnpm --filter @bc/shared build \
 && pnpm --filter @bc/web build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/out /usr/share/nginx/html
EXPOSE 80
