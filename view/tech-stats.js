// view/tech-stats.js

let queueChart, categoriesChart;
let statsData = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    initLogout();
    loadTechnicianStats();
    initPeriodSelector();
});

// Verificar autenticação
function checkAuthentication() {
    const token = localStorage.getItem('mcp_token');
    if (!token) {
        window.location.href = '/login.html';
    }
}

// Logout
function initLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('Deseja realmente sair do sistema?')) {
                localStorage.removeItem('mcp_token');
                localStorage.removeItem('mcp_user');
                window.location.href = '/login.html';
            }
        });
    }
}

// Obter ID do técnico da URL
function getTechnicianId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Obter nome do técnico da URL
function getTechnicianName() {
    const params = new URLSearchParams(window.location.search);
    return params.get('name') || 'Técnico';
}

// Carregar estatísticas do técnico
async function loadTechnicianStats() {
    const techId = getTechnicianId();
    const techName = getTechnicianName();
    
    if (!techId) {
        alert('ID do técnico não fornecido');
        window.location.href = '/index.html';
        return;
    }

    // Atualizar nome no header
    document.getElementById('tech-name').textContent = techName;
    document.getElementById('tech-subtitle').textContent = `ID: ${techId} • Estatísticas em Tempo Real`;

    try {
        const response = await fetch(`${API_BASE_URL}/glpi/tecnicos/${techId}/stats`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar estatísticas');
        }

        statsData = await response.json();
        
        console.log('Dados recebidos:', statsData);
        
        // Esconder loading e mostrar conteúdo
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('stats-content').style.display = 'block';

        // Renderizar gráficos
        renderQueueChart(statsData.queueStats);
        renderCategoriesChart(statsData.topCategories);
        updateFinalizedCount('month');
        updateInsights(statsData);

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        alert('Erro ao carregar estatísticas do técnico. Verifique se o ID está correto.');
        window.location.href = '/index.html';
    }
}

// Renderizar gráfico de tickets na fila (Pizza)
function renderQueueChart(queueStats) {
    const ctx = document.getElementById('queueChart').getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (queueChart) {
        queueChart.destroy();
    }

    const labels = queueStats.map(stat => {
        switch(stat.label) {
            case 'atribuido': return 'Atribuído';
            case 'pendente': return 'Pendente';
            case 'planejado': return 'Planejado';
            default: return stat.label;
        }
    });

    const data = queueStats.map(stat => stat.value);
    const colors = queueStats.map(stat => stat.color);
    
    // Verificar se tem dados
    const hasData = data.some(value => value > 0);

    if (!hasData) {
        ctx.canvas.parentElement.innerHTML = '<p class="no-data"><i class="bi bi-inbox" style="font-size: 3rem; display: block; margin-bottom: 1rem; opacity: 0.3;"></i>Nenhum ticket na fila no momento</p>';
        return;
    }

    queueChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 4,
                borderColor: '#ffffff',
                hoverBorderWidth: 6,
                hoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 13,
                            family: 'Manrope',
                            weight: '600'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    padding: 14,
                    titleFont: {
                        size: 14,
                        family: 'Manrope',
                        weight: '700'
                    },
                    bodyFont: {
                        size: 13,
                        family: 'Manrope'
                    },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return ` ${label}: ${value} tickets (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Renderizar gráfico de categorias (Barras horizontais)
function renderCategoriesChart(topCategories) {
    const ctx = document.getElementById('categoriesChart').getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (categoriesChart) {
        categoriesChart.destroy();
    }

    if (!topCategories || topCategories.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="no-data"><i class="bi bi-inbox" style="font-size: 3rem; display: block; margin-bottom: 1rem; opacity: 0.3;"></i>Nenhum ticket finalizado ainda</p>';
        return;
    }

    const labels = topCategories.map(cat => {
        // Limitar tamanho do label para melhor visualização
        const name = cat.name;
        return name.length > 40 ? name.substring(0, 37) + '...' : name;
    });
    const data = topCategories.map(cat => cat.count);

    categoriesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Chamados Atendidos',
                data: data,
                backgroundColor: 'rgba(92, 124, 250, 0.85)',
                borderColor: 'rgba(92, 124, 250, 1)',
                borderWidth: 2,
                borderRadius: 10,
                barThickness: 40
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    padding: 14,
                    titleFont: {
                        size: 14,
                        family: 'Manrope',
                        weight: '700'
                    },
                    bodyFont: {
                        size: 13,
                        family: 'Manrope'
                    },
                    callbacks: {
                        title: function(context) {
                            // Mostrar nome completo no tooltip
                            return topCategories[context[0].dataIndex].name;
                        },
                        label: function(context) {
                            return ` ${context.parsed.x} tickets finalizados`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'Manrope',
                            size: 12,
                            weight: '600'
                        },
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        font: {
                            family: 'Manrope',
                            size: 12,
                            weight: '600'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Atualizar contador de finalizados
function updateFinalizedCount(period) {
    if (!statsData) return;

    const count = statsData.finalizadosCount[period] || 0;
    document.getElementById('finalized-count').textContent = count;
}

// Inicializar seletor de período
function initPeriodSelector() {
    const periodBtns = document.querySelectorAll('.period-btn');
    
    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const period = btn.getAttribute('data-period');
            updateFinalizedCount(period);
        });
    });
}

// Atualizar insights
function updateInsights(data) {
    // 1. Taxa de Resolução (baseada no total de finalizados vs fila)
    const totalQueue = data.queueStats.reduce((sum, stat) => sum + stat.value, 0);
    const totalFinalized = data.finalizadosCount.total || data.finalizadosCount.year;
    const totalTickets = totalQueue + totalFinalized;
    
    let resolutionRate = 0;
    if (totalTickets > 0) {
        resolutionRate = ((totalFinalized / totalTickets) * 100).toFixed(1);
    }
    document.getElementById('resolution-rate').textContent = `${resolutionRate}% resolvidos`;

    // 2. Categoria Dominante
    const dominantCategory = data.topCategories.length > 0 
        ? data.topCategories[0].name 
        : 'Nenhuma categoria';
    
    // Limitar tamanho para exibição
    const displayCategory = dominantCategory.length > 35 
        ? dominantCategory.substring(0, 32) + '...' 
        : dominantCategory;
    
    document.getElementById('dominant-category').textContent = displayCategory;
    document.getElementById('dominant-category').title = dominantCategory; // Tooltip com nome completo

    // 3. Produtividade (últimos 252 dias uteis)
    const yearCount = data.finalizadosCount.year || 0;
    
    // Média diária nos últimos 252 dias uteis
    const dailyAvg = (yearCount / 252).toFixed(1);
    
    document.getElementById('productivity').textContent = `${yearCount} tickets (${dailyAvg}/dia)`;
}