// view/config.js
// Configuração dinâmica da URL da API

/**
 * Detecta automaticamente a URL base da API
 * - Em produção Docker: usa o mesmo host (localhost:2500)
 * - Em desenvolvimento: pode ser configurado via variável
 */
function getApiBaseUrl() {
    // Verifica se existe uma variável global definida
    if (window.API_URL) {
        return window.API_URL;
    }
    
    // Usa o host atual (funciona em Docker e desenvolvimento)
    const protocol = window.location.protocol; // http: ou https:
    const hostname = window.location.hostname; // localhost ou IP
    const port = window.location.port || '2500'; // porta atual ou padrão
    
    return `${protocol}//${hostname}:${port}/api`;
}

// Exportar para uso global
const API_BASE_URL = getApiBaseUrl();

console.log('🔗 API Base URL configurada:', API_BASE_URL);