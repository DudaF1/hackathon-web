/* app.js — versão web admin refinada e sem funções duplicadas */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const STORAGE = 'rh_cosmetics_web_final_state_v3';
let state = loadState();
let currentUser = JSON.parse(localStorage.getItem('rh_admin_user') || 'null');
let modal = { open:false };

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function loadState(){
  const saved = localStorage.getItem(STORAGE);
  if(saved){
    const merged = { ...clone(window.RH_DATABASE), ...JSON.parse(saved) };
    merged.farmaciaConfig = { ...(window.RH_DATABASE.farmaciaConfig || {}), ...(merged.farmaciaConfig || {}) };
    return merged;
  }
  return clone(window.RH_DATABASE);
}
function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
function funcionarios(){ return state.usuarios.filter(u => u.tipo === 'funcionario'); }
function admins(){ return state.usuarios.filter(u => u.tipo === 'admin'); }
function money(v){ return Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function text(v){ return String(v ?? '').replace(/[<>&]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[s])); }
function badge(status){
  const s = String(status || '');
  const cls = s.includes('Aprov') || s.includes('Conclu') || s === 'Ativo' || s === 'Assinado' ? 'green' : s.includes('Neg') || s.includes('Atras') || s.includes('Não') || s.includes('Crítico') ? 'red' : s.includes('Aberto') || s.includes('Esperando') || s.includes('Pendente') || s.includes('análise') || s.includes('Atenção') ? 'yellow' : 'blue';
  return `<span class="badge ${cls}">${text(s)}</span>`;
}

const app = $('#app');
const pageTitle = $('#pageTitle');
const pageSubtitle = $('#pageSubtitle');

function setPage(page){ state.page = page; state.selectedBenefit = null; state.selectedPessoal = null; save(); render(); }
function setTitle(title, subtitle){ pageTitle.textContent = title; pageSubtitle.textContent = subtitle; }
function navActive(){ $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === state.page)); }

function init(){
  bindLogin();
  bindShell();
  if(currentUser) showShell(); else showLogin();
}
function bindLogin(){
  $('#loginForm').onsubmit = e => {
    e.preventDefault();
    const user = $('#loginUser').value.trim();
    const pass = $('#loginPass').value.trim();
    const found = admins().find(u => u.usuario === user && u.senha === pass);
    if(!found){ $('#loginError').classList.remove('hidden'); return; }
    currentUser = found;
    localStorage.setItem('rh_admin_user', JSON.stringify(found));
    $('#loginError').classList.add('hidden');
    showShell();
  };
}
function bindShell(){
  $$('.nav-btn').forEach(btn => btn.onclick = () => setPage(btn.dataset.page));
  $('#mobileMenu').onclick = () => $('#sidebar').classList.toggle('open');
  $('#profileBtn').onclick = () => $('#profileDropdown').classList.toggle('hidden');
  $('#logoutBtn').onclick = () => { localStorage.removeItem('rh_admin_user'); currentUser = null; showLogin(); };
  $$('[data-page="perfil"]', $('#profileDropdown')).forEach(b => b.onclick = () => { $('#profileDropdown').classList.add('hidden'); setPage('perfil'); });
  $('#fontPlus').onclick = () => { state.fontScale = Math.min((state.fontScale||1)+0.08,1.25); applyFont(); save(); };
  $('#fontMinus').onclick = () => { state.fontScale = Math.max((state.fontScale||1)-0.08,.9); applyFont(); save(); };
  $('#modalClose').onclick = closeModal;
  $('#modalBackdrop').onclick = e => { if(e.target.id === 'modalBackdrop') closeModal(); };
}
function showLogin(){ $('#loginScreen').classList.remove('hidden'); $('#adminShell').classList.add('hidden'); }
function showShell(){ $('#loginScreen').classList.add('hidden'); $('#adminShell').classList.remove('hidden'); applyFont(); render(); }
function applyFont(){ document.documentElement.style.setProperty('--fs', `${16*(state.fontScale||1)}px`); }

function render(){
  navActive();
  $('#sidebar').classList.remove('open');
  const pages = { home:renderHome, beneficios:renderBeneficios, pessoal:renderPessoal, dashboard:renderDashboard, analytics:renderAnalytics, perfil:renderPerfil };
  (pages[state.page] || renderHome)();
}

function heading(title, subtitle, actions=''){
  return `<div class="page-heading"><div><h2>${title}</h2><p>${subtitle}</p></div>${actions?`<div class="actions">${actions}</div>`:''}</div>`;
}
function kpi(title, value, detail, icon='RH', on=''){
  const tag = on ? 'button' : 'div';
  return `<${tag} class="card kpi click-card" ${on?`onclick="${on}"`:''}><div class="kpi-icon">${icon}</div><div><strong>${value}</strong><p class="card-title">${title}</p><span>${detail}</span></div></${tag}>`;
}
function listItem(title, sub, status='', on=''){
  const tag = on ? 'button' : 'div';
  return `<${tag} class="list-item" ${on?`onclick="${on}"`:''}><div><strong>${text(title)}</strong><span>${sub}</span></div>${status?badge(status):''}</${tag}>`;
}
function openModal(title, subtitle, body){
  $('#modalTitle').textContent = title; $('#modalSubtitle').textContent = subtitle; $('#modalBody').innerHTML = body; $('#modalBackdrop').classList.remove('hidden');
}
function closeModal(){ $('#modalBackdrop').classList.add('hidden'); }

function renderHome(){
  setTitle('Home','Gerencie mural, avisos e votações do portal');
  const mural = state.murais[state.muralAtual] || state.murais[0];
  const vot = state.votacoes[0];
  app.innerHTML = `
    ${heading(`Olá, ${currentUser?.nome || 'Admin'}`, 'Painel geral do portal RH Cosmetics', '<button class="primary-btn" id="newContent">+ Novo conteúdo</button>')}
    <div class="bento">
      <section class="span-7">
        <div class="carousel" style="background-image:url('${mural.imagem}')" id="muralOpen"><div class="carousel-content"><span class="eyebrow">Mural</span><h3>${text(mural.titulo)}</h3><p>${text(mural.descricao)}</p><small>Toque para abrir ${mural.titulo.toLowerCase().includes('treinamento')?'Treinamentos':'Dashboard'}</small></div></div>
        <div class="carousel-buttons"><button class="icon-btn" id="prevMural">‹</button><button class="icon-btn" id="nextMural">›</button></div>
      </section>
      <section class="card span-5"><h3 class="card-title">Avisos</h3><div class="list">${state.avisos.map(a => listItem(a.titulo, `${text(a.descricao)}<br>${a.data||''}`)).join('')}</div></section>
      <section class="card span-12"><h3 class="card-title">Votação ativa</h3>${voteCard(vot)}</section>
    </div>`;
  $('#prevMural').onclick = () => { state.muralAtual = (state.muralAtual - 1 + state.murais.length) % state.murais.length; save(); renderHome(); };
  $('#nextMural').onclick = () => { state.muralAtual = (state.muralAtual + 1) % state.murais.length; save(); renderHome(); };
  $('#muralOpen').onclick = () => mural.titulo.toLowerCase().includes('treinamento') ? openTreinamentos() : setPage('dashboard');
  $('#newContent').onclick = newContentModal;
  bindVoteDetails(vot);
}
function voteCard(vot){
  if(!vot) return '<p>Nenhuma votação ativa.</p>';
  const votes = vot.votosUsuarios || {};
  const funcs = funcionarios();
  const voted = Object.keys(votes);
  const missing = funcs.filter(f => !votes[f.nome]).map(f => f.nome);
  const total = voted.length || 1;
  return `<div class="grid two">
    <div>${vot.opcoes.map(o => { const count = Object.values(votes).filter(v => v === o.id).length; const pct = Math.round(count/total*100); return `<div class="list-item vote-option"><div class="vote-fill" style="width:${pct}%"></div><div><strong>${text(o.texto)}</strong><span>${count} voto(s)</span></div><strong>${pct}%</strong></div>`; }).join('')}</div>
    <div class="card"><h3 class="card-title">Participação</h3><div class="mini-metrics"><button id="showVoted"><strong>${voted.length}</strong><span>votaram</span></button><button id="showMissing"><strong>${missing.length}</strong><span>faltam votar</span></button></div></div>
  </div>`;
}
function bindVoteDetails(vot){
  const votes = vot?.votosUsuarios || {};
  const funcs = funcionarios();
  const voted = Object.keys(votes);
  const missing = funcs.filter(f => !votes[f.nome]).map(f => f.nome);
  const a = $('#showVoted'), b = $('#showMissing');
  if(a) a.onclick = () => openModal('Funcionários que votaram','Resultado da votação', `<div class="list">${voted.map(n => listItem(n, `Votou na opção ${votes[n]}`,'Registrado')).join('') || '<p>Ninguém votou ainda.</p>'}</div>`);
  if(b) b.onclick = () => openModal('Funcionários que ainda faltam votar','Pendência de participação', `<div class="list">${missing.map(n => listItem(n, 'Ainda não participou da votação','Pendente')).join('') || '<p>Todos votaram.</p>'}</div>`);
}
function newContentModal(){
  openModal('Publicar conteúdo','Mural, aviso ou votação', `<div class="grid three"><button class="card click-card" onclick="createMural()"><h3>Mural</h3><p class="card-sub">Adicionar imagem e comunicado no carrossel.</p></button><button class="card click-card" onclick="createAviso()"><h3>Aviso</h3><p class="card-sub">Publicar comunicado simples.</p></button><button class="card click-card" onclick="createVotacao()"><h3>Votação</h3><p class="card-sub">Criar enquete para os funcionários.</p></button></div>`);
}
window.createMural = () => openEditor('Mural'); window.createAviso = () => openEditor('Aviso'); window.createVotacao = () => openEditor('Votação');
function openEditor(tipo){
  openModal(`Novo ${tipo}`,'Preencha e publique no portal', `<div class="grid"><input id="newTitle" placeholder="Título ou pergunta"><input id="newDesc" placeholder="Descrição"><input id="newImg" placeholder="URL da imagem, opcional"><button class="primary-btn" id="saveNew">Publicar</button></div>`);
  $('#saveNew').onclick = () => {
    const t = $('#newTitle').value.trim(); const d = $('#newDesc').value.trim(); const img = $('#newImg').value.trim();
    if(!t) return alert('Preencha o título.');
    if(tipo==='Mural') state.murais.unshift({id:Date.now(), titulo:t, descricao:d||'Novo conteúdo do RH.', imagem:img||'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200'});
    if(tipo==='Aviso') state.avisos.unshift({id:Date.now(), titulo:t, descricao:d||'Comunicado publicado pelo RH.', data:new Date().toLocaleDateString('pt-BR')});
    if(tipo==='Votação') state.votacoes.unshift({id:Date.now(), ativa:true, pergunta:t, data:new Date().toLocaleDateString('pt-BR'), votosUsuarios:{}, opcoes:[{id:1,texto:d||'Sim'},{id:2,texto:'Não'}]});
    closeModal(); save(); renderHome();
  };
}

function renderBeneficios(){
  setTitle('Benefícios','Controle administrativo dos benefícios dos funcionários');
  if(state.selectedBenefit) return renderBenefitDetail(state.selectedBenefit);
  const items = [
    ['valeTransporte','Vale transporte','Transportadoras, créditos e usuários vinculados.','VT'],
    ['convenio','Santa Helena Saúde','Carteirinha, dependentes e documentos.','SH'],
    ['farmacia','Farma Gold','Rede parceira, regras de valor e solicitações.','FG'],
    ['cestaBasica','Cesta básica','Formulários de entrega/retirada assinados.','CB'],
    ['auxilioCreche','Auxílio creche','Documentos, dependentes e análise do RH.','AC'],
  ];
  app.innerHTML = `${heading('Benefícios','Clique em um benefício para abrir a gestão completa')}<div class="benefit-grid">${items.map(i => `<button class="card benefit-card click-card" data-benefit="${i[0]}"><div class="benefit-icon">${i[3]}</div><h3>${i[1]}</h3><p class="card-sub">${i[2]}</p></button>`).join('')}</div>`;
  $$('[data-benefit]').forEach(btn => btn.onclick = () => { state.selectedBenefit = btn.dataset.benefit; save(); renderBeneficios(); });
}
function renderBenefitDetail(id){
  const map = {valeTransporte:'Vale transporte', convenio:'Santa Helena Saúde', farmacia:'Farma Gold', cestaBasica:'Cesta básica', auxilioCreche:'Auxílio creche'};
  const terms = {valeTransporte:['vale transporte','vt'], convenio:['convênio','convenio','santa helena','dependente'], farmacia:['farmácia','farmacia','farma gold'], cestaBasica:['cesta básica','cesta basica'], auxilioCreche:['auxílio creche','auxilio creche','creche']}[id] || [];
  const pedidos = state.solicitacoes.filter(s => terms.some(t => `${s.tipo} ${s.descricao}`.toLowerCase().includes(t)));
  app.innerHTML = `<button class="outline-btn" id="backBenefits">Voltar</button>${heading(map[id], 'Gestão administrativa e solicitações recebidas')}${benefitInfo(id)}<section class="card" style="margin-top:16px"><h3 class="card-title">Solicitações recebidas</h3><div class="list">${pedidos.map(s => requestItem(s)).join('') || '<p>Nenhuma solicitação encontrada.</p>'}</div></section>`;
  $('#backBenefits').onclick = () => { state.selectedBenefit = null; save(); renderBeneficios(); };
  if(id==='valeTransporte') bindTransport();
}
function benefitInfo(id){
  if(id==='valeTransporte'){
    const trans = [...new Set(state.usuarios.map(u => u.transportadora?.nome).filter(Boolean))];
    return `<section class="card"><h3 class="card-title">Administração do VT</h3><p class="card-sub">Selecione a transportadora para ver créditos, status e funcionários vinculados.</p><div class="filter-pills">${trans.map((t,i) => `<button class="pill transport-pill ${i===0?'active':''}" data-transport="${t}">${t}</button>`).join('')}</div><div id="transportPanel"></div></section>`;
  }
  if(id==='convenio'){
    const cfg = state.convenioConfig || {};
    return `<div class="bento"><section class="card hero span-7"><span class="eyebrow">Convênio ativo</span><h2>${cfg.nome}</h2><p>${cfg.planoPadrao}</p><div class="actions"><a class="primary-btn" target="_blank" href="${cfg.link}">Abrir portal</a><button class="outline-btn" onclick="showDependentes()">Ver dependentes</button></div></section><section class="card span-5"><h3 class="card-title">Documentos do dependente</h3><div class="check-list">${cfg.documentosDependente.map(d=>`<span>${d}</span>`).join('')}</div></section></div>`;
  }
  if(id==='farmacia'){
    const cfg = state.farmaciaConfig || {};
    const rede = cfg.redeAceita || [];
    return `<div class="bento"><section class="card hero span-6"><span class="eyebrow">Benefício farmácia</span><h2>${cfg.nome}</h2><p>Cálculo por porcentagem do salário + auxílio fixo definido pelo RH.</p><div class="actions"><a class="primary-btn" href="https://www.farmagold.com.br/" target="_blank">Abrir Farma Gold</a></div></section><section class="card span-6"><h3 class="card-title">Regras de valor</h3><div class="mini-metrics"><button><strong>${cfg.porcentagemSalario}%</strong><span>do salário</span></button><button><strong>${money(cfg.auxilioFixo)}</strong><span>auxílio fixo</span></button></div></section><section class="card span-12"><h3 class="card-title">Farmácias parceiras / rede aceita</h3><p class="card-sub">Agora a lista aparece diretamente no site.</p><div class="grid three">${rede.map(f=>`<div class="card pharmacy-card"><div class="pharmacy-mark">FG</div><div><strong>${f}</strong><p class="card-sub">Aceita benefício Farma Gold conforme cadastro empresarial.</p></div></div>`).join('')}</div></section></div>`;
  }
  if(id==='cestaBasica') return `<section class="card"><h3 class="card-title">Formulários de cesta básica</h3><p class="card-sub">Entrega ou retirada, assinatura digital e cópias para funcionário e RH.</p><div class="list">${(state.cestaFormularios||[]).map(f => listItem(f.funcionario, `${f.tipo} • ${f.data}<br>Protocolo: ${f.protocolo}`, f.status)).join('')}</div></section>`;
  return `<section class="card"><h3 class="card-title">Auxílio creche</h3><p class="card-sub">Valor fixo previsto de R$ 350,00, sem desconto no salário, mediante documentos e avaliação do RH.</p></section>`;
}
function bindTransport(){
  function renderTrans(name){
    const users = state.usuarios.filter(u => u.transportadora?.nome === name);
    const credits = {TOP:4200,Alelo:1800,Flash:5100,SOU:900,SPTrans:2500,VR:4700,Ben:1300,Ticket:3900};
    const credit = credits[name] || 0;
    const status = users.length === 0 ? 'Sem usuários' : credit < 1500 ? 'Crédito baixo' : credit < 3500 ? 'Normal' : 'Excelente';
    $('#transportPanel').innerHTML = `<div class="grid two" style="margin-top:14px"><div class="card"><strong>Crédito disponível</strong><h2>${money(credit)}</h2></div><div class="card"><strong>Status</strong><h2>${status}</h2></div></div><div class="card" style="margin-top:14px"><h3 class="card-title">Funcionários vinculados</h3><div class="list">${users.map(u => listItem(u.nome, `${u.setor} • ${u.cargo || u.tipo}`, u.tipo === 'admin' ? 'Administrador' : 'Funcionário')).join('')}</div></div>`;
  }
  $$('.transport-pill').forEach(btn => btn.onclick = () => { $$('.transport-pill').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderTrans(btn.dataset.transport); });
  const first = $('.transport-pill'); if(first) renderTrans(first.dataset.transport);
}
window.showDependentes = () => openModal('Dependentes Santa Helena','Inclusões e exclusões recebidas', `<div class="list">${(state.dependentesConvenio||[]).map(d => listItem(d.nome, `${d.funcionario} • ${d.parentesco}<br>CPF: ${d.cpf} • Nasc.: ${d.nascimento}<br>Documentos: ${d.documentos.join(', ')}`, d.status)).join('')}</div>`);
function requestItem(s){ return listItem(s.tipo, `${s.funcionario || 'Funcionário'} • ${s.data}<br>${text(s.descricao)}`, s.status); }

function renderPessoal(){
  setTitle('Pessoal','Administração de dados e solicitações dos funcionários');
  if(state.selectedPessoal) return renderPessoalDetail(state.selectedPessoal);
  const pend = state.solicitacoes.filter(s=>s.status==='Esperando avaliação');
  const holPend = state.holeritesAdmin.flatMap(f=>f.holerites.filter(h=>h.status==='Esperando assinatura').map(h=>({funcionario:f.nome,setor:f.setor,holerite:h})));
  const demandas = pend.length + holPend.length;
  const items = [['ferias','Controle de férias','Férias, retornos e PDF.'],['holerites','Holerites','Cópias assinadas e pendências.'],['faltas','Faltas e atestados','Justificativas e apontamentos.'],['exames','Exames periódicos','ASO, pendências e datas.'],['treinamentos','Treinamentos','Conteúdos e conclusões.'],['solicitacoes','Solicitações gerais','Todos os pedidos do portal.']];
  app.innerHTML = `${heading('Pessoal','Tudo que o RH precisa acompanhar')}<button class="card kpi click-card" id="openDemandas"><div class="kpi-icon">!</div><div><strong>${demandas}</strong><p class="card-title">Demandas em aberto</p><span>Solicitações pendentes e holerites sem assinatura</span></div></button><div class="grid three" style="margin-top:16px">${items.map(i => `<button class="card click-card" data-pessoal="${i[0]}"><h3>${i[1]}</h3><p class="card-sub">${i[2]}</p></button>`).join('')}</div>`;
  $('#openDemandas').onclick = () => openModal('Demandas em aberto','Itens que precisam de ação', `<div class="list">${pend.map(requestItem).join('')}${holPend.map(h => listItem('Holerite pendente', `${h.funcionario} • ${h.setor}<br>${h.holerite.mes} ${h.holerite.competencia}`, h.holerite.status)).join('')}</div>`);
  $$('[data-pessoal]').forEach(b => b.onclick = () => { state.selectedPessoal=b.dataset.pessoal; save(); renderPessoal(); });
}
function renderPessoalDetail(id){
  const title = {ferias:'Controle de férias', holerites:'Holerites', faltas:'Faltas e atestados', exames:'Exames periódicos', treinamentos:'Treinamentos', solicitacoes:'Solicitações gerais'}[id];
  app.innerHTML = `<button class="outline-btn" id="backPessoal">Voltar</button>${heading(title,'Detalhes administrativos')}${pessoalInfo(id)}`;
  $('#backPessoal').onclick = () => { state.selectedPessoal=null; save(); renderPessoal(); };
}
function pessoalInfo(id){
  if(id==='ferias') return `<button class="primary-btn" onclick="window.print()">Gerar PDF de férias</button><div class="list" style="margin-top:16px">${state.ferias.map(f => listItem(f.nome, `${f.setor} • ${f.cargo}<br>${f.periodo} • retorno ${f.retorno}`, f.status)).join('')}</div>`;
  if(id==='holerites') return `<div class="list">${state.holeritesAdmin.map(f => { const p=f.holerites.filter(h=>h.status==='Esperando assinatura').length; return listItem(f.nome, `${f.setor} • ${f.cargo}<br>${f.holerites.length} holerites • ${p} pendente(s)`, p?`${p} pendente(s)`:'OK', `showHolerites('${f.nome}')`); }).join('')}</div>`;
  if(id==='faltas') return `<div class="list">${(state.faltasAdmin||[]).map(f => listItem(f.funcionario, `${f.setor} • ${f.data}<br>${f.descricao}`, f.status)).join('')}</div>`;
  if(id==='exames') return `<div class="list">${(state.examesAdmin||[]).map(e => listItem(e.funcionario, `${e.titulo} • ${e.data}<br>${e.local}`, e.status)).join('')}</div>`;
  if(id==='treinamentos') return `<section class="card"><h3 class="card-title">Treinamentos publicados</h3><div class="list">${state.treinamentos.map(t => listItem(t.titulo, `${t.duracao}<br>${t.link}`)).join('')}</div></section><section class="card" style="margin-top:16px"><h3 class="card-title">Conclusões dos funcionários</h3><div class="list">${state.conclusoesTreinamento.map(c => listItem(c.funcionario, `${c.treinamento}<br>Concluído em ${c.dataConclusao}`, c.progresso)).join('')}</div></section>`;
  return `<div class="list">${state.solicitacoes.map(requestItem).join('')}</div>`;
}
function jsArg(value){
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
}
function holeriteActions(funcionario, holerite){
  if(holerite.status !== 'Assinado'){
    return `<div class="muted-note">Download disponível somente após assinatura.</div>`;
  }

  return `<button class="outline-btn small-btn" onclick="downloadHolerite('${jsArg(funcionario.nome)}', ${holerite.id})">Baixar PDF</button>`;
}
function holeriteItem(funcionario, holerite){
  const assinado = holerite.status === 'Assinado';
  const detalhes = `Valor líquido: ${text(holerite.valorLiquido)}<br>Protocolo: ${text(holerite.protocoloDocusign)}${holerite.dataAssinatura ? `<br>Assinado em: ${text(holerite.dataAssinatura)}` : ''}<div class="item-actions">${holeriteActions(funcionario, holerite)}</div>`;
  return listItem(`${holerite.mes} • ${holerite.competencia}`, detalhes, assinado ? 'Assinado' : holerite.status);
}
window.showHolerites = (nome) => {
  const f = state.holeritesAdmin.find(x=>x.nome===nome);
  openModal(
    `Holerites de ${nome}`,
    f?.setor || '',
    `<div class="list">${(f?.holerites||[]).map(h => holeriteItem(f, h)).join('')}</div>`
  );
};
function criarHtmlHoleriteWeb(funcionario, holerite){
  const linhas = [
    ['001','SALÁRIO BASE','220:00','2.850,00',''],
    ['400','COMISSÃO','','420,00',''],
    ['420','REPOUSO REMUNERADO','','180,00',''],
    ['903','INSS','','','312,65'],
    ['904','VALE TRANSPORTE','','','90,00'],
  ].map(l => `<tr><td class="codigo">${l[0]}</td><td>${l[1]}</td><td class="referencia">${l[2]}</td><td class="money">${l[3]}</td><td class="money">${l[4]}</td></tr>`).join('');

  return `<!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Holerite ${text(funcionario.nome)} ${text(holerite.competencia)}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,sans-serif;color:#111;margin:0;padding:24px;background:#fff}.recibo{border:1px solid #111;width:100%;max-width:900px;margin:0 auto}.topo{display:flex;border-bottom:1px solid #111}.empregador{width:52%;padding:10px;border-right:1px solid #111;font-size:11px;line-height:1.45}.titulo{flex:1;padding:10px;text-align:right}h1{font-size:20px;margin:0 0 6px}.ref{font-size:11px}.funcionario{display:grid;grid-template-columns:120px 1fr 180px;border-bottom:1px solid #111}.box{padding:7px;border-right:1px solid #111;min-height:34px}.box:last-child{border-right:0}.label{font-size:9px;display:block;color:#333}.valor{font-size:13px;font-weight:700}table{width:100%;border-collapse:collapse}th,td{border-right:1px solid #111;font-size:12px;padding:6px}th{border-bottom:1px solid #111;text-align:center;background:#f7f7f7}th:last-child,td:last-child{border-right:0}.codigo{width:55px;text-align:right}.referencia{width:90px;text-align:center}.money{width:120px;text-align:right}.spacer td{height:180px}.mensagens{border-top:1px solid #111;border-bottom:1px solid #111;padding:8px;font-size:11px;line-height:1.45}.totais{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid #111}.total{padding:8px;border-right:1px solid #111;text-align:right}.total:last-child{border-right:0;font-weight:700}.assinatura{margin:56px auto 0;text-align:center;font-size:11px;max-width:360px}.linha{border-top:1px solid #111;margin-bottom:8px}@media print{body{padding:0}.no-print{display:none}}
      </style>
    </head>
    <body>
      <div class="recibo">
        <div class="topo">
          <div class="empregador"><strong>EMPREGADOR</strong><br>Lipson Cosméticos LTDA<br>Rua das Indústrias, 120 - Joanópolis/SP<br>CNPJ 12.345.678/0001-90</div>
          <div class="titulo"><h1>Recibo de Pagamento de Salário</h1><div class="ref">Referente ao mês ${text(holerite.competencia)}</div></div>
        </div>
        <div class="funcionario">
          <div class="box"><span class="label">SETOR</span><span class="valor">${text(funcionario.setor)}</span></div>
          <div class="box"><span class="label">NOME DO FUNCIONÁRIO</span><span class="valor">${text(funcionario.nome)}</span></div>
          <div class="box"><span class="label">FUNÇÃO</span><span class="valor">${text(funcionario.cargo)}</span></div>
        </div>
        <table><thead><tr><th class="codigo">Cód.</th><th>Descrição</th><th class="referencia">Ref.</th><th class="money">Proventos</th><th class="money">Descontos</th></tr></thead><tbody>${linhas}<tr class="spacer"><td colspan="5"></td></tr></tbody></table>
        <div class="mensagens"><strong>MENSAGENS</strong><br>Holerite assinado digitalmente. Protocolo: ${text(holerite.protocoloDocusign)}.</div>
        <div class="totais"><div class="total"><span class="label">Total dos Vencimentos</span><span class="valor">3.450,00</span></div><div class="total"><span class="label">Total dos Descontos</span><span class="valor">402,65</span></div><div class="total"><span class="label">Líquido a Receber</span><span class="valor">${text(String(holerite.valorLiquido).replace('R$ ',''))}</span></div></div>
      </div>
      <div class="assinatura"><div class="linha"></div>ASSINATURA DO FUNCIONÁRIO<br><strong>${text(funcionario.nome)}</strong><br>Assinado em ${text(holerite.dataAssinatura || 'data registrada')}</div>
      <script>window.onload = () => { window.print(); };</script>
    </body>
  </html>`;
}
window.downloadHolerite = (nome, holeriteId) => {
  const funcionario = state.holeritesAdmin.find(f => f.nome === nome);
  const holerite = funcionario?.holerites.find(h => Number(h.id) === Number(holeriteId));

  if(!funcionario || !holerite){
    alert('Holerite não encontrado.');
    return;
  }

  if(holerite.status !== 'Assinado'){
    alert('Este holerite ainda não foi assinado. O PDF só pode ser baixado depois da assinatura.');
    return;
  }

  const janela = window.open('', '_blank');
  if(!janela){
    alert('O navegador bloqueou a janela de impressão. Libere pop-ups para baixar o PDF.');
    return;
  }

  janela.document.open();
  janela.document.write(criarHtmlHoleriteWeb(funcionario, holerite));
  janela.document.close();
};
function openTreinamentos(){ state.page='pessoal'; state.selectedPessoal='treinamentos'; save(); render(); }

function calcData(){
  const funcs = funcionarios();
  const pend = state.solicitacoes.filter(s=>s.status==='Esperando avaliação').length;
  const aprov = state.solicitacoes.filter(s=>s.status==='Aprovado').length;
  const neg = state.solicitacoes.filter(s=>s.status==='Negado').length;
  const hp = state.holeritesAdmin.reduce((t,f)=>t+f.holerites.filter(h=>h.status==='Esperando assinatura').length,0);
  const ha = state.holeritesAdmin.reduce((t,f)=>t+f.holerites.filter(h=>h.status==='Assinado').length,0);
  const compliance = Math.round(((aprov+ha)/(state.solicitacoes.length+ha+hp||1))*100);
  const setores = [...new Set(funcs.map(f=>f.setor))].map(setor => {
    const q = funcs.filter(f=>f.setor===setor).length;
    const pendSetor = state.holeritesAdmin.filter(h=>h.setor===setor).reduce((t,f)=>t+f.holerites.filter(h=>h.status==='Esperando assinatura').length,0);
    const pct = Math.max(42, Math.min(100, Math.round((q/(q+pendSetor||1))*100)));
    return {setor, q, pend:pendSetor, pct, status: pct>85?'OK':pct>65?'Atenção':'Crítico'};
  });
  return {funcs, pend, aprov, neg, hp, ha, compliance, setores};
}
function renderDashboard(){
  setTitle('Dashboard','Resumo executivo e indicadores críticos');
  const d=calcData();
  app.innerHTML = `${heading('Dashboard Executivo','Resumo de conformidade e indicadores críticos · Atualizado agora','<button class="outline-btn" onclick="window.print()">Gerar relatório</button><button class="primary-btn" onclick="setPage(\'analytics\')">Abrir analytics</button>')}
  <section class="card hero"><span class="eyebrow">Monitoramento ativo</span><h2>${d.compliance}% de conformidade</h2><p>${new Date().toLocaleDateString('pt-BR')} · dados administrativos do portal RH Cosmetics.</p><div class="hero-metrics"><button onclick="showFuncionarios()"><strong>${d.funcs.length}</strong><span>funcionários</span></button><button onclick="showDemandasDash()"><strong>${d.pend+d.hp}</strong><span>demandas abertas</span></button><button onclick="showHoleritesDash()"><strong>${d.ha}</strong><span>holerites assinados</span></button></div></section>
  <div class="grid four" style="margin-top:16px">${kpi('Conformidade',`${d.compliance}%`,`${d.aprov} solicitações aprovadas`,'OK','setPage(\'analytics\')')}${kpi('Alertas críticos',d.pend+d.hp,'Pedidos e holerites pendentes','!','showDemandasDash()')}${kpi('Funcionários',d.funcs.length,'Clique para listar nomes','FN','showFuncionarios()')}${kpi('Treinamentos',state.conclusoesTreinamento.length,'Conclusões registradas','TR','openTreinamentos()')}</div>
  <div class="bento" style="margin-top:16px"><section class="card span-7"><h3 class="card-title">Conformidade por setor</h3><div class="sector-row header"><span>Setor</span><span>Func.</span><span>Pend.</span><span>Progresso</span><span>Status</span></div>${d.setores.map(s => `<button class="sector-row click-card" onclick="showSetor('${s.setor}')"><strong>${s.setor}</strong><span>${s.q}</span><span>${s.pend}</span><div><strong>${s.pct}%</strong><div class="progress"><span style="width:${s.pct}%"></span></div></div>${badge(s.status)}</button>`).join('')}</section><section class="card span-5"><h3 class="card-title">Alertas & pendências</h3><div class="list">${listItem(`${d.pend} solicitações pendentes`,'Pedidos esperando avaliação do RH',d.pend?'Atenção':'OK')}${listItem(`${d.hp} holerites pendentes`,'Assinaturas ainda não concluídas',d.hp?'Crítico':'OK')}${listItem('Férias monitoradas','Retornos e entradas recentes','Ativo')}</div></section><section class="card chart-card span-6"><h3 class="card-title">Tendência histórica</h3>${lineChart([72,76,79,82,86,d.compliance])}</section><section class="card chart-card span-6"><h3 class="card-title">Mix de status</h3><div class="donut"><div class="donut-label"><strong>${d.compliance}%</strong><span>conformes</span></div></div></section></div>`;
}
window.showFuncionarios = () => openModal('Funcionários','Lista de funcionários cadastrados', `<div class="list">${funcionarios().map(f => listItem(f.nome, `${f.setor} • ${f.cargo}<br>VT: ${f.transportadora?.nome||'-'}`, 'Funcionário')).join('')}</div>`);
window.showDemandasDash = () => { const d=calcData(); const pend = state.solicitacoes.filter(s=>s.status==='Esperando avaliação').map(requestItem).join(''); const hol = state.holeritesAdmin.flatMap(f=>f.holerites.filter(h=>h.status==='Esperando assinatura').map(h=>listItem('Holerite pendente',`${f.nome} • ${f.setor}<br>${h.mes} ${h.competencia}`,h.status))).join(''); openModal('Demandas abertas','Solicitações e holerites pendentes',`<div class="list">${pend}${hol}</div>`); };
window.showHoleritesDash = () => openModal('Holerites','Resumo por funcionário', `<div class="list">${state.holeritesAdmin.map(f => listItem(f.nome, `${f.setor}<br>${f.holerites.length} holerites`, `${f.holerites.filter(h=>h.status==='Esperando assinatura').length} pend.`)).join('')}</div>`);
window.showSetor = setor => openModal(`Funcionários do setor ${setor}`,'Funcionários e dados principais', `<div class="list">${funcionarios().filter(f=>f.setor===setor).map(f=>listItem(f.nome, `${f.cargo}<br>VT: ${f.transportadora?.nome}`, 'Funcionário')).join('')}</div>`);
function lineChart(data){
  const max = Math.max(...data,100), min = Math.min(...data,0); const w=720,h=220,p=28;
  const pts = data.map((v,i)=>[p+i*((w-p*2)/(data.length-1)), h-p-((v-min)/(max-min))*(h-p*2)]);
  const d = pts.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ');
  return `<svg class="line-chart" viewBox="0 0 ${w} ${h}" role="img"><defs><linearGradient id="g" x1="0" y1="0" y2="1"><stop stop-color="#6b4226" stop-opacity=".18"/><stop offset="1" stop-color="#6b4226" stop-opacity="0"/></linearGradient></defs><path d="${d} L ${pts.at(-1)[0]},${h-p} L ${pts[0][0]},${h-p} Z" fill="url(#g)"/><path d="${d}" fill="none" stroke="#6b4226" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((pt,i)=>`<circle cx="${pt[0]}" cy="${pt[1]}" r="6" fill="#3f2618"/><text x="${pt[0]}" y="${pt[1]-12}" text-anchor="middle" fill="#6b4226" font-weight="800" font-size="14">${data[i]}%</text>`).join('')}</svg>`;
}

function renderAnalytics(){
  setTitle('Analytics','Indicadores avançados, filtros e relatórios');
  const d=calcData();
  const setores = ['Todos',...d.setores.map(s=>s.setor)];
  const filtro = state.selectedSector || 'Todos';
  const funcs = filtro==='Todos'?funcionarios():funcionarios().filter(f=>f.setor===filtro);
  const transportadoras = [...new Set(state.usuarios.map(u=>u.transportadora?.nome).filter(Boolean))].map(t=>({nome:t, total:state.usuarios.filter(u=>u.transportadora?.nome===t).length}));
  const maxT = Math.max(...transportadoras.map(t=>t.total),1);
  app.innerHTML = `${heading('Analytics & Relatórios','Filtros por setor e visualizações operacionais','<button class="primary-btn" onclick="window.print()">Exportar PDF</button>')}<div class="filter-pills">${setores.map(s=>`<button class="pill ${filtro===s?'active':''}" data-sector="${s}">${s}</button>`).join('')}</div><div class="grid four">${kpi('Funcionários no filtro',funcs.length,`Setor: ${filtro}`,'FN','showFilteredFuncionarios()')}${kpi('Taxa de aprovação',`${d.compliance}%`,'Base geral do portal','%')}${kpi('Demandas',d.pend+d.hp,'Solicitações + holerites','!','showDemandasDash()')}${kpi('Transportadoras',transportadoras.length,'VT cadastrado','VT')}</div><div class="bento" style="margin-top:16px"><section class="card chart-card span-7"><h3 class="card-title">Distribuição por transportadora</h3><div class="bar-chart">${transportadoras.map(t=>`<div class="bar"><div class="bar-fill" style="height:${Math.max(18,(t.total/maxT)*165)}px"></div><small>${t.nome}<br>${t.total}</small></div>`).join('')}</div></section><section class="card span-5"><h3 class="card-title">Funcionários no filtro</h3><div class="list">${funcs.map(f=>listItem(f.nome,`${f.setor} • ${f.cargo}<br>${f.transportadora?.nome||'-'}`,'Funcionário')).join('')}</div></section><section class="card span-12"><h3 class="card-title">Tabela operacional</h3><div class="list">${funcs.map(f=>listItem(f.nome,`${f.setor} • ${f.cargo}<br>Idade: ${f.idade} • VT: ${f.transportadora?.nome}`,'Ativo')).join('')}</div></section></div>`;
  $$('[data-sector]').forEach(b=>b.onclick=()=>{state.selectedSector=b.dataset.sector;save();renderAnalytics();});
}
window.showFilteredFuncionarios = () => { const f=state.selectedSector||'Todos'; const funcs=f==='Todos'?funcionarios():funcionarios().filter(x=>x.setor===f); openModal('Funcionários no filtro',f,`<div class="list">${funcs.map(u=>listItem(u.nome,`${u.setor} • ${u.cargo}`,'Ativo')).join('')}</div>`); };

function renderPerfil(){
  setTitle('Perfil','Dados do administrador');
  const u = currentUser || admins()[0];
  app.innerHTML = `${heading('Perfil do admin','Configurações e dados profissionais')}<div class="profile-cover"></div><section class="card profile-card"><div class="avatar">${u.nome.split(' ').map(p=>p[0]).slice(0,2).join('')}</div><h2>${u.nome}</h2><p class="card-sub">${u.setor} • Administrador do portal</p><div class="grid three"><div class="card"><strong>Usuário</strong><p>${u.usuario}</p></div><div class="card"><strong>Idade</strong><p>${u.idade} anos</p></div><div class="card"><strong>Transportadora</strong><p>${u.transportadora?.nome||'-'}</p></div></div></section>`;
}

init();
