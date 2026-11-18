// =========================================================
// PIPEIROGESTOR - SCRIPT COMPLETO DA PÁGINA DO COMPRADOR
// =========================================================

const emojisAnimais = [
  "🐷", "🐓", "🐴", "🐮", "🐑", "🐐", "🐶", "🐱", "🐰", "🦆",
  "🦃", "🦅", "🐝", "🦋", "🐸", "🐢", "🐍", "🦉", "🐒", "🐘",
  "🦁", "🐯", "🐻", "🐼", "🦊"
];

let cotasSelecionadas = [];
let precoUnitarioCota = 10.00;
let chavePixCampanha = "";
let titularPixCampanha = "";
let tipoChavePixCampanha = "PIX";
let wppSuporteOrganizador = "";
let totalCotasCampanha = 25;
let estiloTemaCotas = "animais"; // Definido como animais para exibir os emojis
let promocoesCampanha = []; // ARRAY DE PROMOÇÕES DA CAMPANHA
let imagensCampanhaPublica = [];
let indiceFotoAtual = 0;

// =========================================================
// 1. INICIALIZAÇÃO E CRONÔMETRO DE URGÊNCIA
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  carregarDadosCampanhaPublica();
  iniciarCronometroRegressivoTopo(600); // 10 Minutos (600 segundos)
  marcarCotasOcupadas(); // Já bloqueia e marca as cotas ocupadas ao carregar a página
});

function iniciarCronometroRegressivoTopo(segundosTotais) {
  const displayTopo = document.getElementById("contadorRegressivoTopo");
  if (!displayTopo) return;

  let tempoRestante = segundosTotais;

  const timer = setInterval(() => {
    let minutos = Math.floor(tempoRestante / 60);
    let segundos = tempoRestante % 60;

    minutos = minutos < 10 ? "0" + minutos : minutos;
    segundos = segundos < 10 ? "0" + segundos : segundos;

    displayTopo.textContent = `${minutos}:${segundos}`;

    if (--tempoRestante < 0) {
      clearInterval(timer);
      displayTopo.textContent = "00:00";
    }
  }, 1000);
}
// =========================================================
// 2. CARREGAMENTO DOS DADOS DA AÇÃO / GESTOR (CORRIGIDO)
// =========================================================
function carregarDadosCampanhaPublica() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('acao');
  const gestorParam = urlParams.get('gestor');

  // Tenta carregar as configurações gerais do organizador
  const configGestor = localStorage.getItem('pipeiro_configuracoes');
  if (configGestor) {
    try {
      const cfg = JSON.parse(configGestor);
      if (cfg.whatsappSuporte) wppSuporteOrganizador = cfg.whatsappSuporte;

      const elOrg = document.getElementById('nomeOrganizadorDisplay');
      if (elOrg && cfg.nomeOrganizador) {
        elOrg.textContent = cfg.nomeOrganizador;
      }
    } catch(e) {
      console.error("Erro ao ler configuracoes do gestor:", e);
    }
  }

  // Atualiza links de suporte do WhatsApp se houver número cadastrado
  if (wppSuporteOrganizador) {
    const numLimpo = wppSuporteOrganizador.replace(/\D/g, '');
    const btnSuporte = document.getElementById('btnSuporteWppHeader');
    if (btnSuporte) {
      btnSuporte.href = `https://api.whatsapp.com/send?phone=55${numLimpo}&text=${encodeURIComponent('Olá! Preciso de suporte com a ação.')}`;
    }
    const btnContato = document.getElementById('btnContatoOrganizador');
    if (btnContato) {
      btnContato.href = `https://api.whatsapp.com/send?phone=55${numLimpo}&text=${encodeURIComponent('Olá! Gostaria de informações sobre a ação.')}`;
    }
  }

  if (!slug) return;

  // BUSCA INTELIGENTE DA CAMPANHA (Suporta chaves isoladas por gestor ou globais)
  let dadosSalvos = null;

  if (gestorParam) {
    const emailSanitizado = decodeURIComponent(gestorParam).replace(/[^a-z0-9]/g, '_');
    dadosSalvos = localStorage.getItem(`pipeiro_${emailSanitizado}_campanha_${slug}`);
  }

  // Se não encontrar pela chave isolada do gestor, tenta a chave global padrão
  if (!dadosSalvos) {
    dadosSalvos = localStorage.getItem('pipeiro_campanha_' + slug);
  }

  // Se ainda assim não encontrar, varre o localStorage à procura de qualquer chave correspondente ao slug
  if (!dadosSalvos) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('campanha_' + slug)) {
        dadosSalvos = localStorage.getItem(key);
        break;
      }
    }
  }

  if (!dadosSalvos) {
    const elTitulo = document.getElementById('tituloPremio');
    if (elTitulo) elTitulo.textContent = "Ação não encontrada ou expirada.";
    return;
  }

  try {
    const campanha = JSON.parse(dadosSalvos);

    // Título da Ação
    if (campanha.titulo) {
      const elTitulo = document.getElementById('tituloPremio');
      if (elTitulo) elTitulo.textContent = campanha.titulo;
      document.title = `${campanha.titulo} | PipeiroGestor`;
    }

    // Descrição e Regulamento
    if (campanha.descricao) {
      const elDesc = document.getElementById('descricaoPremio');
      if (elDesc) elDesc.textContent = campanha.descricao;
    }

    // Preço da Cota
    if (campanha.preco) {
      precoUnitarioCota = parseFloat(campanha.preco);
      const elPreco = document.getElementById('valorPorCota');
      if (elPreco) elPreco.textContent = `R$ ${precoUnitarioCota.toFixed(2)}`;
    }

    // Carrega Promoções / Descontos da Campanha
    if (campanha.promocoes && Array.isArray(campanha.promocoes)) {
      promocoesCampanha = campanha.promocoes;
    } else if (campanha.descontos && Array.isArray(campanha.descontos)) {
      promocoesCampanha = campanha.descontos;
    }

    estiloTemaCotas = "animais";

    // Imagens do Prêmio / Carrossel
    imagensCampanhaPublica = [];
    indiceFotoAtual = 0;

    if (campanha.imagens && Array.isArray(campanha.imagens)) {
      imagensCampanhaPublica = campanha.imagens.filter(img => img && img.trim() !== "");
    } else if (campanha.imagem && campanha.imagem.trim() !== "") {
      imagensCampanhaPublica = [campanha.imagem];
    }

    atualizarExibicaoCarrossel();

    // Dados de Pagamento PIX
    chavePixCampanha = campanha.chavePix || '';
    titularPixCampanha = campanha.titular || '';
    tipoChavePixCampanha = campanha.tipoChave || 'PIX';

    const elChave = document.getElementById('textoChavePix');
    if (elChave) elChave.textContent = chavePixCampanha || 'Chave não informada';

    const elTipoChave = document.getElementById('tipoChavePixDisplay');
    if (elTipoChave) elTipoChave.textContent = `Tipo: ${tipoChavePixCampanha}`;

    const elTitular = document.getElementById('titularPixDisplay');
    if (elTitular) elTitular.textContent = `Titular: ${titularPixCampanha || 'Não informado'}`;

    atualizarBarraProgressoInteligente(0, totalCotasCampanha);
    gerarGridCotas(totalCotasCampanha);
    marcarCotasOcupadas(); // Aplica o bloqueio visual após gerar o grid

  } catch (e) {
    console.error("Erro ao carregar dados da ação:", e);
  }
}

// =========================================================
// 3. BARRA DE PROGRESSO & SELEÇÃO DE COTAS COM DESCONTO INTELIGENTE
// =========================================================
function atualizarBarraProgressoInteligente(cotasVendidas, totalCotas) {
  const porcentagem = Math.round((cotasVendidas / totalCotas) * 100);
  const textoPorcentagem = document.getElementById('porcentagemVendida');
  const barraPreenchida = document.getElementById('barraProgresso');

  if (textoPorcentagem) textoPorcentagem.textContent = `${porcentagem}% reservado`;
  if (barraPreenchida) barraPreenchida.style.width = `${porcentagem}%`;
}

function gerarGridCotas(total) {
  const container = document.getElementById('gridCotas');
  if (!container) return;

  container.innerHTML = "";

  for (let i = 1; i <= total; i++) {
    const numFormatado = i < 10 ? "0" + i : "" + i;
    const emojiAnimal = emojisAnimais[(i - 1) % emojisAnimais.length];

    const btn = document.createElement("button");
    btn.type = "button";
    
    btn.style.cssText = "background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 8px; color: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; transition: all 0.2s ease;";

    if (estiloTemaCotas === "animais") {
      btn.innerHTML = `
        <span style="font-size: 20px; line-height: 1;">${emojiAnimal}</span>
        <span style="font-size: 13px; font-weight: bold; color: #00ff88;">${numFormatado}</span>
      `;
    } else {
      btn.innerHTML = `<span style="font-size: 16px; font-weight: bold; color: #fff;">${numFormatado}</span>`;
    }

    btn.addEventListener("click", () => {
      alternarSelecaoCota(numFormatado, btn);
    });

    container.appendChild(btn);
  }
}

function alternarSelecaoCota(numero, elemento) {
  const index = cotasSelecionadas.indexOf(numero);

  if (index > -1) {
    cotasSelecionadas.splice(index, 1);
    elemento.classList.remove('selecionado');
  } else {
    cotasSelecionadas.push(numero);
    elemento.classList.add('selecionado');
  }

  atualizarCarrinhoECalculadora();
}

// =========================================================
// CÁLCULO INTELIGENTE DE PACOTES PROMOCIONAIS (COMBOS PROPORCIONAIS)
// =========================================================
function calcularPrecoTotal(qtd) {
  if (qtd <= 0) return 0;

  const precoUnitario = parseFloat(precoUnitarioCota) || 0;

  if (promocoesCampanha && promocoesCampanha.length > 0) {
    const promosOrdenadas = [...promocoesCampanha].sort((a, b) => parseInt(b.quantidade) - parseInt(a.quantidade));
    
    let qtdRestante = qtd;
    let valorTotal = 0;

    for (const promo of promosOrdenadas) {
      const qPromo = parseInt(promo.quantidade);
      const vPromo = parseFloat(promo.valor);

      if (qPromo > 0 && !isNaN(qPromo) && !isNaN(vPromo)) {
        const pacotes = Math.floor(qtdRestante / qPromo);
        if (pacotes > 0) {
          valorTotal += pacotes * vPromo;
          qtdRestante %= qPromo;
        }
      }
    }

    if (qtdRestante > 0) {
      valorTotal += qtdRestante * precoUnitario;
    }

    return valorTotal;
  }

  return qtd * precoUnitario;
}

function atualizarCarrinhoECalculadora() {
  const carrinho = document.getElementById('carrinhoFloat');
  const textoQtd = document.getElementById('textoQtdSelecionadas');
  const textoValor = document.getElementById('valorTotalCarrinho');

  const qtd = cotasSelecionadas.length;
  const total = calcularPrecoTotal(qtd);

  if (textoQtd) textoQtd.textContent = `${qtd} cota(s) selecionada(s)`;
  if (textoValor) textoValor.textContent = `R$ ${total.toFixed(2)}`;

  if (carrinho) {
    carrinho.style.display = qtd > 0 ? 'flex' : 'none';
  }
}

// =========================================================
// 4. FUNIL DE CHECKOUT (VALIDADO, BLINDADO E COM URGÊNCIA)
// =========================================================
function abrirPassoIdentificacao() {
  if (cotasSelecionadas.length === 0) {
    alert("⚠️ Selecione pelo menos uma cota!");
    return;
  }
  const elPasso1 = document.getElementById('etapaIdentificacao');
  const elPasso2 = document.getElementById('etapaPagamentoPix');
  const modal = document.getElementById('modalCheckout');

  if (elPasso1) elPasso1.style.display = 'block';
  if (elPasso2) elPasso2.style.display = 'none';
  if (modal) modal.style.display = 'flex';
}

function avancarParaPagamentoPix() {
  const nomeInput = document.getElementById('inputNomeComprador');
  const wppInput = document.getElementById('inputWppComprador');
  
  const nome = nomeInput ? nomeInput.value.trim() : "";
  const wpp = wppInput ? wppInput.value.replace(/\D/g, '') : "";

  // Validação estrita do Nome Completo (exige pelo menos duas palavras)
  if (!nome || nome.split(' ').length < 2) {
    alert("⚠️ Por favor, digite seu Nome Completo (Nome e Sobrenome).");
    if (nomeInput) nomeInput.focus();
    return;
  }

  // Validação estrita do WhatsApp (mínimo de 10 dígitos com DDD)
  if (!wpp || wpp.length < 10) {
    alert("⚠️ Por favor, digite um número de WhatsApp válido com DDD (Ex: 21999999999).");
    if (wppInput) wppInput.focus();
    return;
  }

  if (cotasSelecionadas.length === 0) {
    alert("⚠️ Selecione pelo menos uma cota para continuar!");
    return;
  }

  const elPasso1 = document.getElementById('etapaIdentificacao');
  const elPasso2 = document.getElementById('etapaPagamentoPix');

  if (elPasso1) elPasso1.style.display = 'none';
  if (elPasso2) elPasso2.style.display = 'block';

  // Inicia o cronómetro regressivo específico de 10 minutos no modal de pagamento
  iniciarCronometroModalPix();
}

function iniciarCronometroModalPix() {
  const containerPix = document.getElementById('etapaPagamentoPix');
  if (!containerPix) return;

  let avisoUrgencia = document.getElementById('avisoUrgenciaPix');
  if (!avisoUrgencia) {
    avisoUrgencia = document.createElement('div');
    avisoUrgencia.id = 'avisoUrgenciaPix';
    avisoUrgencia.style.cssText = "background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center; color: #f59e0b; font-size: 13px; font-weight: bold;";
    containerPix.prepend(avisoUrgencia);
  }

  let segundosRestantes = 600; // 10 minutos

  if (window.timerCheckoutInterval) {
    clearInterval(window.timerCheckoutInterval);
  }

  window.timerCheckoutInterval = setInterval(() => {
    let min = Math.floor(segundosRestantes / 60);
    let seg = segundosRestantes % 60;

    min = min < 10 ? "0" + min : min;
    seg = seg < 10 ? "0" + seg : seg;

    avisoUrgencia.innerHTML = `⏱️ Suas cotas estão reservadas por <span style="color: #fff;">${min}:${seg}</span>. Pague o Pix e envie o comprovante!`;

    if (--segundosRestantes < 0) {
      clearInterval(window.timerCheckoutInterval);
      avisoUrgencia.innerHTML = `⚠️ O tempo de reserva expirou. Suas cotas podem voltar a ficar disponíveis.`;
      avisoUrgencia.style.borderColor = '#ef4444';
      avisoUrgencia.style.color = '#ef4444';
    }
  }, 1000);
}

function fecharCheckout() {
  const modal = document.getElementById('modalCheckout');
  if (modal) modal.style.display = 'none';
  if (window.timerCheckoutInterval) {
    clearInterval(window.timerCheckoutInterval);
  }
}

// =========================================================
// 5. CÓPIA DE CHAVE PIX E ENVIO NO WHATSAPP
// =========================================================
function copiarChavePix() {
  if (!chavePixCampanha) {
    alert("A chave PIX não foi cadastrada pelo organizador.");
    return;
  }

  navigator.clipboard.writeText(chavePixCampanha).then(() => {
    alert("✅ Chave PIX copiada com sucesso! Cole no app do seu banco para pagar.");
  }).catch(err => {
    console.error("Erro ao copiar PIX:", err);
    alert("Não foi possível copiar automaticamente. Selecione e copie a chave manualmente.");
  });
}

function enviarComprovanteWpp() {
  const nome = document.getElementById('inputNomeComprador')?.value.trim();
  const wpp = document.getElementById('inputWppComprador')?.value.trim();

  const cotasTexto = cotasSelecionadas.sort((a, b) => parseInt(a) - parseInt(b)).join(', ');
  const valorTotal = calcularPrecoTotal(cotasSelecionadas.length).toFixed(2);

  const mensagem = `Olá! Realizei o pedido das minhas cotas:\n\n` +
                    `👤 *Nome:* ${nome}\n` +
                    `📱 *WhatsApp:* ${wpp}\n` +
                    `🎟️ *Cotas Reservadas:* ${cotasTexto}\n` +
                    `💰 *Valor Total:* R$ ${valorTotal}\n\n` +
                    `Segue em anexo o comprovante do PIX para confirmação!`;

  const numSuporteLimpo = wppSuporteOrganizador ? wppSuporteOrganizador.replace(/\D/g, '') : '';
  const urlWpp = numSuporteLimpo 
    ? `https://api.whatsapp.com/send?phone=55${numSuporteLimpo}&text=${encodeURIComponent(mensagem)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;

  window.open(urlWpp, '_blank');
}

// =========================================================
// 6. MODAL COMO FUNCIONA E BUSCA DE RESERVAS
// =========================================================
function abrirModalComoFunciona() {
  const modal = document.getElementById('modalComoFunciona');
  if (modal) modal.style.display = 'flex';
}

function fecharModalComoFunciona() {
  const modal = document.getElementById('modalComoFunciona');
  if (modal) modal.style.display = 'none';
}

function buscarMeusNumeros() {
  const wppBusca = document.getElementById('inputBuscarMeusNumeros')?.value.trim();
  const divResultado = document.getElementById('resultadoBuscaNumeros');
  
  if (!wppBusca) {
    alert("Por favor, digite seu WhatsApp para buscar.");
    return;
  }

  if (divResultado) {
    divResultado.innerHTML = `<p style="color: #00ff88; font-weight: bold; margin-top: 10px;">🔍 Buscando cotas registradas para ${wppBusca}...</p>`;
    
    setTimeout(() => {
      divResultado.innerHTML = `<p style="color: #38bdf8; margin-top: 10px;">Nenhuma cota confirmada para este número no momento. Garanta suas cotas selecionando acima!</p>`;
    }, 1200);
  }
}

// =========================================================
// CARROSSEL DE IMAGENS DO COMPRADOR
// =========================================================
function atualizarExibicaoCarrossel() {
  const imgEl = document.getElementById('imgPremioCarrossel');
  const btnAnt = document.getElementById('btnAnteriorFoto');
  const btnProx = document.getElementById('btnProximaFoto');
  const indEl = document.getElementById('indicadorFoto');

  if (!imgEl) return;

  if (imagensCampanhaPublica.length > 0) {
    imgEl.src = imagensCampanhaPublica[indiceFotoAtual];
    imgEl.style.display = 'block';

    const mostrarControles = imagensCampanhaPublica.length > 1;
    if (btnAnt) btnAnt.style.display = mostrarControles ? 'flex' : 'none';
    if (btnProx) btnProx.style.display = mostrarControles ? 'flex' : 'none';
    if (indEl) {
      indEl.style.display = mostrarControles ? 'block' : 'none';
      indEl.textContent = `${indiceFotoAtual + 1} / ${imagensCampanhaPublica.length}`;
    }
  } else {
    imgEl.style.display = 'none';
    if (btnAnt) btnAnt.style.display = 'none';
    if (btnProx) btnProx.style.display = 'none';
    if (indEl) indEl.style.display = 'none';
  }
}

function mudarFotoCarrossel(direcao) {
  if (imagensCampanhaPublica.length <= 1) return;
  
  indiceFotoAtual += direcao;
  
  if (indiceFotoAtual < 0) {
    indiceFotoAtual = imagensCampanhaPublica.length - 1;
  } else if (indiceFotoAtual >= imagensCampanhaPublica.length) {
    indiceFotoAtual = 0;
  }

  atualizarExibicaoCarrossel();
}

// =========================================================
// SALVAR PEDIDO PENDENTE PARA O GESTOR CORRETO APROVAR
// =========================================================
function registrarPedidoNoGestor() {
  const nome = document.getElementById('inputNomeComprador')?.value.trim();
  const wpp = document.getElementById('inputWppComprador')?.value.trim();

  if (!nome || !wpp) {
    alert("Por favor, preencha seu Nome e WhatsApp antes de continuar.");
    return;
  }

  if (cotasSelecionadas.length === 0) {
    alert("Nenhuma cota selecionada!");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const slugAcao = urlParams.get('acao') || 'geral';
  const gestorParam = urlParams.get('gestor');

  // Identifica o prefixo do gestor dono da rifa
  let prefixoChave = 'pipeiro_pedido_';
  if (gestorParam) {
    const emailSanitizado = decodeURIComponent(gestorParam).replace(/[^a-z0-9]/g, '_');
    prefixoChave = `pipeiro_${emailSanitizado}_pedido_`;
  } else {
    // Se não veio no link, varre o localStorage para achar de quem é a campanha
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('campanha_' + slugAcao)) {
        const partes = key.split('_campanha_');
        if (partes.length > 0 && partes[0].startsWith('pipeiro_')) {
          prefixoChave = partes[0] + '_pedido_';
          break;
        }
      }
    }
  }

  const idPedido = prefixoChave + Date.now();
  const valorTotal = calcularPrecoTotal(cotasSelecionadas.length);

  const novoPedido = {
    id: idPedido,
    slugAcao: slugAcao,
    nomeComprador: nome,
    whatsapp: wpp,
    cotas: [...cotasSelecionadas].sort((a, b) => parseInt(a) - parseInt(b)),
    valorTotal: valorTotal,
    status: 'pendente',
    data: new Date().toISOString()
  };

  localStorage.setItem(idPedido, JSON.stringify(novoPedido));
  avancarParaPagamentoPix();
}

// =========================================================
// BLOQUEAR / MARCAR COTAS JÁ RESERVADAS OU PAGAS (CORRIGIDO)
// =========================================================
function marcarCotasOcupadas() {
  const urlParams = new URLSearchParams(window.location.search);
  const slugAtual = urlParams.get('acao');
  const gestorParam = urlParams.get('gestor');
  if (!slugAtual) return;

  // Define o prefixo específico do gestor se houver no link
  let prefixoGestor = '';
  if (gestorParam) {
    const emailSanitizado = decodeURIComponent(gestorParam).replace(/[^a-z0-9]/g, '_');
    prefixoGestor = `pipeiro_${emailSanitizado}_pedido_`;
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    // Varre todas as chaves de pedidos (globais e isoladas por gestor)
    if (key && (key.startsWith('pipeiro_pedido_') || (prefixoGestor && key.startsWith(prefixoGestor)) || key.includes('_pedido_'))) {
      try {
        const pedido = JSON.parse(localStorage.getItem(key));
        
        if (pedido && pedido.slugAcao === slugAtual && (pedido.status === 'pendente' || pedido.status === 'aprovado')) {
          if (Array.isArray(pedido.cotas)) {
            pedido.cotas.forEach(cotaNum => {
              const botoes = document.querySelectorAll('#gridCotas button');
              botoes.forEach(btn => {
                if (btn.textContent.includes(cotaNum)) {
                  btn.disabled = true;
                  btn.style.background = '#334155';
                  btn.style.color = '#94a3b8';
                  btn.style.cursor = 'not-allowed';
                  if (pedido.status === 'aprovado') {
                    btn.title = "Cota já paga";
                  } else {
                    btn.title = "Cota aguardando aprovação";
                  }
                }
              });
            });
          }
        }
      } catch (e) {
        console.error("Erro ao verificar cotas ocupadas:", e);
      }
    }
  }
}

// =========================================================
// MELHORIA: AVISO DE EXPIRAÇÃO DE RESERVA NA TELA DO COMPRADOR
// =========================================================
function adicionarAvisoTempoExpiracao() {
  const topo = document.getElementById('contadorRegressivoTopo');
  if (topo) {
    const avisoExtra = document.createElement('div');
    avisoExtra.style.fontSize = '11px';
    avisoExtra.style.color = '#94a3b8';
    avisoExtra.style.textAlign = 'center';
    avisoExtra.style.marginTop = '4px';
    avisoExtra.textContent = '⏱️ Suas reservas expiram em caso de não envio do Pix.';
    if (topo.parentNode) {
      topo.parentNode.appendChild(avisoExtra);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  adicionarAvisoTempoExpiracao();
});

// Automação para puxar o WhatsApp do Assinante para os botões de suporte da rifa
document.addEventListener("DOMContentLoaded", function() {
    const whatsappAssinante = localStorage.getItem('pipeiro_whatsapp_ativo');
    const nomeAssinante = localStorage.getItem('pipeiro_nome_ativo');

    if (whatsappAssinante) {
        let numeroLimpo = whatsappAssinante.replace(/\D/g, '');
        if (!numeroLimpo.startsWith('55') && numeroLimpo.length <= 11) {
            numeroLimpo = '55' + numeroLimpo;
        }

        const mensagemSuporte = encodeURIComponent(`Olá ${nomeAssinante || 'Organizador'}, vim através da sua rifa e preciso de suporte com as cotas.`);
        const urlWppFinal = `https://wa.me/${numeroLimpo}?text=${mensagemSuporte}`;

        const btnSuporteHeader = document.getElementById('btnSuporteWppHeader');
        const btnContatoOrg = document.getElementById('btnContatoOrganizador');
        const nomeOrgDisplay = document.getElementById('nomeOrganizadorDisplay');

        if (btnSuporteHeader) btnSuporteHeader.href = urlWppFinal;
        if (btnContatoOrg) btnContatoOrg.href = urlWppFinal;
        if (nomeOrgDisplay && nomeAssinante) nomeOrgDisplay.innerText = nomeAssinante;
    }
});