// src/controllers/ticketsController.js
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
 * Buscar tickets novos (status 1 - Novo)
 */
exports.getNewTickets = async (req, res) => {
    try {
        const sessionToken = await getSessionToken();
        const config = await fetchGlpiConfig();
        const { glpi_url: URL, glpi_app_token: GLPI_APP_TOKEN } = config;
        const baseUrl = `${URL}/search/Ticket`;

        const params = new URLSearchParams({
            'criteria[0][field]': '12', // Status field
            'criteria[0][searchtype]': 'equals',
            'criteria[0][value]': '1', // Status: Novo
            'forcedisplay[0]': '2',  // ID
            'forcedisplay[1]': '1',  // Nome
            'forcedisplay[2]': '21', // Conteúdo
            'forcedisplay[3]': '7',  // Categoria (itilcategories_id)
            'forcedisplay[4]': '15', // Data de abertura
            'forcedisplay[5]': '3',  // Prioridade
            'forcedisplay[6]': '80', // Entidade
            'range': '0-100',
            'rawdata': 'true'
        });

        const response = await axios.get(`${baseUrl}?${params.toString()}`, {
            headers: {
                'App-Token': GLPI_APP_TOKEN,
                'Session-Token': sessionToken
            }
        });

        const rawData = response.data.data || [];

        const tickets = rawData.map(ticket => {
            // Limitar preview do conteúdo a 150 caracteres
            const content = ticket['21'] || '';
            const preview = content.length > 150 
                ? content.substring(0, 150) + '...' 
                : content;

            return {
                id: ticket['2'],
                name: ticket['1'],
                content: ticket['21'],
                preview: preview,
                category: ticket['7'] || 'Sem Categoria',
                date: ticket['15'],
                priority: ticket['3'],
                entity: ticket['80'] // ATUALIZADO: Nome da entidade para cálculo de prioridade
            };
        });

        res.status(200).json({
            total: tickets.length,
            tickets: tickets
        });

    } catch (error) {
        console.error('Erro ao buscar tickets novos:', error.message);
        res.status(500).json({ 
            message: "Erro ao buscar tickets novos no GLPI", 
            error: error.response?.data || error.message 
        });
    }
};

/**
 * Buscar tickets atribuídos a um técnico específico
 */
exports.getTechnicianTickets = async (req, res) => {
    try {
        const { technicianId } = req.params;
        const sessionToken = await getSessionToken();
        const config = await fetchGlpiConfig();
        const { glpi_url: URL, glpi_app_token: GLPI_APP_TOKEN } = config;
        const baseUrl = `${URL}/search/Ticket`;

        // Buscar tickets atribuídos (status 2)
        const paramsAtribuidos = new URLSearchParams({
            'criteria[0][field]': '5', // Técnico atribuído
            'criteria[0][searchtype]': 'equals',
            'criteria[0][value]': technicianId,
            'criteria[1][link]': 'AND',
            'criteria[1][field]': '12', // Status
            'criteria[1][searchtype]': 'equals',
            'criteria[1][value]': '2', // Atribuído
            'forcedisplay[0]': '2',  // ID
            'forcedisplay[1]': '1',  // Nome
            'forcedisplay[2]': '7',  // Categoria
            'forcedisplay[3]': '15', // Data
            'forcedisplay[4]': '3',  // Prioridade
            'range': '0-100',
            'rawdata': 'true'
        });

        // Buscar tickets planejados (status 3)
        const paramsPlanejados = new URLSearchParams({
            'criteria[0][field]': '5',
            'criteria[0][searchtype]': 'equals',
            'criteria[0][value]': technicianId,
            'criteria[1][link]': 'AND',
            'criteria[1][field]': '12',
            'criteria[1][searchtype]': 'equals',
            'criteria[1][value]': '3', // Planejado
            'forcedisplay[0]': '2',
            'rawdata': 'true'
        });

        // Buscar tickets pendentes (status 4)
        const paramsPendentes = new URLSearchParams({
            'criteria[0][field]': '5',
            'criteria[0][searchtype]': 'equals',
            'criteria[0][value]': technicianId,
            'criteria[1][link]': 'AND',
            'criteria[1][field]': '12',
            'criteria[1][searchtype]': 'equals',
            'criteria[1][value]': '4', // Pendente
            'forcedisplay[0]': '2',
            'rawdata': 'true'
        });

        const [atribuidosRes, planejadosRes, pendentesRes] = await Promise.all([
            axios.get(`${baseUrl}?${paramsAtribuidos.toString()}`, {
                headers: {
                    'App-Token': GLPI_APP_TOKEN,
                    'Session-Token': sessionToken
                }
            }),
            axios.get(`${baseUrl}?${paramsPlanejados.toString()}`, {
                headers: {
                    'App-Token': GLPI_APP_TOKEN,
                    'Session-Token': sessionToken
                }
            }),
            axios.get(`${baseUrl}?${paramsPendentes.toString()}`, {
                headers: {
                    'App-Token': GLPI_APP_TOKEN,
                    'Session-Token': sessionToken
                }
            })
        ]);

        const atribuidos = atribuidosRes.data.data || [];
        const planejados = planejadosRes.data.totalcount || 0;
        const pendentes = pendentesRes.data.totalcount || 0;

        const ticketsAtribuidos = atribuidos.map(ticket => ({
            id: ticket['2'],
            name: ticket['1'],
            category: ticket['7'] || 'Sem Categoria',
            date: ticket['15'],
            priority: ticket['3']
        }));

        res.status(200).json({
            technicianId: parseInt(technicianId),
            atribuidos: ticketsAtribuidos,
            countAtribuidos: ticketsAtribuidos.length,
            countPlanejados: planejados,
            countPendentes: pendentes
        });

    } catch (error) {
        console.error('Erro ao buscar tickets do técnico:', error.message);
        res.status(500).json({ 
            message: "Erro ao buscar tickets do técnico", 
            error: error.response?.data || error.message 
        });
    }
};