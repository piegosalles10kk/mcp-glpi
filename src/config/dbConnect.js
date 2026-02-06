const mongoose = require('mongoose');

// Prioriza MONGO_URI do ambiente, senão usa padrão local
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/MCP';

const connectDB = async () => {
    try {
        // Opções de conexão otimizadas
        const options = {
            serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
            socketTimeoutMS: 45000, // Timeout de socket
        };

        await mongoose.connect(MONGO_URI, options);
        
        console.log('✅ MongoDB conectado com sucesso!');
        console.log(`📍 Conectado em: ${MONGO_URI.split('@')[1] || 'localhost'}`);

        // Event listeners
        mongoose.connection.on('error', (err) => {
            console.error(`❌ Erro no Mongoose após conexão: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB desconectado');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconectado');
        });

    } catch (error) {
        console.error(`❌ Erro ao conectar ao MongoDB: ${error.message}`);
        console.error('Detalhes:', error);
        
        // Em produção, não encerra o processo imediatamente
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('✅ Conexão MongoDB fechada através do encerramento da aplicação');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao fechar conexão:', err);
        process.exit(1);
    }
});

module.exports = connectDB;