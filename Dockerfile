FROM node:24-slim AS base

ENV NPM_HOME="/npm"
ENV PATH="$NPM_HOME:$PATH"

RUN corepack enable && corepack prepare npm@10.30.0 --activate

WORKDIR /app

COPY package.json npm-lock.json ./
COPY prisma ./prisma/

# ------- Dependencies -------
FROM base AS deps

RUN npm install --frozen-lockfile

# ------- Build -------
FROM deps AS build

COPY . .

RUN npm run build && cp -r src/generated dist/generated

# ------- Production -------
FROM base AS production

RUN npm install --frozen-lockfile --prod --ignore-scripts

COPY --from=build /app/dist ./dist

CMD ["node", "dist/index.js"]