# MCP BugBusters 🐛

Sistema de Gestão de Service Desk integrado com GLPI, desenvolvido para otimizar a distribuição de chamados técnicos através de automação inteligente.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-ISC-orange.svg)

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Características](#-características)
- [Arquitetura](#-arquitetura)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [API Endpoints](#-api-endpoints)
- [Automação n8n](#-automação-n8n)
- [Docker](#-docker)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Contribuindo](#-contribuindo)

## 🎯 Visão Geral

O **MCP BugBusters** é uma solução completa de gestão de service desk que se integra perfeitamente com o GLPI. O sistema foi projetado para automatizar a categorização e distribuição de tickets técnicos, utilizando uma matriz de prioridades configurável e competências técnicas mapeadas.

### Principais Funcionalidades

- 🎫 **Gestão Inteligente de Tickets**: Sistema de priorização baseado em entidade e urgência
- 👥 **Gestão de Técnicos**: Cadastro com cargos e competências específicas
- 📊 **Dashboard em Tempo Real**: Visualização de métricas e KPIs
- 🤖 **Automação via n8n**: Categorização e encaminhamento automático de tickets
- 🏢 **Matriz de Prioridades**: Configuração de pesos por entidade/empresa
- 📈 **Estatísticas Detalhadas**: Performance individual de técnicos

## ✨ Características

### Módulo de Gestão de Técnicos
- Importação direta de técnicos do GLPI
- Atribuição de cargos com competências específicas
- Limites configuráveis de chamados simultâneos
- Regime de evasão para situações críticas

### Módulo de Cargos e Competências
- Sincronização automática de categorias ITIL do GLPI
- Criação de cargos com múltiplas competências
- Configuração de limites normais e de evasão

### Matriz de Priorização
- Configuração de prioridade por entidade (1-5)
- Cálculo automático de urgência baseado em:
  - Prioridade da entidade
  - Urgência do ticket no GLPI
  - Tempo de espera
- Indicadores visuais de atraso crítico/urgente

### Dashboard Kanban
- Visualização de tickets novos em tempo real
- Cards de técnicos com fila de trabalho
- Atualização automática a cada 15 segundos
- Indicadores de atraso por tempo e prioridade

### Estatísticas de Performance
- Gráficos de tickets na fila por status
- Top 5 categorias mais atendidas
- Taxa de resolução
- Produtividade diária média

## 🏗 Arquitetura

```
┌─────────────────┐
│   GLPI (API)    │
└────────┬────────┘
         │
         ├──────────────────────┐
         │                      │
┌────────▼────────┐    ┌────────▼────────┐
│  MCP BugBusters │    │      n8n        │
│   (Backend)     │◄───┤   (Automação)   │
└────────┬────────┘    └─────────────────┘
         │
    ┌────┴────┐
    │ MongoDB │
    └─────────┘
         │
┌────────▼────────┐
│   Dashboard     │
│   (Frontend)    │
└─────────────────┘
```

### Componentes

- **Backend**: Node.js + Express
- **Banco de Dados**: MongoDB 7.0
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Automação**: n8n (workflows externos)
- **Containerização**: Docker + Docker Compose
- **API GLPI**: Integração via REST API

## 📦 Pré-requisitos

- Node.js >= 18.0.0
- MongoDB 7.0
- Docker e Docker Compose (opcional, recomendado)
- GLPI 10.x com API REST habilitada
- n8n para automações

## 🚀 Instalação

### Opção 1: Com Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/mcp-bugbusters.git
cd mcp-bugbusters

# Inicie os containers
docker-compose up -d

# A aplicação estará disponível em http://localhost:2500
```

### Opção 2: Manual

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/mcp-bugbusters.git
cd mcp-bugbusters

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Inicie o MongoDB (em outro terminal)
mongod

# Inicie a aplicação
npm start
```

## ⚙ Configuração

### 1. Variáveis de Ambiente

Edite o arquivo `.env`:

```env
# MongoDB
MONGO_URI=mongodb://mcp_user:mcp_pass_2026@mongodb:27017/MCP?authSource=MCP

# Server
PORT=2500
NODE_ENV=production

# GLPI (Opcional - pode ser configurado via interface)
GLPI_URL=https://seu-glpi.com/apirest.php
GLPI_APP_TOKEN=seu_app_token
GLPI_USER_LOGIN=seu_usuario
GLPI_USER_PASSWORD=sua_senha
```

### 2. Configuração Inicial

1. Acesse: `http://localhost:2500/login.html`
2. **Login padrão**:
   - Usuário: `admin`
   - Senha: `Bug*0000`

3. Navegue até **Configurações** e preencha:
   - URL da API GLPI
   - App Token
   - Credenciais de usuário
   - Habilite automações (se desejado)

4. Teste a conexão antes de salvar

### 3. Sincronização de Dados

1. Vá para **Sincronização GLPI**
2. Clique em **Sincronizar** para importar categorias ITIL
3. Importe os técnicos necessários
4. Configure cargos e competências
5. Configure matriz de prioridades nas entidades

## 💻 Uso

### Fluxo de Trabalho Básico

1. **Configuração Inicial**
   - Configure credenciais do GLPI
   - Sincronize categorias ITIL
   - Importe técnicos

2. **Criação de Cargos**
   - Crie cargos (ex: "Analista N1", "Analista N2")
   - Atribua competências (categorias ITIL)
   - Defina limites de chamados

3. **Gestão de Técnicos**
   - Atribua cargos aos técnicos
   - Configure informações de contato

4. **Matriz de Prioridades**
   - Configure prioridade de cada entidade (1-5)
   - Adicione notas sobre regras específicas

5. **Dashboard Kanban**
   - Monitore tickets novos
   - Acompanhe fila dos técnicos
   - Visualize indicadores de atraso

### Dashboard Kanban

O dashboard principal oferece:
- **Cards de Técnicos**: Visualização da fila de cada técnico
- **Tickets Novos**: Lista ordenada por prioridade calculada
- **Atualização Automática**: Refresh a cada 15 segundos
- **Indicadores Visuais**: Badges de atraso crítico/urgente

### Estatísticas de Técnicos

Clique no nome de qualquer técnico para ver:
- Tickets na fila (atribuído, planejado, pendente)
- Histórico de tickets finalizados (30/90/365 dias)
- Top 5 categorias mais atendidas
- Taxa de resolução e produtividade

## 🔌 API Endpoints

### Autenticação
```http
POST /api/auth/login
POST /api/auth/change-password
GET  /api/auth/validate
```

### Configurações
```http
GET  /api/config/glpi
POST /api/config/glpi
POST /api/config/glpi/test
POST /api/config/dashboard/technicians
DELETE /api/config/dashboard/technicians/:id
```

### Usuários (Técnicos)
```http
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Cargos
```http
GET    /api/cargos
GET    /api/cargos/:id
POST   /api/cargos
PUT    /api/cargos/:id
DELETE /api/cargos/:id
```

### Competências
```http
GET    /api/competencias
GET    /api/competencias/:id
GET    /api/competencias/sync
DELETE /api/competencias/:id
```

### GLPI (Proxy)
```http
GET /api/glpi/tecnicos
GET /api/glpi/categorias
GET /api/glpi/entidades
GET /api/glpi/tickets/stats
GET /api/glpi/tecnicos/:id/stats
```

### Tickets
```http
GET /api/tickets/new
GET /api/tickets/technician/:id
```

### Entidades
```http
GET    /api/entidades-config
GET    /api/entidades-config/:id
POST   /api/entidades-config
DELETE /api/entidades-config/:id
```

## 🤖 Automação n8n

A automação do sistema é realizada através do n8n, um workflow automation tool. Os workflows fornecidos realizam:

### Fluxo de Categorização e Encaminhamento

```mermaid
graph LR
    A[Webhook GLPI] --> B[Buscar Config]
    B --> C{Automação<br/>Ativa?}
    C -->|Sim| D[Calcular<br/>Prioridade]
    C -->|Não| Z[Fim]
    D --> E[Buscar<br/>Categoria]
    E --> F[Buscar<br/>Técnico]
    F --> G[Atribuir<br/>Ticket]
    G --> H[Atualizar<br/>GLPI]
```

### Instalação dos Workflows

1. **GESTOR_CATEGORIA_SERVICE_DESK**
   - Responsável pela categorização automática
   - Importar: `GESTOR_CATEGORIA_SERVICE_DESK__1_.json`

2. **GESTOR_SERVICE_DESK**
   - Responsável pelo encaminhamento automático
   - Importar: `GESTOR_SERVICE_DESK__3_.json`

### Configuração no n8n

1. Importe os arquivos JSON no n8n
2. Configure o webhook do GLPI para apontar para o n8n
3. Ajuste as credenciais nos nodes HTTP Request
4. Ative os workflows

### Lógica de Encaminhamento

O sistema considera:
- ✅ Competências do técnico (cargo)
- ✅ Carga atual de trabalho
- ✅ Limite de chamados normais
- ✅ Limite de chamados em evasão
- ✅ Prioridade do ticket
- ✅ Disponibilidade do técnico

## 🐳 Docker

### Serviços Incluídos

1. **MongoDB**: Banco de dados
2. **MCP App**: Aplicação principal
3. **Mongo Express**: Interface web para MongoDB (opcional)

### Comandos Úteis

```bash
# Iniciar serviços
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Parar serviços
docker-compose down

# Rebuild
docker-compose up -d --build

# Acessar shell do container
docker exec -it mcp-app sh
```

### Volumes Persistentes

- `mcp_mongodb_data`: Dados do MongoDB
- `mcp_mongodb_config`: Configuração do MongoDB
- `mcp_app_logs`: Logs da aplicação

### Portas Expostas

- `2500`: Aplicação principal
- `27017`: MongoDB
- `8081`: Mongo Express (admin/admin)

## 📁 Estrutura do Projeto

```
mcp-bugbusters/
├── docker/
│   └── mongo-init.js          # Script de inicialização do MongoDB
├── src/
│   ├── config/
│   │   └── dbConnect.js       # Configuração do MongoDB
│   ├── controllers/           # Controladores da API
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── cargoController.js
│   │   ├── competenciaController.js
│   │   ├── glpiController.js
│   │   ├── ticketsController.js
│   │   ├── configController.js
│   │   └── entidadeController.js
│   ├── models/                # Modelos do Mongoose
│   │   ├── admin.js
│   │   ├── config.js
│   │   └── user.js
│   ├── routes/                # Rotas da API
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── cargoRoutes.js
│   │   ├── competenciaRoutes.js
│   │   ├── glpiRoutes.js
│   │   ├── ticketsRoutes.js
│   │   ├── configRoutes.js
│   │   └── entidadeRoutes.js
│   └── services/
│       └── glpiAuthService.js # Serviço de autenticação GLPI
├── view/                      # Frontend
│   ├── index.html            # Dashboard principal
│   ├── login.html            # Tela de login
│   ├── kanban.html           # Dashboard Kanban
│   ├── tech-stats.html       # Estatísticas de técnico
│   ├── style.css             # Estilos principais
│   ├── additional-styles.css # Estilos adicionais
│   ├── kanban.css            # Estilos do Kanban
│   ├── login.css             # Estilos do login
│   ├── config.js             # Configuração da API
│   ├── script.js             # Scripts principais
│   ├── login.js              # Scripts de login
│   ├── kanban.js             # Scripts do Kanban
│   └── tech-stats.js         # Scripts de estatísticas
├── .dockerignore
├── .env                       # Variáveis de ambiente
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── app.js                     # Entrada da aplicação
├── package.json
└── README.md
```

## 🔧 Desenvolvimento

### Executar em Modo Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar com nodemon (auto-reload)
npm install -g nodemon
nodemon app.js

# Executar testes (se disponíveis)
npm test
```

### Variáveis de Ambiente de Desenvolvimento

```env
NODE_ENV=development
PORT=2500
MONGO_URI=mongodb://localhost:27017/MCP
```

## 🛡 Segurança

- ✅ Senhas hasheadas com SHA-256
- ✅ Sessões com tokens
- ✅ Validação de entrada em todos os endpoints
- ✅ CORS configurado
- ✅ MongoDB com autenticação
- ✅ Containerização isolada

## 📊 Algoritmo de Priorização

O sistema calcula a prioridade final de cada ticket usando:

```javascript
nivelFinal = max(prioridadeEntidade, urgenciaTicket)
```

**Indicadores de Atraso:**
- 🔴 **CRÍTICO**: Prioridade 5 + mais de 10 minutos aguardando
- 🟡 **URGENTE**: Prioridade 4 + mais de 30 minutos aguardando

**Ordenação:**
1. Nível de prioridade (descendente)
2. Data de abertura (ascendente)

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request


## 👥 Equipe BugBusters

Desenvolvido com ❤️ por piego para otimização de service desks.

## 📞 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato com a equipe de desenvolvimento.

---

**MCP BugBusters** - Sistema de Gestão de Service Desk v1.0.0