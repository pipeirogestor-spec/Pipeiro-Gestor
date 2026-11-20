// =========================================================
// PIPEIROGESTOR - SCRIPT DE CADASTRO E LOGIN (ATUALIZADO)
// =========================================================

// E-MAIL E SENHA MESTRE DO SUPER ADMIN
const EMAIL_SUPER_ADMIN = "precision.digital.oficial@gmail.com";
const SENHA_SUPER_ADMIN = "admin123";

// Função para alternar para a tela de Login
function alternarParaLogin(event) {
  if (event) event.preventDefault();
  const authTitle = document.getElementById('authTitle');
  const authDesc = document.getElementById('authDesc');
  const boxCadastro = document.getElementById('boxCadastro');
  const boxLogin = document.getElementById('boxLogin');
  const switchText = document.getElementById('switchText');

  if (authTitle) authTitle.innerText = 'Acessar ao Painel';
  if (authDesc) authDesc.innerText = 'Entre com os seus dados para gerir o seu negócio.';
  if (boxCadastro) boxCadastro.style.display = 'none';
  if (boxLogin) boxLogin.style.display = 'block';

  if (switchText) {
    switchText.innerHTML = `Ainda não tem uma conta? <a href="#" onclick="alternarParaCadastro(event)">Criar Conta</a>`;
  }
}

// Função para alternar para a tela de Cadastro
function alternarParaCadastro(event) {
  if (event) event.preventDefault();
  const authTitle = document.getElementById('authTitle');
  const authDesc = document.getElementById('authDesc');
  const boxCadastro = document.getElementById('boxCadastro');
  const boxLogin = document.getElementById('boxLogin');
  const switchText = document.getElementById('switchText');

  if (authTitle) authTitle.innerText = 'Criar Sua Conta';
  if (authDesc) authDesc.innerText = 'Preencha os dados abaixo para Acessar ao painel do gestor.';
  if (boxCadastro) boxCadastro.style.display = 'block';
  if (boxLogin) boxLogin.style.display = 'none';

  if (switchText) {
    switchText.innerHTML = `Já possui uma conta? <a href="#" onclick="alternarParaLogin(event)">Faça Login</a>`;
  }
}

// Função de Registo / Cadastro do Assinante
function realizarCadastro(event) {
  if (event) event.preventDefault();

  const nomeInput = document.getElementById('cadNome');
  const emailInput = document.getElementById('cadEmail');
  const whatsappInput = document.getElementById('cadWhatsapp');
  const senhaInput = document.getElementById('cadSenha');
  const confirmaSenhaInput = document.getElementById('cadConfirmaSenha');

  if (!nomeInput || !emailInput || !whatsappInput || !senhaInput) return;

  const nome = nomeInput.value.trim();
  const email = emailInput.value.trim();
  const whatsapp = whatsappInput.value.trim();
  const senha = senhaInput.value.trim();
  const confirmaSenha = confirmaSenhaInput ? confirmaSenhaInput.value.trim() : senha;

  if (!nome || !email || !whatsapp || !senha) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  if (senha.length < 6) {
    alert('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  if (confirmaSenhaInput && senha !== confirmaSenha) {
    alert('As senhas não conferem. Digite a mesma senha nos dois campos.');
    return;
  }

  // Utiliza a chave unificada 'pipeiro_assinantes' em todo o sistema
  let listaClientes = JSON.parse(localStorage.getItem('pipeiro_assinantes') || '[]');

  const emailExistente = listaClientes.find(c => c.email === email);
  if (emailExistente) {
    alert('Este e-mail já está cadastrado. Faça login.');
    return;
  }

  const novoCliente = {
    id: 'cli_' + Date.now(),
    nome: nome,
    email: email,
    whatsapp: whatsapp,
    senha: senha,
    status: (email === EMAIL_SUPER_ADMIN) ? 'aprovado' : 'pendente',
    titularPix: '',
    data: new Date().toLocaleDateString('pt-BR')
  };

  listaClientes.push(novoCliente);
  localStorage.setItem('pipeiro_assinantes', JSON.stringify(listaClientes));
  localStorage.setItem('pipeiro_cliente_pendente', email);

  // Salva temporariamente os dados ativos para o fluxo
  localStorage.setItem('pipeiro_whatsapp_ativo', whatsapp);
  localStorage.setItem('pipeiro_nome_ativo', nome);

  if (email === EMAIL_SUPER_ADMIN) {
    alert('Conta de Super Admin configurada! Faça login com a senha master.');
    alternarParaLogin();
  } else {
    window.location.href = 'pagamento.html';
  }
}

// Função de Login com separação rigorosa de perfis
function realizarLogin(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('loginEmail').value.trim();
  const senhaInput = document.getElementById('loginSenha').value.trim();

  if (!emailInput || !senhaInput) {
    alert('Por favor, preencha o e-mail e a senha.');
    return;
  }

  let listaClientes = JSON.parse(localStorage.getItem('pipeiro_assinantes') || '[]');
  let cliente = listaClientes.find(c => c.email === emailInput);

  // Garante que o Super Admin existe sempre no sistema
  if (emailInput === EMAIL_SUPER_ADMIN) {
    if (!cliente) {
      cliente = {
        id: 'cli_admin_master',
        nome: 'Super Admin',
        email: EMAIL_SUPER_ADMIN,
        whatsapp: '00000000000',
        senha: SENHA_SUPER_ADMIN,
        status: 'aprovado',
        data: new Date().toLocaleDateString('pt-BR')
      };
      listaClientes.push(cliente);
      localStorage.setItem('pipeiro_assinantes', JSON.stringify(listaClientes));
    }
  }

  if (!cliente) {
    alert('E-mail não encontrado. Faça o cadastro primeiro.');
    return;
  }

  const senhaValida = (emailInput === EMAIL_SUPER_ADMIN)
    ? (senhaInput === SENHA_SUPER_ADMIN || senhaInput === cliente.senha)
    : (cliente.senha === senhaInput);

  if (!senhaValida) {
    alert('Senha incorreta. Tente novamente.');
    return;
  }

  // Se for cliente comum e o pagamento não estiver aprovado, manda para o pagamento
  const statusCliente = cliente.status || cliente.statusPagamento;
  if (cliente.email !== EMAIL_SUPER_ADMIN && statusCliente !== 'aprovado' && statusCliente !== 'ativo') {
    localStorage.setItem('pipeiro_cliente_pendente', cliente.email);
    window.location.href = 'pagamento.html';
    return;
  }

  // Regista a sessão ativa e o tipo de utilizador
  localStorage.setItem('pipeiro_logado', 'true');
  localStorage.setItem('pipeiro_admin_atual', cliente.email);
  localStorage.setItem('pipeiro_tipo_usuario', (cliente.email === EMAIL_SUPER_ADMIN) ? 'master' : 'assinante');
  localStorage.setItem('pipeiro_nome_ativo', cliente.nome);
  localStorage.setItem('pipeiro_whatsapp_ativo', cliente.whatsapp || '');

  // Redirecionamento inteligente baseado no perfil
  if (cliente.email === EMAIL_SUPER_ADMIN) {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'index.html';
  }
}