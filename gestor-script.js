// =========================================================
// PIPEIROGESTOR - SCRIPT COMPLETO DO PAINEL DO ORGANIZADOR (MULTI-UTILIZADOR)
// =========================================================

const EMAIL_SUPER_ADMIN = "precision.digital.oficial@gmail.com";

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function escaparHTML(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseJSONSeguro(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("Erro ao fazer parse de JSON:", e);
    return fallback;
  }
}

const GESTOR_ATIVO_EMAIL = normalizarEmail(localStorage.getItem("pipeiro_admin_atual")) || normalizarEmail(EMAIL_SUPER_ADMIN);

function getChaveIsolada(chaveBase) {
  const emailSanitizado = GESTOR_ATIVO_EMAIL.replace(/[^a-z0-9]/g, "_");
  return `pipeiro_${emailSanitizado}_${chaveBase}`;
}

function getDiretorioBaseURL() {
  const href = window.location.href;
  const idx = href.lastIndexOf("/");
  return idx >= 0 ? href.substring(0, idx) : "";
}

(function verificarAutenticacao() {
  const estaLogado = localStorage.getItem("pipeiro_logado");
  if (estaLogado !== "true") {
    alert("Acesso restrito. Por favor, faça login ou cadastre-se para acessar o painel.");
    window.location.href = "cadastro.html";
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  iniciarSplashScreen();
  carregarDadosSalvosPersistentes();
  carregarMinhasCampanhas();
  configurarNavegacaoSidebar();
  carregarConfiguracoesSalvas();
  carregarPedidosEComprovantes();
  atualizarEstatisticasFinanceirasGestor();
  carregarResumoHomeCards();
  verificarSeEhSuperAdmin();
  iniciarEscutaNovosPedidos();
});

// =========================================================
// CARREGAR DADOS SALVOS AO ABRIR A PÁGINA (PERSISTÊNCIA DE RESET)
// =========================================================
function carregarDadosSalvosPersistentes() {
  const elTotal = document.getElementById("totalGeralDisplay");
  if (elTotal && localStorage.getItem(getChaveIsolada("financeiro_zerado")) === "true") {
    elTotal.innerText = "R$ 0,00";
  }

  const elCotas = document.getElementById("cotasVendidasDisplay");
  if (elCotas && localStorage.getItem(getChaveIsolada("cotas_zeradas")) === "true") {
    elCotas.innerText = "0";
  }

  const ganhadoresSalvos = localStorage.getItem(getChaveIsolada("topGanhadoresPipeiro"));
  const listaGanhadores = document.getElementById("homeTopGanhadoresList");
  if (listaGanhadores && ganhadoresSalvos === "vazio") {
    listaGanhadores.innerHTML = '<p style="color: #9BA59C; font-size: 13px;">Nenhum ganhador registrado no momento.</p>';
  }
}

// =========================================================
// 1. TELA DE CARREGAMENTO (SPLASH SCREEN)
// =========================================================
function iniciarSplashScreen() {
  const frases = [
    "Empinando a logo ao vento...",
    "Esticando a linha chilena...",
    "Separando as melhores pipas...",
    "Organizando o festival...",
    "Tudo pronto para voar alto!"
  ];

  let progresso = 0;
  const barraFill = document.getElementById("splash-progress-fill");
  const textoFrase = document.getElementById("splash-frase");
  const splashScreen = document.getElementById("splash-screen");

  const tempoTotal = 2000;
  const intervaloTempo = 30;
  const incremento = 100 / (tempoTotal / intervaloTempo);

  let indiceFrase = 0;
  const timerFrases = setInterval(() => {
    indiceFrase = (indiceFrase + 1) % frases.length;
    if (textoFrase) textoFrase.textContent = frases[indiceFrase];
  }, 500);

  const timerCarregamento = setInterval(() => {
    progresso += incremento;
    if (progresso >= 100) {
      progresso = 100;
      clearInterval(timerCarregamento);
      clearInterval(timerFrases);
      if (splashScreen) splashScreen.classList.add("splash-hidden");
    }
    if (barraFill) barraFill.style.width = progresso + "%";
  }, intervaloTempo);
}

// =========================================================
// 2. ADICIONAR LINHA DE PROMOÇÃO DINÂMICA
// =========================================================
function adicionarLinhaPromocao() {
  const container = document.getElementById("containerPromocoes");
  if (!container) return;

  const div = document.createElement("div");
  div.className = "promocao-item";
  div.style.cssText = "display: flex; gap: 10px; margin-bottom: 10px; align-items: center; margin-top: 10px;";
  div.innerHTML = `
    <input type="number" placeholder="Qtd Cotas (Ex: 3)" class="promocao-qtd" style="flex: 1; padding: 10px; background: #0A0F0C; border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; color: #F5F8F4;" />
    <span style="color: #9BA59C;">cotas por R$</span>
    <input type="number" step="0.01" placeholder="Valor Total (Ex: 25.00)" class="promocao-valor" style="flex: 1; padding: 10px; background: #0A0F0C; border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; color: #F5F8F4;" />
  `;
  container.appendChild(div);
}

// =========================================================
// 3. GERAR E PUBLICAR AÇÃO (ISOLADA POR GESTOR)
// =========================================================
function gerarLinkAcao() {
  try {
    const titulo = document.getElementById("tituloAcao")?.value.trim();
    const preco = document.getElementById("precoUnitario")?.value.trim();
    const chavePix = document.getElementById("chavePix")?.value.trim();
    const titular = document.getElementById("titularPix")?.value.trim();
    const tipoChave = document.getElementById("tipoChavePix")?.value || "CPF / CNPJ";
    const descricao = document.getElementById("descricaoAcao")?.value.trim() || "";
    const tema = document.getElementById("temaCotas")?.value || "numeros";

    if (!titulo || !preco || !chavePix || !titular) {
      alert("Por favor, preencha todos os campos obrigatórios (Título, Preço por Número, Chave PIX e Titular).");
      return;
    }

    const promocoes = [];
    document.querySelectorAll(".promocao-item").forEach(row => {
      const qtd = parseInt(row.querySelector(".promocao-qtd")?.value, 10) || 0;
      const valor = parseFloat(row.querySelector(".promocao-valor")?.value) || 0;
      if (qtd > 0 && valor > 0) {
        promocoes.push({ quantidade: qtd, valor: valor });
      }
    });

    const salvarDadosCampanha = (listaImagensBase64) => {
      const slug = titulo.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || ("acao-" + Date.now());

      const campanha = {
        criadorEmail: GESTOR_ATIVO_EMAIL,
        titulo: titulo,
        preco: parseFloat(preco.replace(",", ".")) || 0,
        chavePix: chavePix,
        titular: titular,
        tipoChave: tipoChave,
        descricao: descricao,
        imagens: listaImagensBase64 || [],
        imagem: (listaImagensBase64 && listaImagensBase64[0]) ? listaImagensBase64[0] : "",
        tema: tema,
        promocoes: promocoes,
        pausada: false
      };

      try {
        localStorage.setItem(getChaveIsolada("campanha_" + slug), JSON.stringify(campanha));
      } catch (e) {
        alert("As imagens selecionadas são muito pesadas. Escolha fotos mais leves.");
        return;
      }

      const urlBase = getDiretorioBaseURL();
      const urlFinal = `${urlBase}/rifa.html?acao=${encodeURIComponent(slug)}&gestor=${encodeURIComponent(GESTOR_ATIVO_EMAIL)}`;

      const boxLink = document.getElementById("boxLinkGerado");
      const inputUrl = document.getElementById("inputUrlGerada");
      const btnWpp = document.getElementById("btnShareWhatsapp");

      if (boxLink) {
        boxLink.style.background = "#0D120F";
        boxLink.style.border = "1px solid rgba(255,255,255,0.09)";
        boxLink.style.borderLeft = "4px solid #A6FF45";
        boxLink.style.borderRadius = "14px";
        boxLink.style.padding = "22px";
        boxLink.style.display = "block";
      }

      if (inputUrl) {
        inputUrl.value = urlFinal;
        inputUrl.style.background = "#0A0F0C";
        inputUrl.style.border = "1px solid rgba(255,255,255,0.14)";
        inputUrl.style.color = "#A6FF45";
      }

      if (btnWpp) {
        const msgShare = `*${titulo}*\n\nGaranta já suas cotas acessando o link:\n${urlFinal}`;
        btnWpp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msgShare)}`;
        btnWpp.style.background = "#22C55E";
        btnWpp.style.color = "#08120B";
        btnWpp.style.fontWeight = "800";
      }

      if (boxLink) boxLink.scrollIntoView({ behavior: "smooth" });
      carregarMinhasCampanhas();
      carregarResumoHomeCards();
    };

    const inputFoto = document.getElementById("fotoPremio");

    if (inputFoto && inputFoto.files && inputFoto.files.length > 0) {
      const arquivos = Array.from(inputFoto.files).slice(0, 3);
      const imagensBase64 = [];
      let concluidos = 0;

      arquivos.forEach((file, index) => {
        const leitor = new FileReader();
        leitor.onload = function (e) {
          const img = new Image();
          img.onload = function () {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            imagensBase64[index] = canvas.toDataURL("image/jpeg", 0.7);
            concluidos++;

            if (concluidos === arquivos.length) {
              salvarDadosCampanha(imagensBase64.filter(Boolean));
            }
          };
          img.src = e.target.result;
        };
        leitor.readAsDataURL(file);
      });
    } else {
      salvarDadosCampanha([]);
    }
  } catch (err) {
    console.error("Erro crítico ao gerar ação:", err);
    alert("Erro no script: " + err.message);
  }
}

// =========================================================
// 4. LISTAGEM, FILTROS E GERENCIAMENTO DE CAMPANHAS
// =========================================================
let filtroCampanhaAtual = "todas";

function filtrarCampanhasGestor(tipo, ev) {
  filtroCampanhaAtual = tipo;
  const eventoAtual = ev || (typeof window !== "undefined" ? window.event : null);

  document.querySelectorAll(".btn-filtro").forEach(btn => {
    btn.style.background = "#111813";
    btn.style.color = "#9BA59C";
    btn.style.borderColor = "rgba(255,255,255,0.09)";
  });

  if (eventoAtual && eventoAtual.target) {
    eventoAtual.target.style.background = "#A6FF45";
    eventoAtual.target.style.color = "#0D140A";
    eventoAtual.target.style.borderColor = "#A6FF45";
  }

  carregarMinhasCampanhas();
}

function carregarMinhasCampanhas() {
  const container = document.getElementById("listaMinhasCampanhas");
  let totalAtivas = 0;
  let totalInativas = 0;

  if (container) container.innerHTML = "";

  const prefixoBusca = getChaveIsolada("campanha_");

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefixoBusca)) {
      const campanha = parseJSONSeguro(localStorage.getItem(key), null);
      if (!campanha) continue;

      const slug = key.replace(prefixoBusca, "");
      const isPausada = campanha.pausada === true;

      if (isPausada) totalInativas++;
      else totalAtivas++;

      if (filtroCampanhaAtual === "ativas" && isPausada) continue;
      if (filtroCampanhaAtual === "pausadas" && !isPausada) continue;

      if (container) {
        const card = document.createElement("div");
        card.className = "campanha-gestao-card";
        card.style.cssText = "background: #111813; border: 1px solid rgba(255,255,255,0.09); padding: 18px; border-radius: 12px; color: #F5F8F4; margin-bottom: 10px;";
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; color: #F5F8F4; font-size: 16px;">${escaparHTML(campanha.titulo)}</h4>
            <span style="font-size: 11px; padding: 3px 10px; border-radius: 999px; background: ${isPausada ? "rgba(234, 179, 8, 0.14)" : "rgba(166, 255, 69, 0.12)"}; color: ${isPausada ? "#eab308" : "#A6FF45"}; font-weight: 700;">
              ${isPausada ? "Pausada / Inativa" : "Ativa"}
            </span>
          </div>
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #9BA59C;">Preço por cota: <strong style="color: #A6FF45;">R$ ${parseFloat(campanha.preco || 0).toFixed(2)}</strong></p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="rifa.html?acao=${encodeURIComponent(slug)}&gestor=${encodeURIComponent(GESTOR_ATIVO_EMAIL)}" target="_blank" rel="noopener noreferrer" style="padding: 7px 12px; background: #A6FF45; color: #0D140A; text-decoration: none; border-radius: 7px; font-size: 12px; font-weight: 800;">Ver Página</a>
            <button type="button" onclick="editarCampanha('${encodeURIComponent(slug)}')" style="padding: 7px 12px; background: #0A0F0C; color: #F5F8F4; border: 1px solid rgba(255,255,255,0.14); border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 700;">Editar</button>
            <button type="button" onclick="alternarPausarCampanha('${encodeURIComponent(slug)}')" style="padding: 7px 12px; background: rgba(234,179,8,0.14); color: #eab308; border: 1px solid rgba(234,179,8,0.3); border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 700;">${isPausada ? "Ativar" : "Pausar"}</button>
            <button type="button" onclick="excluirCampanha('${encodeURIComponent(slug)}')" style="padding: 7px 12px; background: rgba(239,68,68,0.14); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 700;">Excluir</button>
          </div>
        `;
        container.appendChild(card);
      }
    }
  }

  if (container && container.children.length === 0) {
    container.innerHTML = `<p style="color: #9BA59C; font-size: 13px;">Nenhuma campanha encontrada com este filtro.</p>`;
  }

  const elAtivas = document.getElementById("totalAtivasDisplay");
  const elInativas = document.getElementById("totalInativasDisplay");
  if (elAtivas) elAtivas.textContent = totalAtivas;
  if (elInativas) elInativas.textContent = totalInativas;
}

function excluirCampanha(slugCodificado) {
  const slug = decodeURIComponent(slugCodificado);
  if (confirm("Tem certeza que deseja excluir esta campanha permanentemente?")) {
    localStorage.removeItem(getChaveIsolada("campanha_" + slug));
    alert("Campanha excluída com sucesso.");
    carregarMinhasCampanhas();
    carregarResumoHomeCards();
  }
}

function alternarPausarCampanha(slugCodificado) {
  const slug = decodeURIComponent(slugCodificado);
  const chave = getChaveIsolada("campanha_" + slug);
  const campanha = parseJSONSeguro(localStorage.getItem(chave), null);
  if (!campanha) return;

  campanha.pausada = !campanha.pausada;
  localStorage.setItem(chave, JSON.stringify(campanha));
  carregarMinhasCampanhas();
  carregarResumoHomeCards();
}

function editarCampanha(slugCodificado) {
  const slug = decodeURIComponent(slugCodificado);
  const chave = getChaveIsolada("campanha_" + slug);
  const campanha = parseJSONSeguro(localStorage.getItem(chave), null);
  if (!campanha) return;

  if (document.getElementById("tituloAcao")) document.getElementById("tituloAcao").value = campanha.titulo || "";
  if (document.getElementById("precoUnitario")) document.getElementById("precoUnitario").value = campanha.preco || "";
  if (document.getElementById("tipoChavePix")) document.getElementById("tipoChavePix").value = campanha.tipoChave || "CPF / CNPJ";
  if (document.getElementById("chavePix")) document.getElementById("chavePix").value = campanha.chavePix || "";
  if (document.getElementById("titularPix")) document.getElementById("titularPix").value = campanha.titular || "";
  if (document.getElementById("descricaoAcao")) document.getElementById("descricaoAcao").value = campanha.descricao || "";
  if (document.getElementById("temaCotas")) document.getElementById("temaCotas").value = campanha.tema || "numeros";

  const formEl = document.getElementById("form-container");
  if (formEl) {
    formEl.style.display = "block";
    formEl.scrollIntoView({ behavior: "smooth" });
  }
  alert("Dados carregados no formulário. Edite e publique novamente.");
}

// =========================================================
// 5. EXPORTAR RELATÓRIO DE VENDAS EM CSV
// =========================================================
function exportarRelatorioCSV() {
  let csvContent = "data:text/csv;charset=utf-8,Comprador;WhatsApp;Cotas;ValorTotal;Status\r\n";
  let totalLinhas = 0;

  const prefixoPedido = getChaveIsolada("pedido_");

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefixoPedido)) {
      const p = parseJSONSeguro(localStorage.getItem(key), null);
      if (!p) continue;
      const cotasStr = Array.isArray(p.cotas) ? p.cotas.join("-") : (p.cotas || "");
      csvContent += `"${String(p.nomeComprador || "").replace(/"/g, '""')}","${String(p.whatsapp || "").replace(/"/g, '""')}","${String(cotasStr).replace(/"/g, '""')}","${p.valorTotal || 0}","${p.status || ""}"\r\n`;
      totalLinhas++;
    }
  }

  if (totalLinhas === 0) {
    alert("Não existem pedidos registrados para exportar no momento.");
    return;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `relatorio_vendas_${GESTOR_ATIVO_EMAIL.replace(/[^a-z0-9]/g, "_")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  alert("Relatório de vendas exportado com sucesso.");
}

// =========================================================
// 6. NAVEGAÇÃO E UTILITÁRIOS
// =========================================================
function configurarNavegacaoSidebar() {
  document.querySelectorAll(".sidebar .nav-item").forEach(item => {
    item.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      if (href === "#ajuda" || href === "#como-usar" || this.textContent.includes("Como Usar") || this.textContent.includes("Tutorial")) {
        e.preventDefault();
        abrirModalAjuda();
        const sidebar = document.querySelector(".sidebar");
        if (window.innerWidth <= 900 && sidebar) sidebar.classList.remove("ativo");
        return;
      }

      e.preventDefault();
      document.querySelectorAll(".sidebar .nav-item").forEach(nav => nav.classList.remove("active"));
      this.classList.add("active");

      const secConfig = document.getElementById("configuracoes");
      const formContainer = document.getElementById("form-container");

      if (href === "#visao-geral") {
        if (secConfig) secConfig.style.display = "none";
        if (formContainer) formContainer.style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (href === "#nova-campanha") {
        if (secConfig) secConfig.style.display = "none";
        if (formContainer) {
          formContainer.style.display = "block";
          formContainer.scrollIntoView({ behavior: "smooth" });
        }
      } else if (href === "#configuracoes") {
        if (formContainer) formContainer.style.display = "none";
        if (secConfig) {
          secConfig.style.display = "block";
          secConfig.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        if (secConfig) secConfig.style.display = "none";
        if (formContainer) formContainer.style.display = "none";
        const el = href ? document.querySelector(href) : null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }

      const sidebar = document.querySelector(".sidebar");
      if (window.innerWidth <= 900 && sidebar) {
        sidebar.classList.remove("ativo");
      }
    });
  });
}

function toggleMenuMobile() {
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    sidebar.classList.toggle("ativo");
  }
}

function atualizarNomeFoto(input) {
  const span = document.getElementById("textoUploadFoto");
  if (!span) return;
  if (input.files && input.files.length > 0) {
    const qtd = Math.min(input.files.length, 3);
    span.textContent = `${qtd} foto(s) selecionada(s) para o carrossel`;
    span.style.color = "#A6FF45";
  } else {
    span.textContent = "Clique aqui para selecionar as fotos do prêmio (até 3 fotos)";
    span.style.color = "#A6FF45";
  }
}

function copiarLink() {
  const input = document.getElementById("inputUrlGerada");
  if (!input) return;
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value).then(() => {
    alert("Link copiado com sucesso. Agora é só enviar aos compradores.");
  }).catch(err => {
    console.error("Erro ao copiar link: ", err);
    alert("Não foi possível copiar automaticamente.");
  });
}

function abrirModalAjuda(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById("modalAjuda");
  if (modal) {
    modal.style.opacity = "1";
    modal.style.pointerEvents = "auto";
  }
}

function fecharModalAjuda() {
  const modal = document.getElementById("modalAjuda");
  if (modal) {
    modal.style.opacity = "0";
    modal.style.pointerEvents = "none";
  }
}

// =========================================================
// 7. GERENCIAMENTO DE CONFIGURAÇÕES DO GESTOR
// =========================================================
function carregarConfiguracoesSalvas() {
  const config = parseJSONSeguro(localStorage.getItem(getChaveIsolada("configuracoes")), null);
  if (!config) return;

  if (document.getElementById("cfgNomeOrganizador")) document.getElementById("cfgNomeOrganizador").value = config.nomeOrganizador || "";
  if (document.getElementById("cfgWhatsappSuporte")) document.getElementById("cfgWhatsappSuporte").value = config.whatsappSuporte || "";
  if (document.getElementById("cfgTipoChavePix")) document.getElementById("cfgTipoChavePix").value = config.tipoChave || "CPF";
  if (document.getElementById("cfgChavePix")) document.getElementById("cfgChavePix").value = config.chavePix || "";
  if (document.getElementById("cfgTitularPix")) document.getElementById("cfgTitularPix").value = config.titular || "";

  preencherCamposDefaultCriacao(config);
}

function salvarConfiguracoes(event) {
  if (event) event.preventDefault();

  const config = {
    nomeOrganizador: document.getElementById("cfgNomeOrganizador")?.value.trim() || "",
    whatsappSuporte: document.getElementById("cfgWhatsappSuporte")?.value.trim() || "",
    tipoChave: document.getElementById("cfgTipoChavePix")?.value || "",
    chavePix: document.getElementById("cfgChavePix")?.value.trim() || "",
    titular: document.getElementById("cfgTitularPix")?.value.trim() || ""
  };

  localStorage.setItem(getChaveIsolada("configuracoes"), JSON.stringify(config));
  preencherCamposDefaultCriacao(config);
  alert("Configurações do Gestor salvas com sucesso.");
}

function preencherCamposDefaultCriacao(config) {
  const chavePixRifa = document.getElementById("chavePix");
  const titularRifa = document.getElementById("titularPix");

  if (chavePixRifa && !chavePixRifa.value && config.chavePix) chavePixRifa.value = config.chavePix;
  if (titularRifa && !titularRifa.value && config.titular) titularRifa.value = config.titular;
}

// =========================================================
// 8. GESTÃO E APROVAÇÃO DE PEDIDOS E COMPROVANTES
// =========================================================
function carregarPedidosEComprovantes() {
  const tabelaBody = document.querySelector(".data-table tbody");
  if (!tabelaBody) return;

  const selectFiltro = document.getElementById("filtroCampanhaPedidos");
  if (selectFiltro) {
    const valorSelecionadoAtual = selectFiltro.value;
    selectFiltro.innerHTML = '<option value="todas">Todas as Campanhas</option>';

    const prefixoCampanha = getChaveIsolada("campanha_");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefixoCampanha)) {
        const camp = parseJSONSeguro(localStorage.getItem(key), null);
        if (!camp) continue;
        const slugCampanha = key.replace(prefixoCampanha, "");
        const option = document.createElement("option");
        option.value = slugCampanha;
        option.textContent = camp.titulo || slugCampanha;
        selectFiltro.appendChild(option);
      }
    }
    selectFiltro.value = valorSelecionadoAtual;
  }

  const campanhaSelecionadaFiltro = selectFiltro ? selectFiltro.value : "todas";

  tabelaBody.innerHTML = "";
  let totalPendentes = 0;
  const prefixoPedido = getChaveIsolada("pedido_");

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefixoPedido)) {
      const pedido = parseJSONSeguro(localStorage.getItem(key), null);
      if (!pedido) continue;

      if (campanhaSelecionadaFiltro !== "todas" && pedido.slugAcao !== campanhaSelecionadaFiltro) {
        continue;
      }

      if (pedido.status === "pendente") totalPendentes++;

      const keyCodificada = encodeURIComponent(key);
      const cotasTexto = Array.isArray(pedido.cotas) ? pedido.cotas.join(", ") : (pedido.cotas || "");

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid rgba(255,255,255,0.09)";
      tr.innerHTML = `
        <td style="padding: 12px; color: #F5F8F4; font-weight: 700;">${escaparHTML(pedido.nomeComprador || "Comprador")}</td>
        <td style="padding: 12px; color: #9BA59C;">${escaparHTML(pedido.whatsapp || "-")}</td>
        <td style="padding: 12px; color: #A6FF45; font-weight: 700;">${escaparHTML(cotasTexto)}</td>
        <td style="padding: 12px; color: #F5F8F4;">R$ ${parseFloat(pedido.valorTotal || 0).toFixed(2)}</td>
        <td style="padding: 12px;">
          <span style="padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: ${pedido.status === "aprovado" ? "rgba(166,255,69,0.12)" : "rgba(234,179,8,0.14)"}; color: ${pedido.status === "aprovado" ? "#A6FF45" : "#eab308"};">
            ${pedido.status === "aprovado" ? "Aprovado" : "Aguardando"}
          </span>
        </td>
        <td style="padding: 12px; display: flex; gap: 6px; align-items: center;">
          ${pedido.status !== "aprovado" ? `
            <button type="button" onclick="aprovarPedido(decodeURIComponent('${keyCodificada}'))" style="padding: 6px 10px; background: #A6FF45; color: #0D140A; border: none; border-radius: 6px; cursor: pointer; font-weight: 800; font-size: 11px;">
              Aprovar
            </button>
            <button type="button" onclick="negarPedido(decodeURIComponent('${keyCodificada}'))" style="padding: 6px 10px; background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.35); border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px;">
              Negar
            </button>
          ` : `
            <span style="color: #A6FF45; font-size: 12px; font-weight: 700; margin-right: 6px;">Pago</span>
            <button type="button" onclick="excluirPedidoAprovado(decodeURIComponent('${keyCodificada}'))" title="Excluir da tabela" style="padding: 6px 10px; background: #111813; color: #9BA59C; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px;">
              Excluir
            </button>
          `}
        </td>
      `;
      tabelaBody.appendChild(tr);
    }
  }

  const badgeEl = document.querySelector(".section-tag-verde");
  if (badgeEl) badgeEl.textContent = `${totalPendentes} Aguardando Validação`;

  const metricapendentes = document.getElementById("pedidosPendentesDisplay");
  if (metricapendentes) metricapendentes.textContent = `${totalPendentes} Pedidos`;

  if (tabelaBody.children.length === 0) {
    tabelaBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #9BA59C; padding: 25px;">
          Nenhum pedido registrado para esta campanha no momento.
        </td>
      </tr>
    `;
  }
}

function aprovarPedido(chavePedido) {
  const pedido = parseJSONSeguro(localStorage.getItem(chavePedido), null);
  if (!pedido) return;

  pedido.status = "aprovado";
  localStorage.setItem(chavePedido, JSON.stringify(pedido));

  localStorage.removeItem(getChaveIsolada("financeiro_zerado"));
  localStorage.removeItem(getChaveIsolada("cotas_zeradas"));
  localStorage.removeItem(getChaveIsolada("arrecadadoHojePipeiro"));

  if (pedido.slugAcao) {
    const chaveCampanha = getChaveIsolada("campanha_" + pedido.slugAcao);
    const campanha = parseJSONSeguro(localStorage.getItem(chaveCampanha), null);
    if (campanha) {
      campanha.cotasPagas = Array.isArray(campanha.cotasPagas) ? campanha.cotasPagas : [];
      if (Array.isArray(pedido.cotas)) {
        pedido.cotas.forEach(c => {
          if (!campanha.cotasPagas.includes(c)) campanha.cotasPagas.push(c);
        });
      }
      localStorage.setItem(chaveCampanha, JSON.stringify(campanha));
    }
  }

  alert("Pedido aprovado com sucesso. As cotas foram marcadas como pagas e bloqueadas.");
  carregarPedidosEComprovantes();
  atualizarEstatisticasFinanceirasGestor();
  carregarResumoHomeCards();
}

function negarPedido(chavePedido) {
  if (confirm("Tem certeza que deseja negar este pedido? As cotas serão liberadas para nova compra.")) {
    localStorage.removeItem(chavePedido);
    alert("Pedido negado e removido com sucesso. As cotas estão livres novamente.");
    carregarPedidosEComprovantes();
    atualizarEstatisticasFinanceirasGestor();
  }
}

function excluirPedidoAprovado(chavePedido) {
  if (confirm("Deseja remover este pedido aprovado da tabela de exibição? O valor continuará a somar no total arrecadado do gestor.")) {
    const pedido = parseJSONSeguro(localStorage.getItem(chavePedido), null);
    if (pedido) {
      const chaveHist = getChaveIsolada("historico_financeiro");
      const historicoFinanceiro = parseJSONSeguro(localStorage.getItem(chaveHist), []);
      historicoFinanceiro.push({
        valorTotal: parseFloat(pedido.valorTotal || 0),
        cotasQtd: Array.isArray(pedido.cotas) ? pedido.cotas.length : 1,
        data: pedido.data || new Date().toISOString()
      });
      localStorage.setItem(chaveHist, JSON.stringify(historicoFinanceiro));
    }

    localStorage.removeItem(chavePedido);
    alert("Pedido removido da tabela com sucesso.");
    carregarPedidosEComprovantes();
    atualizarEstatisticasFinanceirasGestor();
  }
}

function filtrarPedidosGestor() {
  const termo = (document.getElementById("inputBuscaPedidos")?.value || "").toLowerCase();
  const linhas = document.querySelectorAll(".data-table tbody tr");

  linhas.forEach(linha => {
    const textoLinha = linha.textContent.toLowerCase();
    linha.style.display = textoLinha.includes(termo) ? "" : "none";
  });
}

function atualizarEstatisticasFinanceirasGestor() {
  const elGeral = document.getElementById("totalGeralDisplay");
  const elCotas = document.getElementById("cotasVendidasDisplay");
  const elHoje = document.getElementById("totalHojeDisplay");

  if (localStorage.getItem(getChaveIsolada("financeiro_zerado")) === "true" && elGeral) {
    elGeral.innerText = "R$ 0,00";
  }

  if (localStorage.getItem(getChaveIsolada("cotas_zeradas")) === "true" && elCotas) {
    elCotas.innerText = "0";
  }

  const chaveHoje = getChaveIsolada("arrecadadoHojePipeiro");
  const hojeZeradoManualmente = localStorage.getItem(chaveHoje) === "0.00";

  let totalArrecadado = 0;
  let arrecadadoHoje = 0;
  let cotasAprovadasCount = 0;
  const prefixoPedido = getChaveIsolada("pedido_");
  const dataHojeStr = new Date().toISOString().split("T")[0];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefixoPedido)) {
      const pedido = parseJSONSeguro(localStorage.getItem(key), null);
      if (pedido && pedido.status === "aprovado") {
        const valorPedido = parseFloat(pedido.valorTotal || 0);
        totalArrecadado += valorPedido;
        if (pedido.data && String(pedido.data).startsWith(dataHojeStr)) {
          arrecadadoHoje += valorPedido;
        }
        if (Array.isArray(pedido.cotas)) {
          cotasAprovadasCount += pedido.cotas.length;
        }
      }
    }
  }

  const historico = parseJSONSeguro(localStorage.getItem(getChaveIsolada("historico_financeiro")), []);
  historico.forEach(item => {
    const valorItem = parseFloat(item.valorTotal || 0);
    totalArrecadado += valorItem;
    cotasAprovadasCount += parseInt(item.cotasQtd || 0, 10);
    if (item.data && String(item.data).startsWith(dataHojeStr)) {
      arrecadadoHoje += valorItem;
    }
  });

  if (elGeral && localStorage.getItem(getChaveIsolada("financeiro_zerado")) !== "true") {
    elGeral.textContent = `R$ ${totalArrecadado.toFixed(2)}`;
  }

  if (elCotas && localStorage.getItem(getChaveIsolada("cotas_zeradas")) !== "true") {
    elCotas.textContent = cotasAprovadasCount;
  }

  if (elHoje) {
    elHoje.textContent = hojeZeradoManualmente ? "R$ 0,00" : `R$ ${arrecadadoHoje.toFixed(2)}`;
  }
}

// =========================================================
// 9. PAINEL DE RESUMO DA HOME
// =========================================================
function carregarResumoHomeCards() {
  const containerCampanhas = document.getElementById("homeCampanhasAtivasGrid");
  const containerVendas = document.getElementById("homeUltimasVendasList");

  if (!containerCampanhas && !containerVendas) return;

  const prefixoCampanha = getChaveIsolada("campanha_");
  const prefixoPedido = getChaveIsolada("pedido_");
  const urlBase = getDiretorioBaseURL();

  if (containerCampanhas) {
    containerCampanhas.innerHTML = "";
    let countAtivas = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefixoCampanha)) {
        const campanha = parseJSONSeguro(localStorage.getItem(key), null);
        if (campanha && !campanha.pausada) {
          countAtivas++;
          const slug = key.replace(prefixoCampanha, "");
          const imgPremio = campanha.imagem || "https://via.placeholder.com/150";
          const linkRifa = `${urlBase}/rifa.html?acao=${encodeURIComponent(slug)}&gestor=${encodeURIComponent(GESTOR_ATIVO_EMAIL)}`;

          const card = document.createElement("div");
          card.style.cssText = "background: #111813; border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; padding: 12px; display: flex; gap: 12px; align-items: center;";
          card.innerHTML = `
            <img src="${escaparHTML(imgPremio)}" alt="" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" />
            <div style="flex: 1; overflow: hidden;">
              <h4 style="color: #F5F8F4; font-size: 14px; margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escaparHTML(campanha.titulo)}</h4>
              <p style="color: #A6FF45; font-size: 12px; margin: 0 0 8px 0; font-weight: 700;">R$ ${parseFloat(campanha.preco || 0).toFixed(2)} a cota</p>
              <div style="display: flex; gap: 6px;">
                <a href="${escaparHTML(linkRifa)}" target="_blank" rel="noopener noreferrer" style="padding: 4px 10px; background: #A6FF45; color: #0D140A; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: 800;">Ver</a>
                <button type="button" onclick="copiarTextoRapido('${encodeURIComponent(linkRifa)}')" style="padding: 4px 10px; background: #0A0F0C; color: #F5F8F4; border: 1px solid rgba(255,255,255,0.14); border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Copiar Link</button>
              </div>
            </div>
          `;
          containerCampanhas.appendChild(card);
        }
      }
    }

    if (countAtivas === 0) {
      containerCampanhas.innerHTML = `<p style="color: #9BA59C; font-size: 13px; margin: 0;">Nenhuma campanha ativa no momento. Clique em "+ Nova campanha" para criar uma.</p>`;
    }
  }

  if (containerVendas) {
    containerVendas.innerHTML = "";
    const vendasRecentes = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefixoPedido)) {
        const pedido = parseJSONSeguro(localStorage.getItem(key), null);
        if (pedido && pedido.status === "aprovado") {
          vendasRecentes.push(pedido);
        }
      }
    }

    if (vendasRecentes.length > 0) {
      vendasRecentes.slice(-3).reverse().forEach(venda => {
        const cotasTexto = Array.isArray(venda.cotas) ? venda.cotas.join(", ") : (venda.cotas || "");
        const item = document.createElement("div");
        item.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #111813; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.09);";
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: rgba(166,255,69,0.12); color: #A6FF45; padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 800;">PAGO</span>
            <div>
              <p style="color: #F5F8F4; font-size: 13px; font-weight: 700; margin: 0;">${escaparHTML(venda.nomeComprador || "Comprador")} comprou cotas</p>
              <p style="color: #9BA59C; font-size: 11px; margin: 2px 0 0 0;">Cotas: ${escaparHTML(cotasTexto)}</p>
            </div>
          </div>
          <span style="color: #A6FF45; font-size: 13px; font-weight: 800;">+ R$ ${parseFloat(venda.valorTotal || 0).toFixed(2)}</span>
        `;
        containerVendas.appendChild(item);
      });
    } else {
      containerVendas.innerHTML = `<p style="color: #9BA59C; font-size: 13px; margin: 0;">Nenhuma venda aprovada registrada recentemente.</p>`;
    }
  }
}

function copiarTextoRapido(textoCodificado) {
  const texto = decodeURIComponent(textoCodificado);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(() => alert("Link copiado!")).catch(() => alert("Não foi possível copiar o link."));
  } else {
    alert("Link: " + texto);
  }
}

// =========================================================
// 10. NAVEGAÇÃO E MODAIS DE RESET
// =========================================================
function navegarParaAba(idAba) {
  const statsGrid = document.querySelector(".stats-grid");
  const homeWidgets = document.getElementById("home-dashboard-widgets");
  const secaoForm = document.getElementById("form-container");
  const secaoPedidos = document.getElementById("pedidos");
  const secaoConfig = document.getElementById("configuracoes");
  const secaoCampanhas = document.getElementById("minhas-campanhas-section");
  const secaoAssinantes = document.getElementById("assinantes-section");

  if (statsGrid) statsGrid.style.display = "none";
  if (homeWidgets) homeWidgets.style.display = "none";
  if (secaoForm) secaoForm.style.display = "none";
  if (secaoPedidos) secaoPedidos.style.display = "none";
  if (secaoConfig) secaoConfig.style.display = "none";
  if (secaoCampanhas) secaoCampanhas.style.display = "none";
  if (secaoAssinantes) secaoAssinantes.style.display = "none";

  if (idAba === "visao-geral") {
    if (statsGrid) statsGrid.style.display = "grid";
    if (homeWidgets) homeWidgets.style.display = "block";
  } else if (idAba === "form-container") {
    if (secaoForm) secaoForm.style.display = "block";
  } else if (idAba === "pedidos") {
    if (secaoPedidos) secaoPedidos.style.display = "block";
  } else if (idAba === "configuracoes") {
    if (secaoConfig) secaoConfig.style.display = "block";
  } else if (idAba === "minhas-campanhas-section") {
    if (secaoCampanhas) secaoCampanhas.style.display = "block";
  } else if (idAba === "assinantes-section") {
    if (secaoAssinantes) {
      secaoAssinantes.style.display = "block";
      carregarListaAssinantesMaster();
    }
  }

  document.querySelectorAll(".sidebar .nav-item").forEach(item => {
    item.classList.remove("active");
    const hrefAttr = item.getAttribute("href");
    if (hrefAttr === "#" + idAba || (idAba === "form-container" && hrefAttr === "#nova-campanha")) {
      item.classList.add("active");
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

let acaoResetPendente = null;

function mostrarModalReset(titulo, texto, callback) {
  const modal = document.getElementById("modalResetPersonalizado");
  const elTitulo = document.getElementById("modalResetTitulo");
  const elTexto = document.getElementById("modalResetTexto");
  const btnConfirmar = document.getElementById("btnConfirmarResetModal");

  if (modal && elTitulo && elTexto && btnConfirmar) {
    elTitulo.innerText = titulo;
    elTexto.innerText = texto;
    acaoResetPendente = callback;
    modal.style.display = "flex";

    btnConfirmar.onclick = function () {
      if (typeof acaoResetPendente === "function") {
        acaoResetPendente();
      }
      fecharModalReset();
    };
  }
}

function fecharModalReset() {
  const modal = document.getElementById("modalResetPersonalizado");
  if (modal) {
    modal.style.display = "none";
    acaoResetPendente = null;
  }
}

function gerenciarArrecadacaoHoje() {
  mostrarModalReset(
    "Zerar Arrecadado Hoje",
    "Deseja realmente zerar o valor registrado como arrecadado hoje?",
    function () {
      const el = document.getElementById("totalHojeDisplay");
      if (el) el.innerText = "R$ 0,00";
      localStorage.setItem(getChaveIsolada("arrecadadoHojePipeiro"), "0.00");
    }
  );
}

function gerenciarTotalArrecadado() {
  mostrarModalReset(
    "Zerar Total Arrecadado",
    "Atenção: Esta ação irá limpar o histórico financeiro e zerar o montante total de forma definitiva. Deseja continuar?",
    function () {
      const el = document.getElementById("totalGeralDisplay");
      if (el) el.innerText = "R$ 0,00";

      localStorage.setItem(getChaveIsolada("financeiro_zerado"), "true");
      localStorage.removeItem(getChaveIsolada("historico_financeiro"));

      const prefixoPedido = getChaveIsolada("pedido_");
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefixoPedido)) {
          const p = parseJSONSeguro(localStorage.getItem(key), null);
          if (p && p.status === "aprovado") {
            localStorage.removeItem(key);
          }
        }
      }

      if (typeof carregarPedidosEComprovantes === "function") carregarPedidosEComprovantes();
      atualizarEstatisticasFinanceirasGestor();
    }
  );
}

function gerenciarCotasVendidas() {
  mostrarModalReset(
    "Zerar Cotas Vendidas",
    "Deseja reiniciar a contagem total de bilhetes/cotas vendidos para zero de forma definitiva?",
    function () {
      const el = document.getElementById("cotasVendidasDisplay");
      if (el) el.innerText = "0";

      localStorage.setItem(getChaveIsolada("cotas_zeradas"), "true");
      localStorage.removeItem(getChaveIsolada("historico_financeiro"));

      const prefixoPedido = getChaveIsolada("pedido_");
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefixoPedido)) {
          const p = parseJSONSeguro(localStorage.getItem(key), null);
          if (p && p.status === "aprovado") {
            localStorage.removeItem(key);
          }
        }
      }

      if (typeof carregarPedidosEComprovantes === "function") carregarPedidosEComprovantes();
      atualizarEstatisticasFinanceirasGestor();
    }
  );
}

function confirmarLimpezaTotalSistema() {
  const confirmacao1 = confirm("ATENÇÃO: Tem certeza absoluta de que deseja apagar todos os dados, campanhas e vendas registradas?");
  if (confirmacao1) {
    const confirmacao2 = prompt("Para confirmar o reset total, escreva a palavra 'APAGAR' em maiúsculas:");
    if (confirmacao2 === "APAGAR") {
      const prefixo = getChaveIsolada("");
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.includes(prefixo)) {
          localStorage.removeItem(key);
        }
      }
      alert("Dados do gestor limpos com sucesso. A página será reiniciada.");
      location.reload();
    } else {
      alert("Operação de limpeza cancelada (palavra de confirmação incorreta).");
    }
  }
}

function limparHistoricoVendas() {
  if (confirm("Tem certeza que deseja limpar o histórico de vendas recentes?")) {
    const listaVendas = document.getElementById("homeUltimasVendasList");
    if (listaVendas) {
      listaVendas.innerHTML = '<p style="color: #9BA59C; font-size: 13px;">Nenhuma venda recente registrada.</p>';
    }
    localStorage.removeItem(getChaveIsolada("historicoVendasAprovadas"));
    alert("Histórico de vendas limpo com sucesso.");
  }
}

function limparTopGanhadores() {
  mostrarModalReset(
    "Limpar Ganhadores",
    "Tem certeza que deseja limpar a lista de ganhadores?",
    function () {
      const listaGanhadores = document.getElementById("homeTopGanhadoresList");
      if (listaGanhadores) {
        listaGanhadores.innerHTML = '<p style="color: #9BA59C; font-size: 13px;">Nenhum ganhador registrado no momento.</p>';
      }
      localStorage.setItem(getChaveIsolada("topGanhadoresPipeiro"), "vazio");
    }
  );
}

// =========================================================
// 11. PAINEL SUPER ADMIN (GESTÃO DE ASSINANTES)
// =========================================================
function lerListaAssinantesUnificada() {
  const raw = localStorage.getItem("pipeiro_assinantes");
  const parsed = parseJSONSeguro(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function salvarListaAssinantesUnificada(lista) {
  localStorage.setItem("pipeiro_assinantes", JSON.stringify(lista));
}

function verificarSeEhSuperAdmin() {
  const adminAtual = normalizarEmail(localStorage.getItem("pipeiro_admin_atual"));
  const seccaoAssinantes = document.getElementById("assinantes-section");

  if (adminAtual === normalizarEmail(EMAIL_SUPER_ADMIN) && seccaoAssinantes) {
    seccaoAssinantes.style.display = "block";
    carregarListaAssinantesMaster();
  }
}

function carregarListaAssinantesMaster() {
  const tbody = document.getElementById("tabelaAssinantesMasterBody");
  if (!tbody) return;

  const listaClientes = lerListaAssinantesUnificada();

  if (listaClientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #9BA59C; padding: 30px;">Nenhum assinante registrado.</td></tr>`;
    return;
  }

  let htmlRows = "";

  listaClientes.forEach(cliente => {
    let badgeStatus = "";
    let btnAcoes = "";
    const statusCliente = cliente.status || cliente.statusPagamento || "pendente";
    const emailCodificado = encodeURIComponent(normalizarEmail(cliente.email));
    const titularPixText = cliente.titularPix
      ? `<span style="color: #A6FF45; font-weight: 700;">${escaparHTML(cliente.titularPix)}</span>`
      : `<span style="color: #6B756D; font-style: italic;">Não informado</span>`;

    if (statusCliente === "aprovado" || statusCliente === "ativo") {
      badgeStatus = `<span style="background: rgba(166,255,69,0.1); color: #A6FF45; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; border: 1px solid rgba(166,255,69,0.28);">Ativo / Aprovado</span>`;
      btnAcoes = `
        <button type="button" onclick="alterarStatusCliente(decodeURIComponent('${emailCodificado}'), 'bloqueado')" style="background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.35); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700; margin-right: 5px;" title="Bloquear por falta de pagamento">Bloquear</button>
        <button type="button" onclick="removerClienteMaster(decodeURIComponent('${emailCodificado}'))" style="background: #111813; color: #9BA59C; border: 1px solid rgba(255,255,255,0.12); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700;" title="Excluir registro">Excluir</button>
      `;
    } else if (statusCliente === "pendente") {
      badgeStatus = `<span style="background: rgba(234,179,8,0.12); color: #eab308; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; border: 1px solid rgba(234,179,8,0.28);">Pagamento Informado</span>`;
      btnAcoes = `
        <button type="button" onclick="alterarStatusCliente(decodeURIComponent('${emailCodificado}'), 'aprovado')" style="background: #A6FF45; color: #0D140A; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 800; margin-right: 5px;">Aprovar Acesso</button>
        <button type="button" onclick="alterarStatusCliente(decodeURIComponent('${emailCodificado}'), 'bloqueado')" style="background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.35); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700;">Recusar</button>
      `;
    } else {
      badgeStatus = `<span style="background: rgba(239,68,68,0.12); color: #fca5a5; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; border: 1px solid rgba(239,68,68,0.28);">Bloqueado</span>`;
      btnAcoes = `
        <button type="button" onclick="alterarStatusCliente(decodeURIComponent('${emailCodificado}'), 'aprovado')" style="background: #A6FF45; color: #0D140A; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 800; margin-right: 5px;">Reativar Acesso</button>
        <button type="button" onclick="removerClienteMaster(decodeURIComponent('${emailCodificado}'))" style="background: #111813; color: #9BA59C; border: 1px solid rgba(255,255,255,0.12); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700;">Excluir</button>
      `;
    }

    htmlRows += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.09);">
        <td style="padding: 14px; color: #F5F8F4; font-weight: 700;">${escaparHTML(cliente.nome)}</td>
        <td style="padding: 14px; font-size: 13px; color: #9BA59C;">
          <div>E-mail: ${escaparHTML(cliente.email)}</div>
          <div style="margin-top: 3px;">WhatsApp: ${escaparHTML(cliente.whatsapp || "Não informado")}</div>
        </td>
        <td style="padding: 14px; font-size: 13px;">${titularPixText}</td>
        <td style="padding: 14px;">${badgeStatus}</td>
        <td style="padding: 14px; text-align: center;">${btnAcoes}</td>
      </tr>
    `;
  });

  tbody.innerHTML = htmlRows;
}

function alterarStatusCliente(emailCliente, novoStatus) {
  const emailAlvo = normalizarEmail(emailCliente);
  const listaClientes = lerListaAssinantesUnificada();
  const cliente = listaClientes.find(c => normalizarEmail(c.email) === emailAlvo);
  if (cliente) {
    cliente.status = novoStatus;
    cliente.statusPagamento = novoStatus;
    salvarListaAssinantesUnificada(listaClientes);
    carregarListaAssinantesMaster();
  }
}

function removerClienteMaster(emailCliente) {
  if (!confirm("Tem certeza de que deseja eliminar este cliente do sistema?")) return;
  const emailAlvo = normalizarEmail(emailCliente);
  const listaClientes = lerListaAssinantesUnificada().filter(c => normalizarEmail(c.email) !== emailAlvo);
  salvarListaAssinantesUnificada(listaClientes);
  carregarListaAssinantesMaster();
}

function fazerLogout() {
  if (confirm("Deseja realmente terminar a sessão?")) {
    localStorage.removeItem("pipeiro_logado");
    localStorage.removeItem("pipeiro_admin_atual");
    window.location.href = "cadastro.html";
  }
}

// =========================================================
// 12. TEMPO REAL & ALERTAS DE NOVAS COTAS (AUTOMÁTICO)
// =========================================================
let ultimoTotalPedidos = -1;

function iniciarEscutaNovosPedidos() {
  setInterval(() => {
    let totalPedidosAtual = 0;
    const prefixoPedido = getChaveIsolada("pedido_");

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefixoPedido)) {
        totalPedidosAtual++;
      }
    }

    if (ultimoTotalPedidos === -1) {
      ultimoTotalPedidos = totalPedidosAtual;
      return;
    }

    if (totalPedidosAtual > ultimoTotalPedidos) {
      ultimoTotalPedidos = totalPedidosAtual;
      dispararAlertaNovaCota();
      carregarPedidosEComprovantes();
      atualizarEstatisticasFinanceirasGestor();
      carregarResumoHomeCards();
    }
  }, 3000);
}

function dispararAlertaNovaCota() {
  let banner = document.getElementById("alertaNovaCotaFlutuante");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "alertaNovaCotaFlutuante";
    banner.style.cssText = "position: fixed; top: 20px; right: 20px; background: #111813; color: #F5F8F4; border: 1px solid #A6FF45; padding: 14px 18px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 99999; font-weight: 700; display: flex; align-items: center; gap: 10px;";
    document.body.appendChild(banner);
  }

  banner.innerHTML = `<span style="color: #A6FF45;">Nova cota reservada ou comprada. Verifique os pedidos pendentes.</span>`;
  banner.style.display = "flex";

  setTimeout(() => {
    banner.style.display = "none";
  }, 6000);

  try {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
}