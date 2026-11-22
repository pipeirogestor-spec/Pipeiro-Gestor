// =========================================================
// PIPEIROGESTOR - SCRIPT DE CADASTRO E LOGIN (ATUALIZADO)
// =========================================================

const EMAIL_SUPER_ADMIN = "precision.digital.oficial@gmail.com";
const SENHA_SUPER_ADMIN = "admin123";

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function lerAssinantes() {
  try {
    const raw = localStorage.getItem("pipeiro_assinantes");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function salvarAssinantes(lista) {
  localStorage.setItem("pipeiro_assinantes", JSON.stringify(lista));
}

function alternarParaLogin(event) {
  if (event) event.preventDefault();
  const authTitle = document.getElementById("authTitle");
  const authDesc = document.getElementById("authDesc");
  const boxCadastro = document.getElementById("boxCadastro");
  const boxLogin = document.getElementById("boxLogin");
  const switchText = document.getElementById("switchText");

  if (authTitle) authTitle.innerText = "Acessar ao Painel";
  if (authDesc) authDesc.innerText = "Entre com os seus dados para gerir o seu negócio.";
  if (boxCadastro) boxCadastro.style.display = "none";
  if (boxLogin) boxLogin.style.display = "block";

  if (switchText) {
    switchText.innerHTML = `Ainda não tem uma conta? <a href="#" onclick="alternarParaCadastro(event)">Criar Conta</a>`;
  }
}

function alternarParaCadastro(event) {
  if (event) event.preventDefault();
  const authTitle = document.getElementById("authTitle");
  const authDesc = document.getElementById("authDesc");
  const boxCadastro = document.getElementById("boxCadastro");
  const boxLogin = document.getElementById("boxLogin");
  const switchText = document.getElementById("switchText");

  if (authTitle) authTitle.innerText = "Criar Sua Conta";
  if (authDesc) authDesc.innerText = "Preencha os dados abaixo para acessar ao painel do gestor.";
  if (boxCadastro) boxCadastro.style.display = "block";
  if (boxLogin) boxLogin.style.display = "none";

  if (switchText) {
    switchText.innerHTML = `Já possui uma conta? <a href="#" onclick="alternarParaLogin(event)">Faça Login</a>`;
  }
}

function realizarCadastro(event) {
  if (event) event.preventDefault();

  const nomeInput = document.getElementById("cadNome");
  const emailInput = document.getElementById("cadEmail");
  const whatsappInput = document.getElementById("cadWhatsapp");
  const senhaInput = document.getElementById("cadSenha");
  const confirmaSenhaInput = document.getElementById("cadConfirmaSenha");

  if (!nomeInput || !emailInput || !whatsappInput || !senhaInput) return;

  const nome = nomeInput.value.trim();
  const email = normalizarEmail(emailInput.value);
  const whatsapp = whatsappInput.value.trim();
  const senha = senhaInput.value.trim();
  const confirmaSenha = confirmaSenhaInput ? confirmaSenhaInput.value.trim() : senha;

  if (!nome || !email || !whatsapp || !senha) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  if (senha.length < 6) {
    alert("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  if (confirmaSenhaInput && senha !== confirmaSenha) {
    alert("As senhas não conferem. Digite a mesma senha nos dois campos.");
    return;
  }

  const listaClientes = lerAssinantes();
  const emailExistente = listaClientes.find(c => normalizarEmail(c.email) === email);

  if (emailExistente) {
    alert("Este e-mail já está cadastrado. Faça login.");
    return;
  }

  const ehSuperAdmin = email === normalizarEmail(EMAIL_SUPER_ADMIN);

  const novoCliente = {
    id: "cli_" + Date.now(),
    nome: nome,
    email: email,
    whatsapp: whatsapp,
    senha: senha,
    status: ehSuperAdmin ? "aprovado" : "pendente",
    titularPix: "",
    data: new Date().toLocaleDateString("pt-BR")
  };

  listaClientes.push(novoCliente);
  salvarAssinantes(listaClientes);

  localStorage.setItem("pipeiro_whatsapp_ativo", whatsapp);
  localStorage.setItem("pipeiro_nome_ativo", nome);

  if (ehSuperAdmin) {
    localStorage.removeItem("pipeiro_cliente_pendente");
    alert("Conta de Super Admin configurada! Faça login com a senha master.");
    alternarParaLogin();
  } else {
    localStorage.setItem("pipeiro_cliente_pendente", email);
    window.location.href = "pagamento.html";
  }
}

function realizarLogin(event) {
  if (event) event.preventDefault();

  const emailEl = document.getElementById("loginEmail");
  const senhaEl = document.getElementById("loginSenha");
  if (!emailEl || !senhaEl) return;

  const emailInput = normalizarEmail(emailEl.value);
  const senhaInput = senhaEl.value.trim();

  if (!emailInput || !senhaInput) {
    alert("Por favor, preencha o e-mail e a senha.");
    return;
  }

  const listaClientes = lerAssinantes();
  const adminEmailNorm = normalizarEmail(EMAIL_SUPER_ADMIN);
  let cliente = listaClientes.find(c => normalizarEmail(c.email) === emailInput);

  if (emailInput === adminEmailNorm && !cliente) {
    cliente = {
      id: "cli_admin_master",
      nome: "Super Admin",
      email: EMAIL_SUPER_ADMIN,
      whatsapp: "00000000000",
      senha: SENHA_SUPER_ADMIN,
      status: "aprovado",
      data: new Date().toLocaleDateString("pt-BR")
    };
    listaClientes.push(cliente);
    salvarAssinantes(listaClientes);
  }

  if (!cliente) {
    alert("E-mail não encontrado. Faça o cadastro primeiro.");
    return;
  }

  const senhaValida = (emailInput === adminEmailNorm)
    ? (senhaInput === SENHA_SUPER_ADMIN || senhaInput === cliente.senha)
    : (cliente.senha === senhaInput);

  if (!senhaValida) {
    alert("Senha incorreta. Tente novamente.");
    return;
  }

  const statusCliente = cliente.status || cliente.statusPagamento;
  if (emailInput !== adminEmailNorm && statusCliente !== "aprovado" && statusCliente !== "ativo") {
    localStorage.setItem("pipeiro_cliente_pendente", normalizarEmail(cliente.email));
    window.location.href = "pagamento.html";
    return;
  }

  localStorage.setItem("pipeiro_logado", "true");
  localStorage.setItem("pipeiro_admin_atual", normalizarEmail(cliente.email));
  localStorage.setItem("pipeiro_tipo_usuario", emailInput === adminEmailNorm ? "master" : "assinante");
  localStorage.setItem("pipeiro_nome_ativo", cliente.nome);
  localStorage.setItem("pipeiro_whatsapp_ativo", cliente.whatsapp || "");

  if (emailInput === adminEmailNorm) {
    window.location.href = "admin.html";
  } else {
    window.location.href = "index.html";
  }
}