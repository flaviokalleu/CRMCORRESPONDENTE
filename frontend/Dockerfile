# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copiar arquivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar codigo fonte
COPY . .

# Argumentos de build para variaveis de ambiente
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_NOME_SISTEMA=CRMIMOB

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV REACT_APP_NOME_SISTEMA=$REACT_APP_NOME_SISTEMA
ENV REACT_APP_ESTADOS_API_URL=$REACT_APP_API_URL/estados
ENV REACT_APP_MUNICIPIOS_API_URL=$REACT_APP_API_URL/municipios

# Build da aplicacao
RUN npm run build

# Production stage com Nginx
FROM nginx:alpine

# Copiar build para nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copiar configuracao nginx customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta
EXPOSE 80

# Comando para iniciar
CMD ["nginx", "-g", "daemon off;"]
