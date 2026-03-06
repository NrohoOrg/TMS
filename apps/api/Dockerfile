FROM node:20-alpine
RUN apk add --no-cache openssl wget
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/

RUN pnpm install --frozen-lockfile || pnpm install

COPY apps/api apps/api
COPY packages/contracts packages/contracts

WORKDIR /app/apps/api
RUN pnpm exec prisma generate
WORKDIR /app
RUN pnpm --filter api build

WORKDIR /app/apps/api
CMD ["node", "dist/apps/api/src/main.js"]
