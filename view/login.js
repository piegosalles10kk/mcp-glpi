// view/login.js

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se já está logado
    const token = localStorage.getItem('mcp_token');
    if (token) {
        window.location.href = '/index.html';
    }

    // Toggle de senha
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = togglePassword.querySelector('i');
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
    });

    // Submit do formulário
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btnLogin = document.getElementById('btn-login');
    const errorMessage = document.getElementById('error-message');
    
    // Validações básicas
    if (!username || !password) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    // Desabilitar botão
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<i class="bi bi-hourglass-split"></i> Autenticando...';
    errorMessage.style.display = 'none';
    
    try {
        console.log('🔗 Tentando conectar em:', API_BASE_URL + '/auth/login');
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Salvar token e dados do usuário
            localStorage.setItem('mcp_token', data.token);
            localStorage.setItem('mcp_user', JSON.stringify(data.user));
            
            console.log('✅ Login realizado com sucesso!');
            
            // Redirecionar para dashboard
            window.location.href = '/index.html';
        } else {
            showError(data.message || 'Credenciais inválidas');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showError('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    } finally {
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Entrar';
    }
}

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    
    // Remover erro após 5 segundos
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}