const { getSessionToken } = require('../services/glpiAuthService');
const { Config } = require('../models/config');
const axios = require('axios');



// Função auxiliar para buscar a configuração
const fetchGlpiConfig = async () => {
    const config = await Config.findOne({ tipo: 'glpi' });
    if (!config) throw new Error("Configurações do GLPI não encontradas no banco de dados.");
    return config;
};        


/**
 * Consulta apenas usuários com perfil técnico (Proxy)
 */
exports.getGlpiTechnicians = async (req, res) => {
    try {
        const sessionToken = await getSessionToken();

        const config = await fetchGlpiConfig();
        const { glpi_url: URL, glpi_app_token: GLPI_APP_TOKEN } = config;
        const baseUrl = `${URL}/search/User`;
        
        const params = new URLSearchParams({
            'criteria[0][field]': '20',      
            'criteria[0][searchtype]': 'equals',
            'criteria[0][value]': '6',       
            'forcedisplay[0]': '1',          
            'forcedisplay[1]': '2',          
            'forcedisplay[2]': '9',          
            'forcedisplay[3]': '34',         
            'forcedisplay[4]': '5',          
            'forcedisplay[5]': '80',         
            'range': '0-500',                
            'rawdata': 'true'
        });

        const response = await axios.get(`${baseUrl}?${params.toString()}`, {
            headers: {
                'App-Token': GLPI_APP_TOKEN,
                'Session-Token': sessionToken
            }
        });

        const rawData = response.data.data || [];

        const technicians = rawData.map(u => ({
            id: u["2"],
            login: u["1"],
            nome: u["9"],
            sobrenome: u["34"],
            email: u["5"],
            entidade: u["80"],
            is_technician: true
        }));

        res.status(200).json(technicians);

    } catch (error) {
        console.error('Erro na consulta de técnicos:', error.message);
        res.status(500).json({ 
            message: "Erro ao consultar usuários técnicos no GLPI", 
            error: error.response?.data || error.message 
        });
    }
};

/**
 * Consulta categorias ITIL (Competências) em tempo real (Proxy)
 */
exports.getGlpiCategories = async (req, res) => {
    try {
        const sessionToken = await getSessionToken();
        const config = await fetchGlpiConfig();
        const { glpi_url: URL, glpi_app_token: GLPI_APP_TOKEN } = config;
        const url = `${URL}/ITILCategory?range=0-999&is_recursive=true`;

        const response = await axios.get(url, {
            headers: {
                'App-Token': GLPI_APP_TOKEN,
                'Session-Token': sessionToken
            }
        });

        res.status(200).json(response.data);

    } catch (error) {
        res.status(500).json({ 
            message: "Erro ao consultar categorias no GLPI", 
            error: error.message 
        });
    }
};

/**
 * Consulta Entidades do GLPI em tempo real (Proxy)
 */
exports.getGlpiEntities = async (req, res) => {
    try {
        const sessionToken = await getSessionToken();
        const config = await fetchGlpiConfig();
        const { glpi_url: URL, glpi_app_token: GLPI_APP_TOKEN } = config;

        // URL fornecida para busca de Entidades
        const url = `${URL}/Entity?range=0-999`;

        const response = await axios.get(url, {
            headers: {
                'App-Token': GLPI_APP_TOKEN,
                'Session-Token': sessionToken
            }
        });

        // Mapeia para manter o padrão amigável caso deseje
        const entities = response.data.map(ent => ({
            id: ent.id,
            nome: ent.completename || ent.name,
            level: ent.level
        }));

        res.status(200).json(entities);

    } catch (error) {
        console.error('Erro ao consultar entidades:', error.message);
        res.status(500).json({ 
            message: "Erro ao consultar entidades no GLPI", 
            error: error.message 
        });
    }
};

/**
 * Consulta estatísticas de tickets por status
 */
exports.getTicketStats = async (req, res) => {
    try {
        const sessionToken = await getSessionToken();
        const config = await fetchGlpiConfig();
        const { glpi_url: URL, glpi_app_token: GLPI_APP_TOKEN } = config;
        const baseUrl = `${URL}/search/Ticket`;

        // Status: 1=Novo, 2=Em atendimento (Atribuído), 3=Planejado, 4=Pendente
        const statusQueries = [
            { name: 'novos', status: 1 },
            { name: 'atribuidos', status: 2 },
            { name: 'planejados', status: 3 },
            { name: 'pendentes', status: 4 }
        ];

        const results = {};

        for (const query of statusQueries) {
            const params = new URLSearchParams({
                'criteria[0][field]': '12', // Status field
                'criteria[0][searchtype]': 'equals',
                'criteria[0][value]': query.status.toString(),
                'forcedisplay[0]': '2', // ID
                'rawdata': 'true'
            });

            const response = await axios.get(`${baseUrl}?${params.toString()}`, {
                headers: {
                    'App-Token': GLPI_APP_TOKEN,
                    'Session-Token': sessionToken
                }
            });

            results[query.name] = response.data.totalcount || 0;
        }

        res.status(200).json(results);

    } catch (error) {
        console.error('Erro ao consultar estatísticas de tickets:', error.message);
        res.status(500).json({ 
            message: "Erro ao consultar estatísticas de tickets", 
            error: error.message 
        });
    }
};

/**
 * Consulta estatísticas de um técnico específico
 */
exports.getTechnicianStats = async (req, res) => {
    try {
        

        const { technicianId } = req.params;
        const sessionToken = await getSessionToken();
        const config = await fetchGlpiConfig();
        const { glpi_url: URL, glpi_app_token: GLPI_APP_TOKEN } = config;
        const baseUrl = `${URL}/search/Ticket`;

        console.log(`\n========================================`);
        console.log(`Buscando estatísticas do técnico ID: ${technicianId}`);
        console.log(`========================================\n`);

        // 1. Tickets na fila do técnico (status 2=Atribuído, 3=Planejado, 4=Pendente)
        const queueStatusQueries = [
            { name: 'atribuido', status: 2, color: '#10b981' },
            { name: 'pendente', status: 4, color: '#fbbf24' },
            { name: 'planejado', status: 3, color: '#3b82f6' }
        ];

        const queueStats = [];

        for (const query of queueStatusQueries) {
            const params = new URLSearchParams({
                'criteria[0][field]': '5', // Técnico atribuído
                'criteria[0][searchtype]': 'equals',
                'criteria[0][value]': technicianId,
                'criteria[1][link]': 'AND',
                'criteria[1][field]': '12', // Status
                'criteria[1][searchtype]': 'equals',
                'criteria[1][value]': query.status.toString(),
                'forcedisplay[0]': '2',
                'rawdata': 'true'
            });

            const response = await axios.get(`${baseUrl}?${params.toString()}`, {
                headers: {
                    'App-Token': GLPI_APP_TOKEN,
                    'Session-Token': sessionToken
                }
            });

            queueStats.push({
                label: query.name,
                value: response.data.totalcount || 0,
                color: query.color
            });
        }

        console.log('✓ Queue stats:', queueStats);

        // 2. Buscar tickets finalizados do técnico ESPECIFICAMENTE
        // IMPORTANTE: O OR deve ser usado corretamente para não pegar tickets de outros técnicos
        
        // Primeira busca: Status 5 (Solucionado)
        const paramsSolucionados = new URLSearchParams({
            'criteria[0][field]': '5', // Técnico atribuído (users_id_tech)
            'criteria[0][searchtype]': 'equals',
            'criteria[0][value]': technicianId,
            'criteria[1][link]': 'AND',
            'criteria[1][field]': '12', // Status
            'criteria[1][searchtype]': 'equals',
            'criteria[1][value]': '5', // Solucionado
            'forcedisplay[0]': '2',  // ID
            'forcedisplay[1]': '5',  // Técnico (users_id_tech) - IMPORTANTE para validar
            'forcedisplay[2]': '7',  // Categoria (itilcategories_id)
            'forcedisplay[3]': '15', // Data (date)
            'forcedisplay[4]': '16', // Data de fechamento (closedate)
            'forcedisplay[5]': '19', // Data de solução (solvedate)
            'forcedisplay[6]': '18', // Data de última atualização (date_mod)
            'range': '0-9999',
            'rawdata': 'true'
        });

        console.log(`Buscando tickets solucionados (status 5) do técnico ${technicianId}...`);
        const solucionadosResponse = await axios.get(`${baseUrl}?${paramsSolucionados.toString()}`, {
            headers: {
                'App-Token': GLPI_APP_TOKEN,
                'Session-Token': sessionToken
            }
        });

        const ticketsSolucionados = solucionadosResponse.data.data || [];
        console.log(`✓ Tickets solucionados encontrados: ${ticketsSolucionados.length}`);

        // Segunda busca: Status 6 (Fechado)
        const paramsFechados = new URLSearchParams({
            'criteria[0][field]': '5', // Técnico atribuído
            'criteria[0][searchtype]': 'equals',
            'criteria[0][value]': technicianId,
            'criteria[1][link]': 'AND',
            'criteria[1][field]': '12', // Status
            'criteria[1][searchtype]': 'equals',
            'criteria[1][value]': '6', // Fechado
            'forcedisplay[0]': '2',  // ID
            'forcedisplay[1]': '5',  // Técnico (users_id_tech)
            'forcedisplay[2]': '7',  // Categoria
            'forcedisplay[3]': '15', // Data
            'forcedisplay[4]': '16', // Data de fechamento
            'forcedisplay[5]': '19', // Data de solução
            'forcedisplay[6]': '18', // Data de última atualização
            'range': '0-9999',
            'rawdata': 'true'
        });

        console.log(`Buscando tickets fechados (status 6) do técnico ${technicianId}...`);
        const fechadosResponse = await axios.get(`${baseUrl}?${paramsFechados.toString()}`, {
            headers: {
                'App-Token': GLPI_APP_TOKEN,
                'Session-Token': sessionToken
            }
        });

        const ticketsFechados = fechadosResponse.data.data || [];
        console.log(`✓ Tickets fechados encontrados: ${ticketsFechados.length}`);

        // Combinar arrays (sem duplicatas)
        const ticketsFinalizados = [...ticketsSolucionados, ...ticketsFechados];
        console.log(`✓ Total de tickets finalizados encontrados: ${ticketsFinalizados.length}`);

        // 3. Contar tickets finalizados por período usando INTERVALOS MÓVEIS
        const now = new Date();
        
        // Calcular datas para os últimos X dias
        const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const last90Days = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        const last365Days = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

        let monthCount = 0;     // Últimos 30 dias
        let quarterCount = 0;   // Últimos 90 dias
        let yearCount = 0;      // Últimos 365 dias
        let totalCount = ticketsFinalizados.length;
        let ticketsWithoutDate = 0;

        console.log('\nPeríodos de referência (INTERVALOS MÓVEIS):');
        console.log(`- Últimos 30 dias:  ${last30Days.toISOString().split('T')[0]} até ${now.toISOString().split('T')[0]}`);
        console.log(`- Últimos 90 dias:  ${last90Days.toISOString().split('T')[0]} até ${now.toISOString().split('T')[0]}`);
        console.log(`- Últimos 365 dias: ${last365Days.toISOString().split('T')[0]} até ${now.toISOString().split('T')[0]}\n`);

        // Agrupar tickets por mês/ano para análise
        const ticketsByMonth = {};
        let ticketsFromOtherTechs = 0;

        ticketsFinalizados.forEach((ticket, index) => {
            // VALIDAÇÃO: Verificar se o ticket realmente pertence ao técnico
            // Campo 5 = users_id_tech (técnico atribuído)
            const ticketTechId = ticket['5'];
            
            if (ticketTechId && ticketTechId.toString() !== technicianId.toString()) {
                ticketsFromOtherTechs++;
                if (ticketsFromOtherTechs <= 3) {
                    console.log(`  ⚠️ AVISO: Ticket #${ticket['2']} pertence ao técnico ${ticketTechId}, não ${technicianId}`);
                }
                return; // Pular este ticket
            }
            
            // Tentar múltiplos campos de data em ordem de prioridade
            const dateStr = ticket['19'] || ticket['16'] || ticket['15'] || ticket['18'];
            
            if (!dateStr) {
                ticketsWithoutDate++;
                return;
            }
            
            // Parse da data
            let closeDate;
            try {
                closeDate = new Date(dateStr);
                
                // Validar se é uma data válida
                if (isNaN(closeDate.getTime())) {
                    ticketsWithoutDate++;
                    return;
                }
            } catch (e) {
                ticketsWithoutDate++;
                return;
            }
            
            // Debug: mostrar primeiros 3 tickets VÁLIDOS
            if (index < 3) {
                const campo = ticket['19'] ? 'solvedate(19)' : ticket['16'] ? 'closedate(16)' : ticket['15'] ? 'date(15)' : 'date_mod(18)';
                console.log(`  Ticket #${ticket['2']} (Tech: ${ticketTechId}): ${closeDate.toISOString().split('T')[0]} [${campo}]`);
            }
            
            // Agrupar por mês/ano
            const monthKey = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, '0')}`;
            ticketsByMonth[monthKey] = (ticketsByMonth[monthKey] || 0) + 1;
            
            // Contar por período (comparação direta de timestamps)
            const closeTime = closeDate.getTime();
            const nowTime = now.getTime();
            
            // Últimos 30 dias
            if (closeTime >= last30Days.getTime() && closeTime <= nowTime) {
                monthCount++;
            }
            
            // Últimos 90 dias
            if (closeTime >= last90Days.getTime() && closeTime <= nowTime) {
                quarterCount++;
            }
            
            // Últimos 365 dias
            if (closeTime >= last365Days.getTime() && closeTime <= nowTime) {
                yearCount++;
            }
        });

        console.log(`\n✓ Contagem por período (INTERVALOS MÓVEIS):`);
        console.log(`  - Últimos 30 dias:  ${monthCount} tickets`);
        console.log(`  - Últimos 90 dias:  ${quarterCount} tickets`);
        console.log(`  - Últimos 365 dias: ${yearCount} tickets`);
        console.log(`  - Total geral:      ${totalCount} tickets`);
        console.log(`  - Sem data:         ${ticketsWithoutDate} tickets`);
        
        if (ticketsFromOtherTechs > 0) {
            console.log(`  - ⚠️ FILTRADOS (outros técnicos): ${ticketsFromOtherTechs} tickets`);
        }

        // Mostrar distribuição por mês
        console.log(`\n✓ Distribuição por mês (últimos 12 meses):`);
        const sortedMonths = Object.keys(ticketsByMonth).sort().reverse().slice(0, 12);
        sortedMonths.forEach(month => {
            console.log(`  ${month}: ${ticketsByMonth[month]} tickets`);
        });

        // 4. Top 5 categorias DESTE TÉCNICO ESPECIFICAMENTE
        const categoryCount = {};
        ticketsFinalizados.forEach(ticket => {
            // Campo 7 agora está no índice 2 (após adicionar campo 5 no índice 1)
            const category = ticket['7'] || 'Sem Categoria';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        console.log(`\n✓ Top 5 categorias:`, topCategories.map(c => `${c.name} (${c.count})`).join(', '));
        console.log(`\n========================================\n`);

        res.status(200).json({
            queueStats,
            finalizadosCount: {
                month: monthCount,
                quarter: quarterCount,
                year: yearCount,
                total: totalCount
            },
            topCategories,
            debug: {
                ticketsWithoutDate,
                distributionByMonth: ticketsByMonth
            }
        });

    } catch (error) {
        console.error('❌ Erro ao consultar estatísticas do técnico:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            message: "Erro ao consultar estatísticas do técnico", 
            error: error.message 
        });
    }
};