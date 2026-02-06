// docker/mongo-init.js
// Script executado automaticamente na primeira inicialização do MongoDB

print('==========================================');
print('Inicializando banco de dados MCP');
print('==========================================');

// Criar database MCP
db = db.getSiblingDB('MCP');

// Criar usuário específico para a aplicação
db.createUser({
  user: 'mcp_user',
  pwd: 'mcp_pass_2026',
  roles: [
    {
      role: 'readWrite',
      db: 'MCP'
    }
  ]
});

print('✅ Usuário mcp_user criado com sucesso');

// Criar coleções principais
db.createCollection('admins');
db.createCollection('configs');
db.createCollection('users');
db.createCollection('cargos');
db.createCollection('competencias');
db.createCollection('entidades');

print('✅ Coleções criadas com sucesso');

// Criar índices para performance
db.users.createIndex({ "userNameGlpi": 1 });
db.users.createIndex({ "cargo": 1 });
db.cargos.createIndex({ "nome": 1 }, { unique: true });
db.competencias.createIndex({ "name": 1 });
db.entidades.createIndex({ "nome": 1 });
db.configs.createIndex({ "tipo": 1 }, { unique: true });

print('✅ Índices criados com sucesso');

// Inserir admin padrão
db.admins.insertOne({
  username: 'admin',
  password: 'db5209f1ee023e9465af060e44fbe1893d525741766db016102fefade7f4d5b2', // Bug*0000 em SHA-256
  nome: 'Administrador',
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date()
});

print('✅ Administrador padrão criado');
print('   Username: admin');
print('   Password: Bug*0000');

print('==========================================');
print('Inicialização concluída com sucesso!');
print('==========================================');