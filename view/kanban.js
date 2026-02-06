// view/kanban.js

let techniciansList = [];
let dashboardConfig = null;
let glpiBaseUrl = '';
let autoRefreshInterval = null;
let matrizPrioridades = [];

// Constantes para cálculo de prioridade
const TEMPO_URG_PRIO_5 = 10; // minutos
const TEMPO_URG_PRIO_4 = 30; // minutos

document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    initLogout();
    loadDashboardConfig();
    startAutoRefresh();
});

// --- AUTENTICAÇÃO E LOGOUT ---
function checkAuthentication() {
    const token = localStorage.getItem('mcp_token');
    if (!token) window.location.href = '/login.html';
}

function initLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('Deseja realmente sair do sistema?')) {
                stopAutoRefresh();
                localStorage.removeItem('mcp_token');
                localStorage.removeItem('mcp_user');
                window.location.href = '/login.html';
            }
        });
    }
}

// --- CONTROLE DE ATUALIZAÇÃO ---
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => renderDashboard(), 15000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// --- CARREGAMENTO DE DADOS ---
async function loadDashboardConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/config/glpi`);
        dashboardConfig = await response.json();
        if (dashboardConfig.glpi_url) glpiBaseUrl = dashboardConfig.glpi_url.replace('/apirest.php', '');
        await loadAllTechnicians();
        await loadMatrizPrioridades();
        await renderDashboard();
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
    }
}

async function loadAllTechnicians() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        techniciansList = await response.json();
    } catch (error) {
        console.error('Erro ao carregar técnicos:', error);
    }
}

async function loadMatrizPrioridades() {
    try {
        const response = await fetch(`${API_BASE_URL}/entidades-config`);
        matrizPrioridades = await response.json();
        console.log('📊 Matriz de prioridades carregada:', matrizPrioridades);
    } catch (error) {
        console.error('Erro ao carregar matriz de prioridades:', error);
        matrizPrioridades = [];
    }
}

async function renderDashboard() {
    await renderTechniciansSection();
    await renderNewTicketsSection();
}

// --- SEÇÃO DE TÉCNICOS ---
async function renderTechniciansSection() {
    const container = document.getElementById('technicians-container');
    if (!container) return;

    const technicianIds = dashboardConfig.tecnicosDashboard || [];

    const hasEmptyState = container.querySelector('.empty-state');
    if (hasEmptyState || (technicianIds.length > 0 && container.querySelector('.loading-placeholder'))) {
        container.innerHTML = '';
    }

    if (technicianIds.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><i class="bi bi-person-plus"></i><p>Nenhum técnico adicionado</p></div>`;
        container.appendChild(createAddTechnicianCard());
        return;
    }

    const existingCards = new Map();
    container.querySelectorAll('.tech-summary-card').forEach(card => {
        const techId = card.getAttribute('data-tech-id');
        if (techId) existingCards.set(techId.toString(), card);
    });

    for (const techId of technicianIds) {
        const technician = techniciansList.find(t => t._id.toString() === techId.toString());
        if (!technician) continue;

        if (existingCards.has(techId.toString())) {
            await updateTechnicianCard(existingCards.get(techId.toString()), technician);
            existingCards.delete(techId.toString());
        } else {
            const card = await createTechnicianCard(technician);
            const addCard = container.querySelector('.add-tech-card');
            if (addCard) container.insertBefore(card, addCard);
            else container.appendChild(card);
        }
    }
    existingCards.forEach(card => card.remove());
    if (!container.querySelector('.add-tech-card')) container.appendChild(createAddTechnicianCard());
}

async function createTechnicianCard(technician) {
    const card = document.createElement('div');
    card.className = 'tech-summary-card';
    card.setAttribute('data-tech-id', technician._id);
    
    const safeTechName = technician.nome.replace(/'/g, "\\'");

    card.innerHTML = `
        <div class="tech-card-header">
            <div class="tech-name"><i class="bi bi-person-circle"></i><span>${technician.nome}</span></div>
            <button class="tech-remove-btn" onclick="removeTechnicianFromDashboard('${technician._id}')"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="tech-queues">
            <div class="queue-item planejados" style="cursor:pointer" onclick="openGlpiFilteredList('${safeTechName}', 3)">
                <span class="queue-label">PLANEJADOS</span>
                <span class="queue-count">...</span>
            </div>
            <div class="queue-item pendentes" style="cursor:pointer" onclick="openGlpiFilteredList('${safeTechName}', 4)">
                <span class="queue-label">PENDENTES</span>
                <span class="queue-count">...</span>
            </div>
        </div>
        <div class="tech-assigned-tickets"><div class="tech-no-tickets">Carregando...</div></div>
    `;
    loadTechnicianData(card, technician);
    return card;
}

async function updateTechnicianCard(card, technician) {
    await loadTechnicianData(card, technician);
}

async function loadTechnicianData(card, technician) {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets/technician/${technician._id}`);
        const data = await response.json();

        let assignedTicketsHtml = `<div class="tech-assigned-header"><span>ATRIBUÍDOS (${data.atribuidos?.length || 0})</span></div>`;

        if (data.atribuidos?.length > 0) {
            assignedTicketsHtml += `<div class="tech-tickets-list">` + 
                data.atribuidos.map(ticket => `
                    <div class="mini-ticket-card" onclick="openTicketInGlpi(${ticket.id})">
                        <div class="mini-ticket-header">
                            <span class="mini-ticket-id">#${ticket.id}</span>
                            <span class="mini-ticket-priority priority-${ticket.priority || 3}">${getPriorityLabel(ticket.priority)}</span>
                        </div>
                        <div class="mini-ticket-title">${ticket.name || 'Sem título'}</div>
                        <div class="mini-ticket-footer-time"><i class="bi bi-clock"></i> ${formatDate(ticket.date)}</div>
                    </div>
                `).join('') + `</div>`;
        } else {
            assignedTicketsHtml += `<div class="tech-no-tickets">Nenhum ticket</div>`;
        }

        card.querySelector('.planejados .queue-count').textContent = data.countPlanejados || 0;
        card.querySelector('.pendentes .queue-count').textContent = data.countPendentes || 0;
        card.querySelector('.tech-assigned-tickets').innerHTML = assignedTicketsHtml;
    } catch (error) { console.error(error); }
}

// --- ALGORITMO DE PRIORIZAÇÃO DE TICKETS ---

function obterPrioridadeEntidade(nomeEntidade) {
    if (!nomeEntidade || !matrizPrioridades || matrizPrioridades.length === 0) {
        return 0;
    }
    
    const entidadeConfig = matrizPrioridades.find(e => e.nome === nomeEntidade);
    return entidadeConfig ? entidadeConfig.prioridade : 0;
}

function calcularNivelPrioridade(ticket) {
    const prioridadeEntidade = obterPrioridadeEntidade(ticket.entity);
    const urgenciaTicket = ticket.priority || 0;
    
    const nivelFinal = Math.max(prioridadeEntidade, urgenciaTicket);
    
    return nivelFinal;
}

function verificarAtraso(ticket) {
    if (!ticket.date) return { atrasado: false, diffMinutos: 0, tipo: null };
    
    const dataAbertura = new Date(ticket.date);
    const dataAtual = new Date();
    const diffMinutos = Math.floor((dataAtual - dataAbertura) / 60000);
    
    const nivelPrioridade = calcularNivelPrioridade(ticket);
    
    if (nivelPrioridade === 5 && diffMinutos >= TEMPO_URG_PRIO_5) {
        return { atrasado: true, diffMinutos, tipo: 'CRÍTICO' };
    }
    if (nivelPrioridade === 4 && diffMinutos >= TEMPO_URG_PRIO_4) {
        return { atrasado: true, diffMinutos, tipo: 'URGENTE' };
    }
    
    return { atrasado: false, diffMinutos, tipo: null };
}

function ordenarTicketsPorPrioridade(tickets) {
    return tickets.sort((a, b) => {
        const nivelA = calcularNivelPrioridade(a);
        const nivelB = calcularNivelPrioridade(b);
        
        if (nivelB !== nivelA) {
            return nivelB - nivelA;
        }
        
        const dataA = new Date(a.date || 0);
        const dataB = new Date(b.date || 0);
        
        return dataA - dataB;
    });
}

// --- SEÇÃO DE CHAMADOS NOVOS ---
async function renderNewTicketsSection() {
    const container = document.getElementById('new-tickets-container');
    const countBadge = document.getElementById('new-tickets-count');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/tickets/new`);
        const data = await response.json();
        
        let tickets = data.tickets || [];
        
        tickets = tickets.map(ticket => ({
            ...ticket,
            urgencia_num: ticket.priority || 0
        }));
        
        const ticketsOrdenados = ordenarTicketsPorPrioridade(tickets);
        
        console.log(`\n📋 ========== PRIORIZAÇÃO DE TICKETS ==========`);
        console.log(`Total de tickets novos: ${ticketsOrdenados.length}`);
        console.log(`Matriz de prioridades carregada: ${matrizPrioridades.length} entidades\n`);
        
        ticketsOrdenados.forEach((t, index) => {
            const prioridadeEntidade = obterPrioridadeEntidade(t.entity);
            const urgenciaTicket = t.priority || 0;
            const nivelFinal = calcularNivelPrioridade(t);
            const atraso = verificarAtraso(t);
            
            console.log(`${index + 1}. Ticket #${t.id}:`);
            console.log(`   └─ Entidade: "${t.entity}" → Prioridade: ${prioridadeEntidade}`);
            console.log(`   └─ Urgência do ticket: ${urgenciaTicket}`);
            console.log(`   └─ Nível final: ${nivelFinal} (max entre ${prioridadeEntidade} e ${urgenciaTicket})`);
            console.log(`   └─ Atraso: ${atraso.atrasado ? `SIM (${atraso.tipo} - ${atraso.diffMinutos}min)` : 'NÃO'}\n`);
        });
        
        console.log(`============================================\n`);
        
        if (countBadge) countBadge.textContent = ticketsOrdenados.length;

        container.innerHTML = '';
        ticketsOrdenados.forEach(ticket => {
            const card = createTicketCard(ticket);
            container.appendChild(card);
        });
    } catch (error) { 
        console.error('Erro ao carregar tickets novos:', error); 
    }
}

function createTicketCard(ticket) {
    const card = document.createElement('div');
    card.className = 'ticket-card';
    card.onclick = () => openTicketInGlpi(ticket.id);
    
    const priorityClass = `priority-${ticket.priority || 3}`;
    const categoryLabel = ticket.category || 'Geral';
    const cleanPreview = stripHtml(ticket.preview || 'Sem descrição');
    
    const infoAtraso = verificarAtraso(ticket);
    const nivelFinal = calcularNivelPrioridade(ticket);
    const prioridadeEntidade = obterPrioridadeEntidade(ticket.entity);
    
    let badgeAtraso = '';
    if (infoAtraso.atrasado) {
        badgeAtraso = `<span class="ticket-delay-badge ${infoAtraso.tipo.toLowerCase()}">${infoAtraso.tipo}</span>`;
    }
    
    let infoEntidade = '';
    if (prioridadeEntidade > 0) {
        const estrelas = '⭐'.repeat(prioridadeEntidade);
        infoEntidade = `<div class="ticket-entity-info" title="Prioridade da entidade: ${prioridadeEntidade}">
            <i class="bi bi-building"></i> ${ticket.entity} ${estrelas}
        </div>`;
    }
    
    card.innerHTML = `
        <div class="ticket-card-header">
            <span class="ticket-id">#${ticket.id}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
                ${badgeAtraso}
                <span class="ticket-priority ${priorityClass}">${getPriorityLabel(ticket.priority)}</span>
            </div>
        </div>
        <div class="ticket-title">${ticket.name || 'Sem título'}</div>
        ${infoEntidade}
        <div class="ticket-body-container">
             <div class="ticket-preview">${cleanPreview}</div>
        </div>
        <div class="ticket-footer-wrapper">
            <div class="ticket-category-tag">
                <i class="bi bi-tag"></i> <span>${categoryLabel}</span>
            </div>
            <div class="ticket-time-info">
                <i class="bi bi-clock"></i> ${formatDate(ticket.date)}
            </div>
        </div>
    `;
    return card;
}

// --- AUXILIARES ---
function getPriorityLabel(p) {
    const labels = { 1: 'MUITO BAIXA', 2: 'BAIXA', 3: 'MÉDIA', 4: 'ALTA', 5: 'MUITO ALTA' };
    return labels[p] || 'MÉDIA';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const diff = new Date() - date;
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h / 24)}d atrás`;
}

function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

function openTicketInGlpi(id) { 
    window.open(`${glpiBaseUrl}/front/ticket.form.php?id=${id}`, '_blank'); 
}

function openGlpiFilteredList(tecnico, statusId) {
    const encodedName = encodeURIComponent(tecnico);
    const url = `${glpiBaseUrl}/front/ticket.php?is_deleted=0&as_map=0&browse=0` +
                `&criteria[0][link]=AND&criteria[0][field]=12&criteria[0][searchtype]=equals&criteria[0][value]=${statusId}` +
                `&criteria[1][link]=AND&criteria[1][field]=5&criteria[1][searchtype]=contains&criteria[1][value]=${encodedName}` +
                `&itemtype=Ticket&start=0&sort[]=19&order[]=DESC`;
    
    window.open(url, '_blank');
}

function createAddTechnicianCard() {
    const card = document.createElement('div');
    card.className = 'add-tech-card';
    card.onclick = openAddTechnicianModal;
    card.innerHTML = `<i class="bi bi-plus-circle"></i><p>Adicionar Técnico</p>`;
    return card;
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function openAddTechnicianModal() {
    const select = document.getElementById('select-technician');
    const currentTechIds = (dashboardConfig.tecnicosDashboard || []).map(id => id.toString());
    const availableTechs = techniciansList.filter(t => !currentTechIds.includes(t._id.toString()));
    select.innerHTML = '<option value="">Selecione...</option>' + availableTechs.map(t => `<option value="${t._id}">${t.nome}</option>`).join('');
    document.getElementById('modal-add-tech-dashboard').style.display = 'flex';
}

async function addTechnicianToDashboard() {
    const techId = document.getElementById('select-technician').value;
    if (!techId) return;
    const res = await fetch(`${API_BASE_URL}/config/dashboard/technicians`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: techId })
    });
    if (res.ok) { closeModal('modal-add-tech-dashboard'); await loadDashboardConfig(); }
}

async function removeTechnicianFromDashboard(id) {
    if (confirm('Deseja remover este técnico do dashboard?')) {
        const res = await fetch(`${API_BASE_URL}/config/dashboard/technicians/${id}`, { method: 'DELETE' });
        if (res.ok) await loadDashboardConfig();
    }
}