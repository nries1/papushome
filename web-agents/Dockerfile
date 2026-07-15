FROM mcr.microsoft.com/playwright:v1.61.1-noble AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.61.1-noble
WORKDIR /app
ENV NODE_ENV=production

# Virtual display + VNC so the browser can run non-headless (see
# humanInteraction.ts / bookClass.ts) and actually be watched live via a
# browser tab, instead of running invisibly. The playwright base image
# already ships every Chromium system dependency needed for either mode.
RUN apt-get update && apt-get install -y --no-install-recommends \
      xvfb x11vnc novnc websockify \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

ENV DISPLAY=:99
EXPOSE 3001 6080

CMD ["./start.sh"]
