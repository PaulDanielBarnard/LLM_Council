FROM node:22-alpine

WORKDIR /app

# Copy all source files
COPY ollama-council.html ./
COPY server.js ./
COPY script.js ./
COPY style.css ./

EXPOSE 3000

# --ollama points to your Ollama instance (override at runtime)
CMD ["node", "server.js", "--port", "3000"]
