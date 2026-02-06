# Use Node.js LTS (Long Term Support)
FROM node:18-alpine

# Informações do mantenedor
LABEL maintainer="BugBusters Team"
LABEL description="MCP BugBusters - Sistema de Gestão de Service Desk"

# Criar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretório para arquivos estáticos
RUN mkdir -p /app/view

# Expor porta da aplicação
EXPOSE 2500

# Variáveis de ambiente padrão (podem ser sobrescritas no docker-compose)
ENV NODE_ENV=production
ENV PORT=2500

# Comando para iniciar a aplicação
CMD ["node", "app.js"]