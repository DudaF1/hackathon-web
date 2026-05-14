const MARROM = '#6b4226';
const STORAGE_KEY = 'rh_cosmetics_admin_web_v1';
const AUTH_KEY = 'rh_cosmetics_admin_auth_v1';

function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function getInitialDatabase() {
  return deepClone(window.RH_DATABASE || {});
}

let state = loadState();

function loadState() {
  const initial = getInitialDatabase();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return initial;
    return { ...initial, ...saved };
  } catch {
    return initial;
  }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const $ = (selector) => document.querySelector(selector);
const app = $('#app');

function currentAdmin() {
  const usuario = localStorage.getItem(AUTH_KEY);
  if (!usuario) return null;
  return state.usuarios.find(u => u.usuario === usuario && u.tipo === 'admin') || null;
}
function isLoggedIn() { return !!currentAdmin(); }
function updateAuthView() {
  const logged = isLoggedIn();
  const loginScreen = $('#loginScreen');
  const adminShell = $('#adminShell');
  if (loginScreen) loginScreen.classList.toggle('hidden', logged);
  if (adminShell) adminShell.classList.toggle('hidden', !logged);
}
function setupLogin() {
  const form = $('#loginForm');
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault();
    const usuario = $('#loginUser').value.trim();
    const senha = $('#loginPass').value.trim();
    const admin = state.usuarios.find(u => u.usuario === usuario && u.senha === senha && u.tipo === 'admin');
    if (!admin) {
      $('#loginError').classList.remove('hidden');
      return;
    }
    $('#loginError').classList.add('hidden');
    localStorage.setItem(AUTH_KEY, admin.usuario);
    updateAuthView();
    render();
  };
}

function funcionarios() { return state.usuarios.filter(u => u.tipo === 'funcionario'); }
function admins() { return state.usuarios.filter(u => u.tipo === 'admin'); }
function setPage(page) {
  state.page = page;
  state.selectedBenefit = null;
  state.selectedPessoal = null;
  saveState();
  render();
}
function setHeader(title, subtitle) {
  $('#pageTitle').textContent = title;
  $('#pageSubtitle').textContent = subtitle;
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.page === state.page));
}
function badge(status) {
  const map = { 'Aprovado': 'green', 'Negado': 'red', 'Esperando avaliação': 'yellow', 'Assinado': 'green', 'Esperando assinatura': 'red' };
  return `<span class="badge ${map[status] || 'brown'}">${status}</span>`;
}
function openModal(title, subtitle, body) {
  $('#modalTitle').textContent = title;
  $('#modalSubtitle').textContent = subtitle || '';
  $('#modalBody').innerHTML = body;
  $('#modalBackdrop').classList.remove('hidden');
}
function closeModal() { $('#modalBackdrop').classList.add('hidden'); }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
}

function dashboardData() {
  const totalFuncionarios = funcionarios().length;
  const pendentes = state.solicitacoes.filter(s => s.status === 'Esperando avaliação').length;
  const aprovadas = state.solicitacoes.filter(s => s.status === 'Aprovado').length;
  const negadas = state.solicitacoes.filter(s => s.status === 'Negado').length;
  const holeritesPendentes = state.holeritesAdmin.reduce((t, f) => t + f.holerites.filter(h => h.status === 'Esperando assinatura').length, 0);
  const holeritesAssinados = state.holeritesAdmin.reduce((t, f) => t + f.holerites.filter(h => h.status === 'Assinado').length, 0);
  const totalBase = state.solicitacoes.length + holeritesPendentes + holeritesAssinados || 1;
  const compliance = Math.round(((aprovadas + holeritesAssinados) / totalBase) * 100);
  return { totalFuncionarios, pendentes, aprovadas, negadas, holeritesPendentes, holeritesAssinados, compliance };
}

function renderHome() {
  setHeader('Home', 'Gerencie mural, avisos e votações do portal');
  const mural = state.murais[state.muralAtual] || state.murais[0];
  const votacao = state.votacoes[0];
  const totalVotos = Object.keys(votacao.votosUsuarios || {}).length;
  const faltam = funcionarios().filter(f => !(votacao.votosUsuarios || {})[f.nome]);

  app.innerHTML = `
    <div class="page-heading"><h2>Olá, Admin</h2><p>Visão geral dos comunicados e participação dos funcionários.</p></div>
    <div class="grid two">
      <section>
        <div class="card carousel clickable" id="openMural">
          <img src="${mural.imagem}" alt="${escapeHtml(mural.titulo)}" />
          <div class="carousel-overlay"><h3>${mural.titulo}</h3><p>${mural.descricao}</p><small>Toque para abrir</small></div>
        </div>
        <div class="carousel-controls">
          <button class="outline-btn" id="prevMural">Anterior</button>
          <div class="dots">${state.murais.map((_, i) => `<span class="dot ${i === state.muralAtual ? 'active' : ''}"></span>`).join('')}</div>
          <button class="outline-btn" id="nextMural">Próximo</button>
        </div>
      </section>
      <section class="card">
        <div class="card-header"><div><h3 class="card-title">Ações rápidas</h3><p class="card-sub">Crie conteúdos para o portal.</p></div></div>
        <div class="actions">
          <button class="primary-btn" id="newMural">Novo mural</button>
          <button class="outline-btn" id="newAviso">Novo aviso</button>
          <button class="outline-btn" id="newVotacao">Editar votação</button>
        </div>
      </section>
    </div>

    <div class="grid two" style="margin-top:16px">
      <section class="card">
        <div class="card-header"><h3 class="card-title">Avisos</h3></div>
        <div class="list">${state.avisos.map(a => `<div class="list-item"><div><strong>${a.titulo}</strong><span>${a.descricao}</span></div><span>${a.data || ''}</span></div>`).join('')}</div>
      </section>
      <section class="card">
        <div class="card-header"><div><h3 class="card-title">Votação</h3><p class="card-sub">Clique para ver quem votou e quem falta votar.</p></div><button class="outline-btn" id="openVotes">Ver funcionários</button></div>
        <h3>${votacao.pergunta}</h3>
        ${votacao.opcoes.map(op => {
          const count = Object.values(votacao.votosUsuarios || {}).filter(v => Number(v) === Number(op.id)).length;
          const pct = totalVotos ? Math.round(count / totalVotos * 100) : 0;
          return `<div class="vote-option"><div class="vote-progress" style="width:${pct}%"></div><div class="vote-content"><span>${op.texto}</span><span>${pct}%</span></div><small>${count} votos</small></div>`;
        }).join('')}
        <div class="actions"><span class="badge green">${totalVotos} votaram</span><span class="badge yellow">${faltam.length} faltam votar</span></div>
      </section>
    </div>
  `;

  $('#prevMural').onclick = () => { state.muralAtual = (state.muralAtual - 1 + state.murais.length) % state.murais.length; saveState(); renderHome(); };
  $('#nextMural').onclick = () => { state.muralAtual = (state.muralAtual + 1) % state.murais.length; saveState(); renderHome(); };
  $('#openMural').onclick = () => mural.titulo.toLowerCase().includes('treinamento') ? openTreinamentos() : setPage('dashboard');
  $('#openVotes').onclick = showVotesModal;
  $('#newMural').onclick = () => openContentModal('Mural');
  $('#newAviso').onclick = () => openContentModal('Aviso');
  $('#newVotacao').onclick = () => openVotingEditor();
}

function showVotesModal() {
  const votacao = state.votacoes[0];
  const votantes = funcionarios().filter(f => (votacao.votosUsuarios || {})[f.nome]);
  const faltam = funcionarios().filter(f => !(votacao.votosUsuarios || {})[f.nome]);
  openModal('Participação da votação', votacao.pergunta, `
    <div class="grid two">
      <div class="card"><h3 class="card-title">Quem votou</h3><div class="list">${votantes.map(f => `<div class="list-item"><div><strong>${f.nome}</strong><span>${f.setor} • opção ${(votacao.votosUsuarios || {})[f.nome]}</span></div></div>`).join('') || '<p>Ninguém votou ainda.</p>'}</div></div>
      <div class="card"><h3 class="card-title">Falta votar</h3><div class="list">${faltam.map(f => `<div class="list-item"><div><strong>${f.nome}</strong><span>${f.setor}</span></div></div>`).join('') || '<p>Todos já votaram.</p>'}</div></div>
    </div>
  `);
}

function openContentModal(tipo) {
  openModal(`Criar ${tipo}`, 'Publique uma atualização no portal', `
    <form class="form-grid" id="contentForm">
      <div class="input-group"><label>Título</label><input id="contentTitle" required /></div>
      <div class="input-group"><label>Descrição</label><textarea id="contentDesc"></textarea></div>
      ${tipo === 'Mural' ? '<div class="input-group"><label>URL da imagem</label><input id="contentImage" placeholder="https://..." /></div>' : ''}
      <button class="primary-btn" type="submit">Publicar</button>
    </form>
  `);
  $('#contentForm').onsubmit = (e) => {
    e.preventDefault();
    const titulo = $('#contentTitle').value.trim();
    const descricao = $('#contentDesc').value.trim();
    if (tipo === 'Mural') state.murais.unshift({ id: Date.now(), titulo, descricao, imagem: $('#contentImage').value.trim() || state.murais[0].imagem });
    else state.avisos.unshift({ id: Date.now(), titulo, descricao, data: new Date().toLocaleDateString('pt-BR') });
    saveState(); closeModal(); render();
  };
}

function openVotingEditor() {
  const v = state.votacoes[0];
  openModal('Editar votação', 'Os votos serão mantidos quando possível', `
    <form class="form-grid" id="votingForm">
      <div class="input-group"><label>Pergunta</label><input id="voteQuestion" value="${escapeHtml(v.pergunta)}" /></div>
      ${v.opcoes.map((op, i) => `<div class="input-group"><label>Resposta ${i + 1}</label><input class="voteOptionInput" value="${escapeHtml(op.texto)}" /></div>`).join('')}
      <button class="primary-btn" type="submit">Salvar votação</button>
    </form>
  `);
  $('#votingForm').onsubmit = (e) => {
    e.preventDefault();
    v.pergunta = $('#voteQuestion').value.trim();
    document.querySelectorAll('.voteOptionInput').forEach((input, i) => v.opcoes[i].texto = input.value.trim());
    saveState(); closeModal(); render();
  };
}

function renderDashboard() {
  setHeader('Dashboard Executivo', 'Resumo de conformidade, demandas críticas e indicadores do RH');
  const d = dashboardData();
  const setores = sectorData();
  const totalSolicitacoes = Math.max(state.solicitacoes.length, 1);
  const aprovPct = Math.round(d.aprovadas / totalSolicitacoes * 100);
  const pendPct = Math.round(d.pendentes / totalSolicitacoes * 100);
  const negPct = Math.round(d.negadas / totalSolicitacoes * 100);
  const totalDemandas = d.pendentes + d.holeritesPendentes;
  const now = new Date();
  const meses = ['Jan','Fev','Mar','Abr','Mai','Atual'];
  const tendencia = [72, 76, 80, 84, 88, d.compliance];
  const alertLevel = totalDemandas === 0 ? 'Sem pendências críticas' : totalDemandas <= 4 ? 'Atenção moderada' : 'Ação imediata requerida';

  app.innerHTML = `
    <section class="dash-topbar-pro">
      <div>
        <span class="dash-kicker">RH COSMETICS · PAINEL ADMINISTRATIVO</span>
        <h2>Dashboard <span>Executivo</span></h2>
        <p>Resumo em tempo real dos fluxos de funcionários, benefícios, holerites, férias e solicitações internas.</p>
      </div>
      <div class="dash-actions-pro">
        <button class="dash-btn secondary" id="exportDashCsv">Exportar CSV</button>
        <button class="dash-btn secondary" onclick="window.print()">Gerar relatório</button>
        <button class="dash-btn primary" id="toAnalytics">Abrir analytics</button>
      </div>
    </section>

    <section class="dash-live-panel">
      <div class="dash-live-pulse"></div>
      <div>
        <strong>${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
        <span>${now.toLocaleDateString('pt-BR')} · atualizado agora</span>
      </div>
      <div class="dash-live-divider"></div>
      <div>
        <strong>${alertLevel}</strong>
        <span>${totalDemandas} demandas abertas monitoradas</span>
      </div>
    </section>

    <section class="dash-kpis-pro">
      ${dashKpiCard('Conformidade global', `${d.compliance}%`, `${d.aprovadas} solicitações aprovadas · ${d.holeritesAssinados} holerites assinados`, 'ok', 'openCompliance')}
      ${dashKpiCard('Alertas críticos', `${d.holeritesPendentes}`, 'Holerites esperando assinatura', d.holeritesPendentes ? 'danger' : 'ok', 'kpiHol')}
      ${dashKpiCard('Demandas abertas', `${totalDemandas}`, `${d.pendentes} solicitações · ${d.holeritesPendentes} holerites`, totalDemandas ? 'warn' : 'ok', 'openDemandas')}
      ${dashKpiCard('Funcionários', `${d.totalFuncionarios}`, `Cobertura em ${setores.length} setores ativos`, 'info', 'openFuncionarios')}
    </section>

    <section class="dash-bento-pro">
      <article class="dash-card-pro col-7">
        <div class="dash-card-head">
          <div><h3>Conformidade por setor</h3><p>Funcionários, pendências e progresso operacional.</p></div>
          <span class="dash-chip">${setores.length} setores</span>
        </div>
        <div class="sector-table-like">
          <div class="sector-like-row sector-like-head">
            <span>Setor</span><span>Funcionários</span><span>Pendências</span><span>Progresso</span><span>Status</span>
          </div>
          ${setores.map(s => `
            <button class="sector-like-row" data-sector="${s.setor}">
              <strong>${s.setor}</strong>
              <span>${s.funcionarios}</span>
              <span>${s.pendencias}</span>
              <div class="sector-progress-pro"><em>${s.progresso}%</em><i><b style="width:${s.progresso}%;background:${statusColor(s.status)}"></b></i></div>
              <span class="dash-status ${statusClass(s.status)}">${s.status}</span>
            </button>
          `).join('')}
        </div>
      </article>

      <article class="dash-card-pro col-5">
        <div class="dash-card-head"><div><h3>Alertas & pendências</h3><p>Itens que precisam de ação do RH.</p></div></div>
        <div class="alerts-list-pro">
          ${dashAlert('danger', `${d.holeritesPendentes} holerites sem assinatura`, 'Documentos pendentes por funcionário.', 'alertHolerites')}
          ${dashAlert('warn', `${d.pendentes} solicitações em aberto`, 'Pedidos aguardando avaliação.', 'alertDemandas')}
          ${dashAlert('info', 'Controle de férias atualizado', 'Funcionários em férias e próximos retornos.', 'alertFerias')}
          ${dashAlert('ok', `${d.totalFuncionarios} funcionários cadastrados`, 'Base administrativa carregada do database.js.', 'openFuncionariosMini')}
        </div>
      </article>

      <article class="dash-card-pro col-6">
        <div class="dash-card-head"><div><h3>Tendência histórica de conformidade</h3><p>Últimos 6 meses</p></div><span class="dash-chip positive">+${Math.max(0, d.compliance - tendencia[0])} pts</span></div>
        ${lineChartPro(tendencia, meses)}
      </article>

      <article class="dash-card-pro col-3">
        <div class="dash-card-head"><div><h3>Mix de solicitações</h3><p>Status atual</p></div></div>
        ${donutMultiPro([
          ['Aprovadas', aprovPct, '#12544d'],
          ['Em aberto', pendPct, '#c4956a'],
          ['Negadas', negPct, '#a1213d'],
        ], `${aprovPct}%`, 'aprovadas')}
      </article>

      <article class="dash-card-pro col-3">
        <div class="dash-card-head"><div><h3>Volume operacional</h3><p>Comparativo rápido</p></div></div>
        ${miniBarsPro([
          ['Solic.', state.solicitacoes.length, '#6b4226'],
          ['H. ass.', d.holeritesAssinados, '#12544d'],
          ['H. pend.', d.holeritesPendentes, '#a1213d'],
          ['Func.', d.totalFuncionarios, '#315b7c'],
        ])}
      </article>
    </section>
  `;

  $('#toAnalytics').onclick = () => setPage('analytics');
  $('#exportDashCsv').onclick = exportCSV;
  ['openFuncionarios','openFuncionariosMini'].forEach(id => $('#'+id).onclick = () => showFuncionariosModal());
  ['openDemandas','alertDemandas'].forEach(id => $('#'+id).onclick = () => showDemandasModal());
  ['kpiHol','alertHolerites'].forEach(id => $('#'+id).onclick = () => showHoleritesModal('pendentes'));
  $('#openCompliance').onclick = () => showSolicitacoesModal('Aprovado');
  $('#alertFerias').onclick = () => { state.page = 'pessoal'; state.selectedPessoal = 'ferias'; saveState(); render(); };
  document.querySelectorAll('[data-sector]').forEach(btn => btn.onclick = () => showFuncionariosModal(btn.dataset.sector));
}

function dashKpiCard(label, value, detail, tone, id) {
  const icon = { ok: '✓', warn: '!', danger: '×', info: '#' }[tone] || '•';
  return `<button class="dash-kpi-pro ${tone}" id="${id}"><i>${icon}</i><strong>${value}</strong><span>${label}</span><small>${detail}</small></button>`;
}

function dashAlert(tone, title, text, id) {
  return `<button class="dash-alert-pro ${tone}" id="${id}"><i></i><strong>${title}</strong><span>${text}</span></button>`;
}

function statusColor(status) {
  return status === 'OK' ? '#12544d' : status === 'Atenção' ? '#c4956a' : '#a1213d';
}
function statusClass(status) {
  return status === 'OK' ? 'ok' : status === 'Atenção' ? 'warn' : 'danger';
}

function lineChartPro(values, labels) {
  const width = 760, height = 260, p = 34;
  const min = Math.min(...values, 60) - 4;
  const max = Math.max(...values, 100) + 2;
  const pts = values.map((v, i) => {
    const x = p + i * ((width - p * 2) / Math.max(values.length - 1, 1));
    const y = height - p - ((v - min) / Math.max(max - min, 1)) * (height - p * 2);
    return { x, y, v, label: labels[i] };
  });
  const path = pts.map((pt, i) => `${i ? 'L' : 'M'} ${pt.x} ${pt.y}`).join(' ');
  const area = `${path} L ${pts.at(-1).x} ${height - p} L ${pts[0].x} ${height - p} Z`;
  return `<div class="line-pro-wrap"><svg viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="dashArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6b4226" stop-opacity=".22"/><stop offset="1" stop-color="#6b4226" stop-opacity=".02"/></linearGradient></defs>
    ${[0,1,2,3].map(i => `<line x1="${p}" x2="${width-p}" y1="${p+i*52}" y2="${p+i*52}" class="grid-line-pro"/>`).join('')}
    <path d="${area}" fill="url(#dashArea)"></path><path d="${path}" class="line-pro"></path>
    ${pts.map(pt => `<g><circle cx="${pt.x}" cy="${pt.y}" r="6" class="dot-pro"/><text x="${pt.x}" y="${pt.y-14}" text-anchor="middle" class="value-pro">${pt.v}%</text><text x="${pt.x}" y="${height-8}" text-anchor="middle" class="label-pro">${pt.label}</text></g>`).join('')}
  </svg></div>`;
}

function donutMultiPro(items, center, subtitle) {
  let current = 0;
  const parts = items.map(([_, value, color]) => { const start = current; current += value; return `${color} ${start}% ${current}%`; }).join(', ');
  return `<div class="donut-pro2-wrap"><div class="donut-pro2" style="background:conic-gradient(${parts || '#eadbd2 0 100%'})"><div><strong>${center}</strong><span>${subtitle}</span></div></div><div class="donut-pro2-legend">${items.map(([label,value,color]) => `<span><i style="background:${color}"></i>${label}<b>${value}%</b></span>`).join('')}</div></div>`;
}

function miniBarsPro(items) {
  const max = Math.max(...items.map(i => i[1]), 1);
  return `<div class="mini-bars-pro">${items.map(([label, value, color]) => `<div class="mini-bar-pro"><strong>${value}</strong><i><b style="height:${Math.max(8, value/max*150)}px;background:${color}"></b></i><span>${label}</span></div>`).join('')}</div>`;
}

function sectorData() {
  return [...new Set(funcionarios().map(f => f.setor))].map(setor => {
    const fs = funcionarios().filter(f => f.setor === setor);
    const holerites = state.holeritesAdmin.filter(h => h.setor === setor);
    const pendH = holerites.reduce((t, f) => t + f.holerites.filter(h => h.status === 'Esperando assinatura').length, 0);
    const pendS = state.solicitacoes.filter(s => s.status === 'Esperando avaliação' && fs.some(f => f.nome === s.funcionario)).length;
    const pendencias = pendH + pendS;
    return { setor, funcionarios: fs.length, pendencias, progresso: Math.max(35, Math.min(100, Math.round(fs.length / Math.max(fs.length + pendencias, 1) * 100))), status: pendencias === 0 ? 'OK' : pendencias <= 2 ? 'Atenção' : 'Crítico' };
  });
}
function verticalChart(items) {
  const max = Math.max(...items.map(i => i[1]), 1);
  return `<div class="vertical-chart">${items.map(([label, value, color]) => `<div class="vbar"><strong>${value}</strong><div class="vbar-fill" style="height:${Math.max(14, value/max*190)}px;background:${color}"></div><span class="vbar-label">${label}</span></div>`).join('')}</div>`;
}

function lineChart(values, labels) {
  const width = 620;
  const height = 220;
  const padding = 26;
  const min = Math.min(...values, 60) - 4;
  const max = Math.max(...values, 100) + 2;
  const points = values.map((value, index) => {
    const x = padding + index * ((width - padding * 2) / Math.max(values.length - 1, 1));
    const y = height - padding - ((value - min) / Math.max(max - min, 1)) * (height - padding * 2);
    return { x, y, value, label: labels[index] };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${points.at(-1).x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return `<div class="line-chart-wrap">
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de tendência de conformidade">
      <defs>
        <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#6b4226" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#6b4226" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${[0,1,2,3].map(i => `<line x1="${padding}" x2="${width-padding}" y1="${padding+i*45}" y2="${padding+i*45}" class="chart-grid-line"/>`).join('')}
      <path d="${area}" fill="url(#lineFill)"></path>
      <path d="${path}" class="trend-line"></path>
      ${points.map(p => `<g><circle cx="${p.x}" cy="${p.y}" r="5" class="trend-dot"/><text x="${p.x}" y="${p.y-12}" text-anchor="middle" class="trend-value">${p.value}%</text><text x="${p.x}" y="${height-5}" text-anchor="middle" class="trend-label">${p.label}</text></g>`).join('')}
    </svg>
  </div>`;
}

function donutMulti(items, center, subtitle) {
  let current = 0;
  const segments = items.map(([label, value, color]) => {
    const start = current;
    current += value;
    return `${color} ${start}% ${current}%`;
  }).join(', ');
  return `<div class="donut-pro-wrap">
    <div class="donut-pro" style="background:conic-gradient(${segments || '#eadbd2 0% 100%'})">
      <div><strong>${center}</strong><span>${subtitle}</span></div>
    </div>
    <div class="donut-legend">
      ${items.map(([label, value, color]) => `<div><i style="background:${color}"></i><span>${label}</span><strong>${value}%</strong></div>`).join('')}
    </div>
  </div>`;
}

function renderAnalytics() {
  setHeader('Analytics & Relatórios', 'Indicadores avançados por setor, benefício e status operacional');
  const setores = ['Todos', ...new Set(funcionarios().map(f => f.setor))];
  const setor = state.selectedSector || 'Todos';
  const fs = setor === 'Todos' ? funcionarios() : funcionarios().filter(f => f.setor === setor);
  const hol = setor === 'Todos' ? state.holeritesAdmin : state.holeritesAdmin.filter(h => h.setor === setor);
  const solicit = setor === 'Todos' ? state.solicitacoes : state.solicitacoes.filter(s => fs.some(f => f.nome === s.funcionario));
  const vtCount = countBy(fs, f => f.transportadora.nome);
  const totalHol = hol.reduce((t, f) => t + f.holerites.length, 0);
  const aprovadas = solicit.filter(s => s.status === 'Aprovado').length;
  const pendentes = solicit.filter(s => s.status === 'Esperando avaliação').length;
  const negadas = solicit.filter(s => s.status === 'Negado').length;
  const totalSolic = Math.max(solicit.length, 1);

  app.innerHTML = `
    <section class="analytics-header-pro">
      <div>
        <span class="dash-kicker">RELATÓRIOS AVANÇADOS</span>
        <h2>Analytics <span>&</span> Relatórios</h2>
        <p>Filtre por setor para acompanhar funcionários, benefícios, transportadoras, solicitações e holerites.</p>
      </div>
      <div class="dash-actions-pro">
        <button class="dash-btn secondary" id="clearAnalytics">Limpar filtro</button>
        <button class="dash-btn primary" id="anExport">Exportar CSV</button>
      </div>
    </section>

    <div class="filter-bar-pro">${setores.map(s => `<button class="filter-pill-pro ${s === setor ? 'active' : ''}" data-filter="${s}">${s}</button>`).join('')}</div>

    <section class="dash-kpis-pro analytics-kpis-pro">
      ${dashKpiCard('Funcionários no filtro', fs.length, setor === 'Todos' ? 'Todos os setores' : setor, 'info', 'anFunc')}
      ${dashKpiCard('Solicitações', solicit.length, `${pendentes} em aberto · ${aprovadas} aprovadas`, pendentes ? 'warn' : 'ok', 'anSolic')}
      ${dashKpiCard('Holerites', totalHol, 'Assinados e pendentes por funcionário', 'ok', 'anHol')}
      ${dashKpiCard('Taxa de aprovação', `${Math.round(aprovadas / totalSolic * 100)}%`, 'Dentro do filtro selecionado', 'ok', 'anApproval')}
    </section>

    <section class="dash-bento-pro analytics-bento-pro">
      <article class="dash-card-pro col-8">
        <div class="dash-card-head"><div><h3>Tendência histórica de compliance</h3><p>Últimos 6 meses · ${setor}</p></div></div>
        ${lineChartPro([70, 74, 78, 82, 86, Math.round(aprovadas / totalSolic * 100) || dashboardData().compliance], ['Jan','Fev','Mar','Abr','Mai','Atual'])}
      </article>
      <article class="dash-card-pro col-4">
        <div class="dash-card-head"><div><h3>Mix de status</h3><p>Solicitações do filtro</p></div></div>
        ${donutMultiPro([
          ['Aprovado', Math.round(aprovadas / totalSolic * 100), '#12544d'],
          ['Em aberto', Math.round(pendentes / totalSolic * 100), '#c4956a'],
          ['Negado', Math.round(negadas / totalSolic * 100), '#a1213d'],
        ], `${Math.round(aprovadas / totalSolic * 100)}%`, 'aprovadas')}
      </article>
      <article class="dash-card-pro col-5">
        <div class="dash-card-head"><div><h3>Funcionários por transportadora</h3><p>Vale transporte no filtro</p></div></div>
        <div class="transport-chart-pro">${Object.entries(vtCount).map(([k,v]) => `<button data-transport-list="${k}" class="transport-row-pro"><strong>${k}</strong><i><b style="width:${v/Math.max(...Object.values(vtCount),1)*100}%"></b></i><span>${v}</span></button>`).join('') || '<p>Nenhum dado de transportadora.</p>'}</div>
      </article>
      <article class="dash-card-pro col-7">
        <div class="dash-card-head"><div><h3>Detalhamento operacional</h3><p>Funcionários e solicitações do filtro</p></div></div>
        <div class="data-table-pro">
          <div class="data-table-head"><span>Funcionário</span><span>Setor</span><span>VT</span><span>Status</span></div>
          ${fs.map(f => `<button class="data-table-row" data-employee="${f.nome}"><strong>${f.nome}</strong><span>${f.setor}</span><span>${f.transportadora.nome}</span><em>Ativo</em></button>`).join('')}
        </div>
      </article>
      <article class="dash-card-pro col-12">
        <div class="dash-card-head"><div><h3>Solicitações do filtro</h3><p>Pedidos enviados pelos funcionários</p></div></div>
        <div class="data-table-pro request-table-pro">
          <div class="data-table-head"><span>Tipo</span><span>Funcionário</span><span>Data</span><span>Status</span></div>
          ${solicit.map(s => `<button class="data-table-row" data-request-status="${s.status}"><strong>${s.tipo}</strong><span>${s.funcionario || 'Funcionário'}</span><span>${s.data}</span><em>${s.status}</em></button>`).join('') || '<p>Nenhuma solicitação no filtro.</p>'}
        </div>
      </article>
    </section>
  `;
  document.querySelectorAll('[data-filter]').forEach(btn => btn.onclick = () => { state.selectedSector = btn.dataset.filter; saveState(); renderAnalytics(); });
  $('#clearAnalytics').onclick = () => { state.selectedSector = 'Todos'; saveState(); renderAnalytics(); };
  $('#anFunc').onclick = () => showFuncionariosModal(setor === 'Todos' ? null : setor);
  $('#anSolic').onclick = () => showSolicitacoesModal(null, solicit);
  $('#anHol').onclick = () => showHoleritesModal('todos', hol);
  $('#anExport').onclick = exportCSV;
  $('#anApproval').onclick = () => showSolicitacoesModal('Aprovado', solicit.filter(s => s.status === 'Aprovado'));
  document.querySelectorAll('[data-transport-list]').forEach(btn => btn.onclick = () => {
    const nome = btn.dataset.transportList;
    const lista = fs.filter(f => f.transportadora.nome === nome);
    openModal(`Transportadora ${nome}`, 'Funcionários vinculados no filtro', `<div class="list">${lista.map(f => `<div class="list-item"><div><strong>${f.nome}</strong><span>${f.setor} · ${f.usuario}</span></div></div>`).join('')}</div>`);
  });
  document.querySelectorAll('[data-employee]').forEach(btn => btn.onclick = () => showFuncionariosModal(fs.find(f => f.nome === btn.dataset.employee)?.setor));
}

function countBy(arr, fn) { return arr.reduce((acc, item) => { const k = fn(item); acc[k] = (acc[k] || 0) + 1; return acc; }, {}); }

function renderBeneficios() {
  setHeader('Benefícios', 'Administração dos benefícios e solicitações');
  if (state.selectedBenefit) return renderBenefitDetail(state.selectedBenefit);
  const beneficios = [
    ['valeTransporte','Vale transporte','Transportadoras, créditos e solicitações de VT.'],
    ['convenio','Convênio Santa Helena','Dependentes, carteirinhas e solicitações do plano.'],
    ['cestaBasica','Cesta básica','Formulários de entrega, retirada e assinaturas.'],
    ['auxilioCreche','Auxílio creche','Documentos e pedidos de auxílio.'],
    ['farmacia','Farma Gold','Regras de valor, rede aceita e solicitações.'],
  ];
  app.innerHTML = `
    <div class="page-heading"><h2>Benefícios</h2><p>Acompanhe solicitações e detalhes administrativos.</p></div>
    <div class="search-box"><input id="benefitSearch" placeholder="Pesquisar benefício ou solicitação" /></div>
    <div class="grid three" id="benefitGrid">${beneficios.map(([id,t,d]) => benefitCard(id,t,d)).join('')}</div>
  `;
  document.querySelectorAll('[data-benefit]').forEach(btn => btn.onclick = () => { state.selectedBenefit = btn.dataset.benefit; renderBenefitDetail(state.selectedBenefit); });
  $('#benefitSearch').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    $('#benefitGrid').innerHTML = beneficios.filter(b => b.join(' ').toLowerCase().includes(q)).map(([id,t,d]) => benefitCard(id,t,d)).join('');
    document.querySelectorAll('[data-benefit]').forEach(btn => btn.onclick = () => { state.selectedBenefit = btn.dataset.benefit; renderBenefitDetail(state.selectedBenefit); });
  };
}
function benefitCard(id, title, desc) {
  const terms = benefitTerms(id);
  const count = state.solicitacoes.filter(s => s.status === 'Esperando avaliação' && terms.some(t => `${s.tipo} ${s.descricao}`.toLowerCase().includes(t))).length;
  return `<button class="card clickable" data-benefit="${id}"><div class="card-header"><div><h3 class="card-title">${title}</h3><p class="card-sub">${desc}</p></div>${count ? `<span class="badge yellow">${count}</span>` : ''}</div></button>`;
}
function benefitTerms(id) {
  return { valeTransporte:['vale transporte','vt'], convenio:['convênio','convenio','santa helena','dependente'], cestaBasica:['cesta básica','cesta basica'], auxilioCreche:['auxílio creche','auxilio creche','creche'], farmacia:['farmácia','farmacia','farma gold'] }[id] || [];
}
function renderBenefitDetail(id) {
  const titleMap = { valeTransporte:'Vale transporte', convenio:'Convênio Santa Helena', cestaBasica:'Cesta básica', auxilioCreche:'Auxílio creche', farmacia:'Farma Gold' };
  const terms = benefitTerms(id);
  const pedidos = state.solicitacoes.filter(s => terms.some(t => `${s.tipo} ${s.descricao}`.toLowerCase().includes(t)));
  app.innerHTML = `
    <button class="outline-btn" id="backBenefits">Voltar</button>
    <div class="page-heading"><h2>${titleMap[id]}</h2><p>Controle administrativo e solicitações recebidas.</p></div>
    ${benefitInfo(id)}
    <div class="card" style="margin-top:16px"><h3 class="card-title">Solicitações recebidas</h3><div class="list" id="requestsList">${pedidos.map(s => requestItem(s, true)).join('') || '<p>Nenhuma solicitação encontrada.</p>'}</div></div>
  `;
  $('#backBenefits').onclick = () => { state.selectedBenefit = null; renderBeneficios(); };
  bindRequestActions();
  if (id === 'valeTransporte') bindTransportadoraButtons();
}
function benefitInfo(id) {
  if (id === 'valeTransporte') {
    const trans = [...new Set(state.usuarios.map(u => u.transportadora?.nome).filter(Boolean))];
    const selected = trans[0];
    return `<div class="card"><h3 class="card-title">Administração do VT</h3><p class="card-sub">Créditos, funcionários vinculados e link da transportadora.</p><div class="filter-pills">${trans.map(t => `<button class="pill transport-pill" data-transport="${t}">${t}</button>`).join('')}</div><div id="transportPanel"></div></div>`;
  }
  if (id === 'convenio') return `<div class="card"><h3 class="card-title">Santa Helena Saúde</h3><p class="card-sub">Plano empresarial com carteirinha, dependentes e pedidos de inclusão/exclusão. Portal: <a href="https://www.santahelenasaude.com.br/beneficiario/" target="_blank">abrir Santa Helena</a></p><div class="grid two"><div class="card"><strong>Plano padrão</strong><p>Empresarial com coparticipação</p></div><div class="card"><strong>Documentos do dependente</strong><p>CPF, nascimento, comprovante de vínculo e residência.</p></div></div></div>`;
  if (id === 'farmacia') return `<div class="card"><h3 class="card-title">Farma Gold</h3><p class="card-sub">Benefício farmácia com cálculo por porcentagem do salário ou auxílio fixo. Portal: <a href="https://www.farmagold.com.br/" target="_blank">abrir Farma Gold</a></p><div class="grid two"><div class="card"><strong>Exemplo</strong><p>3% do salário + auxílio fixo de R$ 120,00.</p></div><div class="card"><strong>Rede aceita</strong><p>Farma Gold e farmácias parceiras.</p></div></div></div>`;
  if (id === 'cestaBasica') return `<div class="card"><h3 class="card-title">Cesta básica</h3><p class="card-sub">Formulários de entrega ou retirada, assinatura digital e cópias para funcionário e RH.</p></div>`;
  return `<div class="card"><h3 class="card-title">Auxílio creche</h3><p class="card-sub">Documentos de dependente, comprovantes e avaliação do RH.</p></div>`;
}
function bindTransportadoraButtons() {
  const first = document.querySelector('.transport-pill');
  if (first) first.classList.add('active');
  document.querySelectorAll('.transport-pill').forEach(btn => btn.onclick = () => showTransportadora(btn.dataset.transport));
  if (first) showTransportadora(first.dataset.transport);
}
function showTransportadora(nome) {
  document.querySelectorAll('.transport-pill').forEach(b => b.classList.toggle('active', b.dataset.transport === nome));
  const users = state.usuarios.filter(u => u.transportadora?.nome === nome);
  const creditos = { TOP: 4200, Alelo: 1800, Flash: 5100, SOU: 900, SPTrans: 2500, VR: 4700, Ben: 1300, Ticket: 3900 };
  const valor = creditos[nome] || 0;
  const status = users.length === 0 ? 'Sem usuários' : valor < 1500 ? 'Crédito baixo' : valor < 3500 ? 'Normal' : 'Excelente';
  $('#transportPanel').innerHTML = `
    <div class="grid two"><div class="card"><strong>Créditos</strong><p>${valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p></div><div class="card"><strong>Status</strong><p>${status}</p></div></div>
    <h4>Usuários vinculados</h4><div class="list">${users.map(u => `<div class="list-item"><div><strong>${u.nome}</strong><span>${u.setor} • ${u.tipo === 'admin' ? 'Administrador' : 'Funcionário'}</span></div></div>`).join('')}</div>
    <div class="actions" style="margin-top:12px"><a class="primary-btn" href="${users[0]?.transportadora?.link || '#'}" target="_blank">Abrir link da transportadora</a></div>
  `;
}

function renderPessoal() {
  setHeader('Pessoal', 'Administração de dados e solicitações dos funcionários');
  if (state.selectedPessoal) return renderPessoalDetail(state.selectedPessoal);
  const d = dashboardData();
  const demandas = d.pendentes + d.holeritesPendentes;
  const itens = [
    ['ferias','Controle de férias','Pessoas de férias, próximas voltas e PDF.'],
    ['holerites','Holerites','Cópias assinadas e pendências por funcionário.'],
    ['faltas','Faltas e atestados','Justificativas e documentos enviados.'],
    ['exames','Exames periódicos','Comprovantes e pendências ocupacionais.'],
    ['treinamentos','Treinamentos','Cadastro e conclusões dos funcionários.'],
    ['solicitacoes','Solicitações gerais','Tudo que foi enviado ao RH.'],
  ];
  app.innerHTML = `
    <div class="page-heading"><h2>Pessoal</h2><p>Administração de dados e solicitações dos funcionários</p></div>
    <button class="card kpi-card clickable" id="openDemandasPessoal" style="width:100%;text-align:left;margin-bottom:16px"><div class="kpi-value">${demandas}</div><div><div class="kpi-label">Demandas em aberto</div><div class="kpi-trend">Clique para ver solicitações e holerites pendentes</div></div></button>
    <div class="grid two" style="margin-bottom:16px"><button class="card clickable" id="dashShortcut"><h3 class="card-title">Dashboard executivo</h3><p class="card-sub">Resumo de indicadores, alertas e setores.</p></button><button class="card clickable" id="analyticsShortcut"><h3 class="card-title">Analytics & relatórios</h3><p class="card-sub">Filtros por setor e detalhes operacionais.</p></button></div>
    <div class="search-box"><input id="pessoalSearch" placeholder="Pesquisar área, funcionário ou solicitação" /></div>
    <div class="grid three" id="pessoalGrid">${itens.map(([id,t,d]) => `<button class="card clickable" data-pessoal="${id}"><h3 class="card-title">${t}</h3><p class="card-sub">${d}</p></button>`).join('')}</div>
  `;
  $('#openDemandasPessoal').onclick = showDemandasModal;
  $('#dashShortcut').onclick = () => setPage('dashboard');
  $('#analyticsShortcut').onclick = () => setPage('analytics');
  document.querySelectorAll('[data-pessoal]').forEach(btn => btn.onclick = () => { if (btn.dataset.pessoal === 'holerites') showHoleritesPage(); else { state.selectedPessoal = btn.dataset.pessoal; renderPessoalDetail(state.selectedPessoal); } });
  $('#pessoalSearch').oninput = e => {
    const q = e.target.value.toLowerCase();
    $('#pessoalGrid').innerHTML = itens.filter(i => i.join(' ').toLowerCase().includes(q)).map(([id,t,d]) => `<button class="card clickable" data-pessoal="${id}"><h3 class="card-title">${t}</h3><p class="card-sub">${d}</p></button>`).join('');
    document.querySelectorAll('[data-pessoal]').forEach(btn => btn.onclick = () => { if (btn.dataset.pessoal === 'holerites') showHoleritesPage(); else { state.selectedPessoal = btn.dataset.pessoal; renderPessoalDetail(state.selectedPessoal); } });
  };
}
function renderPessoalDetail(id) {
  if (id === 'ferias') return renderFerias();
  if (id === 'treinamentos') return openTreinamentos(true);
  const title = { faltas:'Faltas e atestados', exames:'Exames periódicos', solicitacoes:'Solicitações gerais' }[id] || 'Detalhe';
  const terms = { faltas:['falta','atestado','justificativa'], exames:['exame'], solicitacoes:[''] }[id];
  const pedidos = id === 'solicitacoes' ? state.solicitacoes : state.solicitacoes.filter(s => terms.some(t => `${s.tipo} ${s.descricao}`.toLowerCase().includes(t)));
  app.innerHTML = `<button class="outline-btn" id="backPessoal">Voltar</button><div class="page-heading"><h2>${title}</h2><p>Solicitações recebidas dos funcionários.</p></div><div class="card"><div class="list">${pedidos.map(s => requestItem(s, true)).join('') || '<p>Nenhuma solicitação encontrada.</p>'}</div></div>`;
  $('#backPessoal').onclick = () => { state.selectedPessoal = null; renderPessoal(); };
  bindRequestActions();
}
function renderFerias() {
  app.innerHTML = `
    <button class="outline-btn" id="backPessoal">Voltar</button><div class="page-heading"><h2>Controle de férias</h2><p>Pessoas em férias, próximos retornos e PDF.</p></div>
    <div class="actions"><button class="primary-btn" onclick="window.print()">Gerar PDF de férias</button></div>
    <div class="card" style="margin-top:16px"><h3 class="card-title">Legenda</h3><div class="actions"><span class="badge green">Prestes a voltar</span><span class="badge yellow">Na metade das férias</span><span class="badge red">Acabou de entrar</span></div></div>
    <div class="list" style="margin-top:16px">${state.ferias.map(f => `<div class="list-item"><div><strong>${f.nome}</strong><span>${f.setor} • ${f.cargo}<br>Período: ${f.periodo}<br>Retorno: ${f.retorno}</span></div><span class="badge ${f.cor}">${f.status}</span></div>`).join('')}</div>
  `;
  $('#backPessoal').onclick = () => { state.selectedPessoal = null; renderPessoal(); };
}
function openTreinamentos(isDetail = false) {
  state.page = 'pessoal'; state.selectedPessoal = 'treinamentos'; saveState();
  setHeader('Pessoal', 'Treinamentos e capacitações');
  app.innerHTML = `
    <button class="outline-btn" id="backPessoal">Voltar</button><div class="page-heading"><h2>Treinamentos</h2><p>Gestão de cursos, vídeos e capacitações.</p></div>
    <div class="grid two"><section class="card"><h3 class="card-title">Adicionar conteúdo</h3><form class="form-grid" id="trainingForm"><div class="input-group"><label>Título</label><input id="trainingTitle" required></div><div class="input-group"><label>Link ou arquivo</label><input id="trainingLink" required></div><button class="primary-btn">Publicar treinamento</button></form></section><section class="card"><h3 class="card-title">Conclusões dos funcionários</h3><div class="list">${state.conclusoesTreinamento.map(c => `<div class="list-item"><div><strong>${c.funcionario}</strong><span>${c.treinamento}<br>Concluído em ${c.dataConclusao}</span></div><span class="badge green">${c.progresso}</span></div>`).join('')}</div></section></div>
    <section class="card" style="margin-top:16px"><h3 class="card-title">Conteúdos disponíveis</h3><div class="list">${state.treinamentos.map(t => `<div class="list-item"><div><strong>${t.titulo}</strong><span>${t.link} • duração ${t.duracao}</span></div><button class="danger-btn" data-remove-training="${t.id}">Remover</button></div>`).join('')}</div></section>
  `;
  $('#backPessoal').onclick = () => { state.selectedPessoal = null; renderPessoal(); };
  $('#trainingForm').onsubmit = e => { e.preventDefault(); state.treinamentos.unshift({ id: Date.now(), titulo: $('#trainingTitle').value, link: $('#trainingLink').value, duracao: '0 min' }); saveState(); openTreinamentos(true); };
  document.querySelectorAll('[data-remove-training]').forEach(btn => btn.onclick = () => { state.treinamentos = state.treinamentos.filter(t => String(t.id) !== btn.dataset.removeTraining); saveState(); openTreinamentos(true); });
}
function showHoleritesPage() {
  setHeader('Pessoal', 'Holerites por setor e funcionário');
  const setores = [...new Set(state.holeritesAdmin.map(h => h.setor))];
  app.innerHTML = `<button class="outline-btn" id="backPessoal">Voltar</button><div class="page-heading"><h2>Holerites</h2><p>Cópias por setor e funcionário.</p></div>${setores.map(setor => `<section class="card" style="margin-bottom:16px"><h3 class="card-title">${setor}</h3><div class="list">${state.holeritesAdmin.filter(f=>f.setor===setor).map(f => `<button class="list-item" data-holerite-func="${f.nome}"><div><strong>${f.nome}</strong><span>${f.cargo} • ${f.holerites.filter(h=>h.status==='Assinado').length} assinados • ${f.holerites.filter(h=>h.status==='Esperando assinatura').length} pendentes</span></div><span class="badge brown">Abrir</span></button>`).join('')}</div></section>`).join('')}`;
  $('#backPessoal').onclick = () => { state.selectedPessoal = null; renderPessoal(); };
  document.querySelectorAll('[data-holerite-func]').forEach(btn => btn.onclick = () => showFuncionarioHolerites(btn.dataset.holeriteFunc));
}
function showFuncionarioHolerites(nome) {
  const f = state.holeritesAdmin.find(x => x.nome === nome);
  openModal(`Holerites de ${f.nome}`, `${f.setor} • ${f.cargo}`, `<div class="list">${f.holerites.map(h => `<div class="list-item"><div><strong>${h.mes} • ${h.competencia}</strong><span>Valor líquido: ${h.valorLiquido}<br>Protocolo: ${h.protocoloDocusign}</span></div>${badge(h.status)}</div>`).join('')}</div>`);
}

function requestItem(s, actions = false) {
  return `<div class="list-item"><div><strong>${s.tipo}</strong><span>${s.funcionario || 'Funcionário'} • enviado em ${s.data}<br>${s.descricao}</span></div><div class="actions">${badge(s.status)}${actions && s.status === 'Esperando avaliação' ? `<button class="danger-btn" data-deny="${s.id}">Negar</button><button class="primary-btn" data-approve="${s.id}">Aprovar</button>` : ''}</div></div>`;
}
function bindRequestActions() {
  document.querySelectorAll('[data-approve]').forEach(btn => btn.onclick = () => updateRequest(Number(btn.dataset.approve), 'Aprovado'));
  document.querySelectorAll('[data-deny]').forEach(btn => btn.onclick = () => updateRequest(Number(btn.dataset.deny), 'Negado'));
}
function updateRequest(id, status) { state.solicitacoes = state.solicitacoes.map(s => s.id === id ? { ...s, status } : s); saveState(); render(); }
function showFuncionariosModal(setor = null) {
  const list = setor ? funcionarios().filter(f => f.setor === setor) : funcionarios();
  openModal(setor ? `Funcionários de ${setor}` : 'Funcionários', `${list.length} funcionário(s)`, `<div class="list">${list.map(f => `<div class="list-item"><div><strong>${f.nome}</strong><span>${f.setor} • ${f.cargo || 'Funcionário'}<br>VT: ${f.transportadora.nome}</span></div><span class="badge brown">${f.usuario}</span></div>`).join('')}</div>`);
}
function showDemandasModal() {
  const solicit = state.solicitacoes.filter(s => s.status === 'Esperando avaliação');
  const hol = pendingHolerites();
  openModal('Demandas em aberto', `${solicit.length} solicitações e ${hol.length} holerites pendentes`, `<h3>Solicitações esperando avaliação</h3><div class="list">${solicit.map(s => requestItem(s, true)).join('') || '<p>Nenhuma solicitação pendente.</p>'}</div><h3 style="margin-top:18px">Holerites pendentes</h3><div class="list">${hol.map(h => `<div class="list-item"><div><strong>${h.funcionario}</strong><span>${h.setor} • ${h.holerite.mes} ${h.holerite.competencia}</span></div>${badge(h.holerite.status)}</div>`).join('') || '<p>Nenhum holerite pendente.</p>'}</div>`);
  bindRequestActions();
}
function showSolicitacoesModal(status = null, custom = null) {
  const list = custom || (status ? state.solicitacoes.filter(s => s.status === status) : state.solicitacoes);
  openModal('Solicitações', status ? `Status: ${status}` : 'Todas as solicitações', `<div class="list">${list.map(s => requestItem(s, true)).join('') || '<p>Nenhuma solicitação encontrada.</p>'}</div>`);
  bindRequestActions();
}
function pendingHolerites() {
  return state.holeritesAdmin.flatMap(f => f.holerites.filter(h => h.status === 'Esperando assinatura').map(h => ({ funcionario: f.nome, setor: f.setor, holerite: h })));
}
function showHoleritesModal(tipo = 'todos', custom = null) {
  const base = custom || state.holeritesAdmin;
  const rows = base.flatMap(f => f.holerites.filter(h => tipo !== 'pendentes' || h.status === 'Esperando assinatura').map(h => ({ funcionario: f.nome, setor: f.setor, holerite: h })));
  openModal(tipo === 'pendentes' ? 'Holerites pendentes' : 'Holerites', `${rows.length} registro(s)`, `<div class="list">${rows.map(r => `<div class="list-item"><div><strong>${r.funcionario}</strong><span>${r.setor} • ${r.holerite.mes} ${r.holerite.competencia}<br>${r.holerite.valorLiquido}</span></div>${badge(r.holerite.status)}</div>`).join('')}</div>`);
}

function renderPerfil() {
  setHeader('Perfil', 'Dados do administrador');
  const admin = currentAdmin() || state.usuarios.find(u => u.nome === 'Anna Luiza') || admins()[0];
  const d = dashboardData();
  const demandas = d.pendentes + d.holeritesPendentes;
  const recentes = [
    ['Solicitação aprovada', 'Exame periódico · Maria Eduarda', '08/05/2026'],
    ['Dependente em análise', 'Santa Helena · Lucas Ferreira', '13/05/2026'],
    ['Holerite pendente', 'Abril/2026 · Sarah', '05/05/2026'],
  ];

  app.innerHTML = `
    <section class="profile-hero-pro">
      <div class="profile-cover"></div>
      <div class="profile-main-row">
        <div class="profile-avatar-pro">${admin.nome.split(' ').map(p => p[0]).slice(0,2).join('')}</div>
        <div class="profile-info-pro">
          <span class="eyebrow">Administrador do portal</span>
          <h2>${admin.nome}</h2>
          <p>${admin.setor} · Coordenadora de RH</p>
          <div class="profile-tags"><span>Admin master</span><span>Acesso: benefícios</span><span>Acesso: pessoal</span></div>
        </div>
        <div class="profile-actions-pro">
          <button class="primary-btn" id="profileDashboard">Ver dashboard</button>
          <button class="outline-btn" id="profileExport">Exportar funcionários</button>
        </div>
      </div>
    </section>

    <section class="profile-layout-pro">
      <div class="profile-left-col">
        <div class="card profile-section-card">
          <h3 class="card-title">Informações profissionais</h3>
          <div class="profile-info-grid-pro">
            <div><span>Setor</span><strong>${admin.setor}</strong></div>
            <div><span>Função</span><strong>Coordenadora de RH</strong></div>
            <div><span>Salário</span><strong>R$ 4.800,00</strong></div>
            <div><span>Usuário</span><strong>${admin.usuario}</strong></div>
            <div><span>Idade</span><strong>${admin.idade} anos</strong></div>
            <div><span>Transportadora</span><strong>${admin.transportadora.nome}</strong></div>
          </div>
        </div>

        <div class="card profile-section-card">
          <h3 class="card-title">Atividade recente</h3>
          <div class="timeline-pro">
            ${recentes.map(([titulo, desc, data]) => `<div class="timeline-item-pro"><i></i><div><strong>${titulo}</strong><span>${desc}</span></div><em>${data}</em></div>`).join('')}
          </div>
        </div>
      </div>

      <aside class="profile-right-col">
        <button class="profile-stat-card" id="profileDemandas"><strong>${demandas}</strong><span>Demandas abertas</span></button>
        <button class="profile-stat-card" id="profileFuncionarios"><strong>${d.totalFuncionarios}</strong><span>Funcionários</span></button>
        <button class="profile-stat-card" id="profileHolerites"><strong>${d.holeritesPendentes}</strong><span>Holerites pendentes</span></button>
        <div class="card profile-contact-card">
          <h3>Contato interno</h3>
          <p>Telefone: (11) 4002-8922</p>
          <p>E-mail: rh@lipsoncosmeticos.com.br</p>
        </div>
      </aside>
    </section>
  `;

  $('#profileDashboard').onclick = () => setPage('dashboard');
  $('#profileExport').onclick = exportCSV;
  $('#profileDemandas').onclick = showDemandasModal;
  $('#profileFuncionarios').onclick = () => showFuncionariosModal();
  $('#profileHolerites').onclick = () => showHoleritesModal('pendentes');
}


function exportCSV() {
  const rows = [['Nome','Setor','Cargo','Transportadora'], ...funcionarios().map(f => [f.nome, f.setor, f.cargo || '', f.transportadora.nome])];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'funcionarios-rh-cosmetics.csv'; a.click();
  URL.revokeObjectURL(url);
}

function render() {
  document.documentElement.style.setProperty('--font-scale', state.fontScale);
  if (state.page === 'home') renderHome();
  if (state.page === 'beneficios') renderBeneficios();
  if (state.page === 'pessoal') renderPessoal();
  if (state.page === 'dashboard') renderDashboard();
  if (state.page === 'analytics') renderAnalytics();
  if (state.page === 'perfil') renderPerfil();
}

function init() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.onclick = () => { $('#sidebar').classList.remove('open'); setPage(btn.dataset.page); });
  $('#mobileMenu').onclick = () => $('#sidebar').classList.toggle('open');
  $('#profileBtn').onclick = () => $('#profileDropdown').classList.toggle('hidden');
  $('#profileDropdown').querySelector('[data-page="perfil"]').onclick = () => { $('#profileDropdown').classList.add('hidden'); setPage('perfil'); };
  $('#logoutBtn').onclick = () => { localStorage.removeItem(AUTH_KEY); $('#profileDropdown').classList.add('hidden'); updateAuthView(); };
  $('#modalClose').onclick = closeModal;
  $('#modalBackdrop').onclick = (e) => { if (e.target.id === 'modalBackdrop') closeModal(); };
  $('#fontPlus').onclick = () => { state.fontScale = Math.min(1.25, +(state.fontScale + .08).toFixed(2)); saveState(); render(); };
  $('#fontMinus').onclick = () => { state.fontScale = Math.max(.9, +(state.fontScale - .08).toFixed(2)); saveState(); render(); };
  setupLogin();
  updateAuthView();
  if (isLoggedIn()) render();
}

init();

/* =========================================================
   Ajustes finais: funcionalidades do app mobile no admin web
   ========================================================= */
function renderBenefitDetail(id) {
  const titleMap = { valeTransporte:'Vale transporte', convenio:'Convênio Santa Helena', cestaBasica:'Cesta básica', auxilioCreche:'Auxílio creche', farmacia:'Farma Gold' };
  const terms = benefitTerms(id);
  const pedidos = state.solicitacoes.filter(s => terms.some(t => `${s.tipo} ${s.descricao}`.toLowerCase().includes(t)));
  app.innerHTML = `
    <button class="outline-btn" id="backBenefits">Voltar</button>
    <div class="page-heading"><h2>${titleMap[id]}</h2><p>Controle administrativo, documentos e solicitações recebidas.</p></div>
    ${benefitInfo(id)}
    <div class="card" style="margin-top:16px">
      <div class="card-header"><div><h3 class="card-title">Solicitações recebidas</h3><p class="card-sub">Aprovação ou recusa pelo RH.</p></div><button class="outline-btn" id="openAllBenefitRequests">Abrir lista</button></div>
      <div class="list" id="requestsList">${pedidos.map(s => requestItem(s, true)).join('') || '<p>Nenhuma solicitação encontrada.</p>'}</div>
    </div>
  `;
  $('#backBenefits').onclick = () => { state.selectedBenefit = null; renderBeneficios(); };
  $('#openAllBenefitRequests').onclick = () => showSolicitacoesModal(null, pedidos);
  bindRequestActions();
  if (id === 'valeTransporte') bindTransportadoraButtons();
  if (id === 'convenio') bindConvenioButtons();
  if (id === 'cestaBasica') bindCestaButtons();
}

function benefitInfo(id) {
  if (id === 'valeTransporte') {
    const trans = [...new Set(state.usuarios.map(u => u.transportadora?.nome).filter(Boolean))];
    return `<div class="card"><h3 class="card-title">Administração do VT</h3><p class="card-sub">Créditos, funcionários vinculados e link da transportadora.</p><div class="filter-pills">${trans.map(t => `<button class="pill transport-pill" data-transport="${t}">${t}</button>`).join('')}</div><div id="transportPanel"></div></div>`;
  }
  if (id === 'convenio') {
    const cfg = state.convenioConfig || {};
    return `<div class="benefit-pro-grid">
      <section class="card benefit-hero-card">
        <span class="eyebrow">Plano empresarial</span>
        <h3>${cfg.nome || 'Santa Helena Saúde'}</h3>
        <p>${cfg.planoPadrao || 'Empresarial com coparticipação'}</p>
        <div class="actions"><a class="primary-btn" href="${cfg.link || '#'}" target="_blank">Abrir portal Santa Helena</a><button class="outline-btn" id="openDependentes">Ver dependentes</button></div>
      </section>
      <section class="card">
        <h3 class="card-title">Documentos exigidos</h3>
        <div class="check-list">${(cfg.documentosDependente || []).map(d => `<span>${d}</span>`).join('')}</div>
      </section>
      <section class="card wide">
        <h3 class="card-title">Dependentes cadastrados / em análise</h3>
        <div class="list">${(state.dependentesConvenio || []).map(d => `<button class="list-item" data-dependente="${d.id}"><div><strong>${d.nome}</strong><span>${d.funcionario} • ${d.parentesco}<br>CPF: ${d.cpf} • Nasc.: ${d.nascimento}</span></div><span class="badge ${d.status === 'Ativo' ? 'green' : 'yellow'}">${d.status}</span></button>`).join('') || '<p>Nenhum dependente cadastrado.</p>'}</div>
      </section>
    </div>`;
  }
  if (id === 'farmacia') {
    const cfg = state.farmaciaConfig || {};
    return `<div class="benefit-pro-grid">
      <section class="card benefit-hero-card"><span class="eyebrow">Benefício farmácia</span><h3>${cfg.nome || 'Farma Gold'}</h3><p>Cálculo por porcentagem do salário ou auxílio fixo definido pela empresa.</p><div class="actions"><a class="primary-btn" href="https://www.farmagold.com.br/" target="_blank">Abrir Farma Gold</a></div></section>
      <section class="card"><h3 class="card-title">Regras de valor</h3><div class="mini-metrics"><button onclick="showFuncionariosModal()"><strong>${cfg.porcentagemSalario || 3}%</strong><span>do salário</span></button><button><strong>${(cfg.auxilioFixo || 120).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong><span>auxílio fixo</span></button></div></section>
      <section class="card wide"><h3 class="card-title">Rede aceita</h3><div class="check-list">${(cfg.redeAceita || []).map(item => `<span>${item}</span>`).join('')}</div></section>
    </div>`;
  }
  if (id === 'cestaBasica') {
    return `<div class="benefit-pro-grid">
      <section class="card benefit-hero-card"><span class="eyebrow">Formulários digitais</span><h3>Cesta básica</h3><p>Pedidos de entrega ou retirada com assinatura digital. Uma cópia fica com o funcionário e outra com o RH.</p><div class="actions"><button class="primary-btn" onclick="window.print()">Gerar relatório</button><button class="outline-btn" id="openCestaForms">Ver formulários</button></div></section>
      <section class="card wide"><h3 class="card-title">Formulários enviados</h3><div class="list">${(state.cestaFormularios || []).map(f => `<div class="list-item"><div><strong>${f.funcionario}</strong><span>${f.tipo} • ${f.data}<br>Protocolo: ${f.protocolo}</span></div>${badge(f.status)}</div>`).join('') || '<p>Nenhum formulário recebido.</p>'}</div></section>
    </div>`;
  }
  return `<div class="benefit-pro-grid"><section class="card benefit-hero-card"><span class="eyebrow">Documentos e dependentes</span><h3>Auxílio creche</h3><p>Solicitações com certidão de nascimento, comprovante de creche e documento do responsável.</p><div class="mini-metrics"><button><strong>R$ 350,00</strong><span>valor fixo previsto</span></button><button><strong>0%</strong><span>desconto em salário</span></button></div></section></div>`;
}

function bindConvenioButtons() {
  const btn = $('#openDependentes');
  if (btn) btn.onclick = () => openModal('Dependentes do convênio', 'Santa Helena Saúde', `<div class="list">${(state.dependentesConvenio || []).map(d => `<div class="list-item"><div><strong>${d.nome}</strong><span>${d.funcionario} • ${d.parentesco}<br>CPF: ${d.cpf} • Nascimento: ${d.nascimento}<br>Documentos: ${d.documentos.join(', ')}</span></div><span class="badge ${d.status === 'Ativo' ? 'green' : 'yellow'}">${d.status}</span></div>`).join('')}</div>`);
  document.querySelectorAll('[data-dependente]').forEach(btn => btn.onclick = () => {
    const dep = (state.dependentesConvenio || []).find(d => String(d.id) === btn.dataset.dependente);
    openModal(`Dependente: ${dep.nome}`, `${dep.funcionario} • ${dep.status}`, `<div class="card"><p><strong>Parentesco:</strong> ${dep.parentesco}</p><p><strong>CPF:</strong> ${dep.cpf}</p><p><strong>Nascimento:</strong> ${dep.nascimento}</p><p><strong>Documentos:</strong> ${dep.documentos.join(', ')}</p></div>`);
  });
}
function bindCestaButtons() {
  const btn = $('#openCestaForms');
  if (btn) btn.onclick = () => openModal('Formulários de cesta básica', 'Entrega, retirada e assinaturas', `<div class="list">${(state.cestaFormularios || []).map(f => `<div class="list-item"><div><strong>${f.funcionario}</strong><span>${f.tipo} • ${f.data}<br>Protocolo: ${f.protocolo}</span></div>${badge(f.status)}</div>`).join('')}</div>`);
}

function renderPessoalDetail(id) {
  if (id === 'ferias') return renderFerias();
  if (id === 'treinamentos') return openTreinamentos(true);
  if (id === 'faltas') return renderFaltasAdmin();
  if (id === 'exames') return renderExamesAdmin();
  const title = { solicitacoes:'Solicitações gerais' }[id] || 'Detalhe';
  const pedidos = state.solicitacoes;
  app.innerHTML = `<button class="outline-btn" id="backPessoal">Voltar</button><div class="page-heading"><h2>${title}</h2><p>Solicitações recebidas dos funcionários.</p></div><div class="card"><div class="list">${pedidos.map(s => requestItem(s, true)).join('') || '<p>Nenhuma solicitação encontrada.</p>'}</div></div>`;
  $('#backPessoal').onclick = () => { state.selectedPessoal = null; renderPessoal(); };
  bindRequestActions();
}

function renderFaltasAdmin() {
  const dados = state.faltasAdmin || [];
  const naoJust = dados.filter(f => f.status === 'Não justificada').length;
  const analise = dados.filter(f => f.status === 'Em análise').length;
  app.innerHTML = `<button class="outline-btn" id="backPessoal">Voltar</button>
    <div class="page-heading"><h2>Faltas e atestados</h2><p>Justificativas, documentos enviados e apontamentos dos funcionários.</p></div>
    <div class="dashboard-kpi-row"><button class="metric-card" id="faltasTodos"><strong>${dados.length}</strong><small>Registros</small><em>Total no período</em></button><button class="metric-card metric-red" id="faltasNao"><strong>${naoJust}</strong><small>Não justificadas</small><em>Precisam de ação</em></button><button class="metric-card metric-yellow" id="faltasAnalise"><strong>${analise}</strong><small>Em análise</small><em>Documentos recebidos</em></button></div>
    <section class="card"><div class="card-header"><h3 class="card-title">Registros do período</h3><input class="table-search" id="faltasSearch" placeholder="Pesquisar funcionário, setor ou status"></div><div class="list" id="faltasList">${faltasRows(dados)}</div></section>`;
  $('#backPessoal').onclick = () => { state.selectedPessoal = null; renderPessoal(); };
  $('#faltasTodos').onclick = () => showFaltasModal(dados, 'Todos os registros');
  $('#faltasNao').onclick = () => showFaltasModal(dados.filter(f => f.status === 'Não justificada'), 'Faltas não justificadas');
  $('#faltasAnalise').onclick = () => showFaltasModal(dados.filter(f => f.status === 'Em análise'), 'Faltas em análise');
  $('#faltasSearch').oninput = e => { const q = e.target.value.toLowerCase(); $('#faltasList').innerHTML = faltasRows(dados.filter(f => `${f.funcionario} ${f.setor} ${f.tipo} ${f.status}`.toLowerCase().includes(q))); };
}
function faltasRows(dados) { return dados.map(f => `<button class="list-item" data-falta="${f.id}"><div><strong>${f.funcionario}</strong><span>${f.setor} • ${f.tipo} • ${f.data}<br>${f.descricao}${f.documento ? `<br>Documento: ${f.documento}` : ''}</span></div><span class="badge ${f.status === 'Justificada' ? 'green' : f.status === 'Não justificada' ? 'red' : 'yellow'}">${f.status}</span></button>`).join('') || '<p>Nenhum registro encontrado.</p>'; }
function showFaltasModal(list, title) { openModal(title, `${list.length} registro(s)`, `<div class="list">${faltasRows(list)}</div>`); }

function renderExamesAdmin() {
  const dados = state.examesAdmin || [];
  const pendentes = dados.filter(e => ['Pendente','Atrasado'].includes(e.status)).length;
  const agendados = dados.filter(e => e.status === 'Agendado').length;
  app.innerHTML = `<button class="outline-btn" id="backPessoal">Voltar</button>
    <div class="page-heading"><h2>Exames periódicos</h2><p>Comprovantes, vencimentos e pendências ocupacionais.</p></div>
    <div class="dashboard-kpi-row"><button class="metric-card" id="examesTodos"><strong>${dados.length}</strong><small>Exames</small><em>Total cadastrado</em></button><button class="metric-card metric-red" id="examesPendentes"><strong>${pendentes}</strong><small>Pendentes/atrasados</small><em>Precisam de ação</em></button><button class="metric-card metric-blue" id="examesAgenda"><strong>${agendados}</strong><small>Agendados</small><em>Próximas datas</em></button></div>
    <section class="card"><div class="card-header"><h3 class="card-title">Controle ocupacional</h3><input class="table-search" id="examesSearch" placeholder="Pesquisar funcionário, exame ou status"></div><div class="list" id="examesList">${examesRows(dados)}</div></section>`;
  $('#backPessoal').onclick = () => { state.selectedPessoal = null; renderPessoal(); };
  $('#examesTodos').onclick = () => showExamesModal(dados, 'Todos os exames');
  $('#examesPendentes').onclick = () => showExamesModal(dados.filter(e => ['Pendente','Atrasado'].includes(e.status)), 'Exames pendentes/atrasados');
  $('#examesAgenda').onclick = () => showExamesModal(dados.filter(e => e.status === 'Agendado'), 'Exames agendados');
  $('#examesSearch').oninput = e => { const q = e.target.value.toLowerCase(); $('#examesList').innerHTML = examesRows(dados.filter(x => `${x.funcionario} ${x.setor} ${x.titulo} ${x.status}`.toLowerCase().includes(q))); };
}
function examesRows(dados) { return dados.map(e => `<button class="list-item"><div><strong>${e.funcionario}</strong><span>${e.setor} • ${e.titulo} • ${e.data}<br>${e.local} • Prazo: ${e.prazo}${e.comprovante ? `<br>Comprovante: ${e.comprovante}` : ''}</span></div><span class="badge ${e.status === 'Concluído' ? 'green' : e.status === 'Atrasado' ? 'red' : e.status === 'Agendado' ? 'blue' : 'yellow'}">${e.status}</span></button>`).join('') || '<p>Nenhum exame encontrado.</p>'; }
function showExamesModal(list, title) { openModal(title, `${list.length} exame(s)`, `<div class="list">${examesRows(list)}</div>`); }

/* =========================================================
   POLIMENTO GERAL v3 — renderizações mais bonitas fora do dashboard
   ========================================================= */
function tileInitial(label){ return String(label || 'RH').split(/\s+/).filter(Boolean).map(p => p[0]).slice(0,2).join('').toUpperCase(); }
function benefitIcon(id){ return ({valeTransporte:'VT', convenio:'SH', cestaBasica:'CB', auxilioCreche:'AC', farmacia:'FG'}[id] || 'RH'); }
function pessoalIcon(id){ return ({ferias:'FE', holerites:'HO', faltas:'FA', exames:'EX', treinamentos:'TR', solicitacoes:'SO'}[id] || 'RH'); }
function benefitCard(id, title, desc) {
  const terms = benefitTerms(id);
  const count = state.solicitacoes.filter(s => s.status === 'Esperando avaliação' && terms.some(t => `${s.tipo} ${s.descricao}`.toLowerCase().includes(t))).length;
  return `<button class="card clickable menu-tile" data-benefit="${id}">
    <div class="tile-top"><div class="tile-icon">${benefitIcon(id)}</div>${count ? `<span class="tile-count">${count}</span>` : '<span class="badge brown">Ativo</span>'}</div>
    <div><h3 class="card-title">${title}</h3><p class="card-sub">${desc}</p></div>
    <span class="tile-meta">Abrir benefício</span>
  </button>`;
}
function pessoalTile(id,t,d,total=0){
  return `<button class="card clickable menu-tile" data-pessoal="${id}">
    <div class="tile-top"><div class="tile-icon">${pessoalIcon(id)}</div>${total ? `<span class="tile-count">${total}</span>` : '<span class="badge brown">RH</span>'}</div>
    <div><h3 class="card-title">${t}</h3><p class="card-sub">${d}</p></div>
    <span class="tile-meta">Abrir área</span>
  </button>`;
}
function renderHome() {
  setHeader('Home', 'Gerencie mural, avisos e votações do portal');
  const mural = state.murais[state.muralAtual] || state.murais[0];
  const votacao = state.votacoes[0];
  const totalVotos = Object.keys(votacao.votosUsuarios || {}).length;
  const faltam = funcionarios().filter(f => !(votacao.votosUsuarios || {})[f.nome]);
  const d = dashboardData();

  app.innerHTML = `
    <div class="page-heading"><div><span class="eyebrow">Central administrativa</span><h2>Olá, ${currentAdmin()?.nome?.split(' ')[0] || 'Admin'}</h2><p>Controle o portal do funcionário com mural, avisos, enquetes, demandas e indicadores do RH.</p></div></div>
    <div class="home-command-grid">
      <section>
        <div class="card carousel clickable" id="openMural">
          <img src="${mural.imagem}" alt="${escapeHtml(mural.titulo)}" />
          <div class="carousel-overlay"><span class="eyebrow" style="color:#ffd9c0">Mural ativo</span><h3>${mural.titulo}</h3><p>${mural.descricao}</p><small>${mural.titulo.toLowerCase().includes('treinamento') ? 'Abrir treinamentos' : 'Abrir dashboard'}</small></div>
        </div>
        <div class="carousel-controls">
          <button class="outline-btn" id="prevMural">Anterior</button>
          <div class="dots">${state.murais.map((_, i) => `<span class="dot ${i === state.muralAtual ? 'active' : ''}"></span>`).join('')}</div>
          <button class="outline-btn" id="nextMural">Próximo</button>
        </div>
      </section>
      <aside class="home-side-stack">
        <section class="card">
          <div class="card-header"><div><span class="eyebrow">Publicação rápida</span><h3 class="card-title">Adicionar conteúdo</h3><p class="card-sub">Crie conteúdos visíveis para todos os funcionários.</p></div></div>
          <div class="home-action-grid"><button class="home-action-btn" id="newMural"><strong>Mural</strong><span>Imagem e destaque</span></button><button class="home-action-btn" id="newAviso"><strong>Aviso</strong><span>Comunicado rápido</span></button><button class="home-action-btn" id="newVotacao"><strong>Votação</strong><span>Enquete interna</span></button></div>
        </section>
        <section class="card">
          <span class="eyebrow">Resumo operacional</span>
          <div class="mini-metrics"><button onclick="showFuncionariosModal()"><strong>${d.totalFuncionarios}</strong><span>funcionários</span></button><button onclick="showDemandasModal()"><strong>${d.pendentes + d.holeritesPendentes}</strong><span>demandas abertas</span></button><button onclick="setPage('dashboard')"><strong>${d.compliance}%</strong><span>conformidade</span></button></div>
        </section>
      </aside>
    </div>
    <div class="grid two" style="margin-top:22px">
      <section class="card"><div class="card-header"><div><span class="eyebrow">Comunicados</span><h3 class="card-title">Avisos recentes</h3></div></div><div class="list">${state.avisos.map(a => `<div class="list-item"><div><strong>${a.titulo}</strong><span>${a.descricao}</span></div><span class="badge brown">${a.data || 'Hoje'}</span></div>`).join('')}</div></section>
      <section class="card home-vote-card"><div class="card-header"><div><span class="eyebrow">Participação</span><h3 class="card-title">Votação ativa</h3><p class="card-sub">Clique para ver quem votou e quem ainda falta votar.</p></div><button class="outline-btn" id="openVotes">Ver funcionários</button></div><h3>${votacao.pergunta}</h3>${votacao.opcoes.map(op => { const count = Object.values(votacao.votosUsuarios || {}).filter(v => Number(v) === Number(op.id)).length; const pct = totalVotos ? Math.round(count / totalVotos * 100) : 0; return `<div class="vote-option"><div class="vote-progress" style="width:${pct}%"></div><div class="vote-content"><span>${op.texto}</span><span>${pct}%</span></div><small>${count} voto(s)</small></div>`; }).join('')}<div class="actions"><span class="badge green">${totalVotos} votaram</span><span class="badge yellow">${faltam.length} faltam votar</span></div></section>
    </div>`;
  $('#prevMural').onclick = () => { state.muralAtual = (state.muralAtual - 1 + state.murais.length) % state.murais.length; saveState(); renderHome(); };
  $('#nextMural').onclick = () => { state.muralAtual = (state.muralAtual + 1) % state.murais.length; saveState(); renderHome(); };
  $('#openMural').onclick = () => mural.titulo.toLowerCase().includes('treinamento') ? openTreinamentos() : setPage('dashboard');
  $('#openVotes').onclick = showVotesModal;
  $('#newMural').onclick = () => openContentModal('Mural');
  $('#newAviso').onclick = () => openContentModal('Aviso');
  $('#newVotacao').onclick = () => openVotingEditor();
}
function renderBeneficios() {
  setHeader('Benefícios', 'Administração dos benefícios e solicitações');
  if (state.selectedBenefit) return renderBenefitDetail(state.selectedBenefit);
  const beneficios = [
    ['valeTransporte','Vale transporte','Transportadoras, créditos, usuários vinculados e solicitações de VT.'],
    ['convenio','Santa Helena Saúde','Carteirinha, dependentes, documentos e solicitações do plano.'],
    ['cestaBasica','Cesta básica','Formulários de entrega/retirada, assinatura e cópias para o RH.'],
    ['auxilioCreche','Auxílio creche','Documentos, dependentes e análise de pedidos de auxílio.'],
    ['farmacia','Farma Gold','Regras por salário, auxílio fixo e rede aceita.'],
  ];
  app.innerHTML = `<div class="page-heading"><div><span class="eyebrow">Benefícios corporativos</span><h2>Benefícios</h2><p>Acompanhe todas as solicitações e acesse painéis específicos de cada benefício.</p></div></div><div class="search-box"><input id="benefitSearch" placeholder="Pesquisar benefício ou solicitação" /></div><div class="grid three" id="benefitGrid">${beneficios.map(([id,t,d]) => benefitCard(id,t,d)).join('')}</div>`;
  const bind = () => document.querySelectorAll('[data-benefit]').forEach(btn => btn.onclick = () => { state.selectedBenefit = btn.dataset.benefit; renderBenefitDetail(state.selectedBenefit); });
  bind();
  $('#benefitSearch').oninput = (e) => { const q = e.target.value.toLowerCase(); $('#benefitGrid').innerHTML = beneficios.filter(b => b.join(' ').toLowerCase().includes(q)).map(([id,t,d]) => benefitCard(id,t,d)).join(''); bind(); };
}
function renderPessoal() {
  setHeader('Pessoal', 'Administração de dados e solicitações dos funcionários');
  if (state.selectedPessoal) return renderPessoalDetail(state.selectedPessoal);
  const d = dashboardData();
  const demandas = d.pendentes + d.holeritesPendentes;
  const itens = [
    ['ferias','Controle de férias','Pessoas de férias, próximas voltas, legenda e PDF.'],
    ['holerites','Holerites','Cópias assinadas e pendências por funcionário.'],
    ['faltas','Faltas e atestados','Justificativas, documentos e apontamentos.'],
    ['exames','Exames periódicos','Comprovantes e pendências ocupacionais.'],
    ['treinamentos','Treinamentos','Cadastro de conteúdos e conclusões dos funcionários.'],
    ['solicitacoes','Solicitações gerais','Tudo que foi enviado pelos funcionários ao RH.'],
  ];
  const counts = { ferias:state.ferias?.length || 0, holerites:d.holeritesPendentes, faltas:(state.faltasAdmin || []).filter(f => f.status !== 'Justificada').length, exames:(state.examesAdmin || []).filter(e => ['Pendente','Atrasado'].includes(e.status)).length, treinamentos:(state.conclusoesTreinamento || []).length, solicitacoes:d.pendentes };
  app.innerHTML = `<div class="page-heading"><div><span class="eyebrow">Rotina de RH</span><h2>Pessoal</h2><p>Demandas, documentos, treinamentos, férias e registros administrativos dos funcionários.</p></div></div><button class="card kpi-card clickable demand-card" id="openDemandasPessoal"><div class="kpi-value">${demandas}</div><div><div class="kpi-label">Demandas em aberto</div><div class="kpi-trend">Solicitações esperando avaliação e holerites pendentes</div></div></button><div class="grid two" style="margin-bottom:18px"><button class="card clickable shortcut-card" id="dashShortcut"><div class="tile-icon">DB</div><div><h3 class="card-title">Dashboard executivo</h3><p class="card-sub">Resumo de indicadores, alertas e setores.</p></div></button><button class="card clickable shortcut-card" id="analyticsShortcut"><div class="tile-icon">AN</div><div><h3 class="card-title">Analytics & relatórios</h3><p class="card-sub">Filtros por setor e detalhes operacionais.</p></div></button></div><div class="search-box"><input id="pessoalSearch" placeholder="Pesquisar área, funcionário ou solicitação" /></div><div class="grid three" id="pessoalGrid">${itens.map(([id,t,d]) => pessoalTile(id,t,d,counts[id])).join('')}</div>`;
  $('#openDemandasPessoal').onclick = showDemandasModal;
  $('#dashShortcut').onclick = () => setPage('dashboard');
  $('#analyticsShortcut').onclick = () => setPage('analytics');
  const bind = () => document.querySelectorAll('[data-pessoal]').forEach(btn => btn.onclick = () => { if (btn.dataset.pessoal === 'holerites') showHoleritesPage(); else { state.selectedPessoal = btn.dataset.pessoal; renderPessoalDetail(state.selectedPessoal); } });
  bind();
  $('#pessoalSearch').oninput = e => { const q = e.target.value.toLowerCase(); $('#pessoalGrid').innerHTML = itens.filter(i => i.join(' ').toLowerCase().includes(q)).map(([id,t,d]) => pessoalTile(id,t,d,counts[id])).join(''); bind(); };
}
