FROM node:16.13-alpine
WORKDIR /app

# Install tools.
RUN npm i --global pnpm

# Install dependencies.
COPY ["package.json", "pnpm-lock.yaml", "./"]
RUN pnpm i

# Copy source files.
COPY ["./", "./"]

ENTRYPOINT ["pnpm", "run", "start"]
