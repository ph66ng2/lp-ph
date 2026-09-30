import { analyzeGraph, layoutGraph, neighborhood } from "./graph.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const repoColors = { AutoOs: "#64c7bf", AutoBO: "#f3a667", AutoPlatform: "#94a7f7", Demo: "#c2a0ff" };
const statusLabels = { ready: "ready", blocked: "blocked", in_progress: "em andamento", review: "em revisão", merged: "merged" };
const statusIcons = { ready: "▶", blocked: "!", in_progress: "●", review: "◷", merged: "✓" };
const situationLabels = { eligible: "Pode começar agora", waiting: "Aguardando dependências", "manual-blocked": "Bloqueio humano / externo", "in-progress": "Em andamento", "in-review": "Em revisão", completed: "Concluído", "data-error": "Indeterminado · erro de dados", unknown: "Estado desconhecido" };
const issueLabels = { "missing-reference": "Referência ausente", "ambiguous-reference": "Referência ambígua", "duplicate-id": "ID duplicado", cycle: "Ciclo", "unknown-status": "Estado desconhecido", "read-error": "Falha de leitura", "stale-source": "Fonte desatualizada", "missing-id": "ID ausente", "missing-title": "Título ausente", "bad-confirmed-relation": "Relação confirmada inválida" };
const elements = {
  svg: $("#graph"), content: $("#graph-content"), viewport: $("#graph-viewport"),
  detailEmpty: $("#detail-empty"), detailContent: $("#detail-content"),
  demoBanner: $("#demo-banner"), demoTitle: $("#demo-title"), demoDescription: $("#demo-description"),
};
const state = {
  snapshot: null, sidecar: null, fixtures: null, plan: null, graph: null, layout: null,
  selectedUid: null, currentView: "plan", demoId: null, demoLabel: null,
  repoEnabled: new Set(), query: "", status: "all", situation: "all",
  projectConfig: {}, viewBox: null, initialViewBox: null, pointers: new Map(), panStart: null,
};

function keyFor(record) { return `${record.owner}/${record.repo}`; }
function displayRepo(repo) { return repo === "AutoOs" ? "AutoOS" : repo; }
function projectColor(repo) { return repoColors[repo] ?? "#98a7b4"; }
function labelForStatus(status) { return statusLabels[status] ?? status ?? "sem estado"; }
function labelForSituation(situation) { return situationLabels[situation] ?? situationLabels.unknown; }
function nodeText(ticket, limit = 25) {
  const title = String(ticket?.title ?? "(sem título)").trim();
  return title.length > limit ? `${title.slice(0, limit - 1)}…` : title;
}
function humanDate(value, withTime = true) {
  if (!value) return "não informado";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("pt-BR", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}
function setView(name) {
  state.currentView = name;
  const activePanel = { plan: "plan-view", map: "map-view", ready: "ready-view", scenarios: "scenario-view", integrity: "integrity-view" }[name];
  document.body.classList.toggle("show-capture-metrics", name !== "plan");
  $(".workspace").classList.toggle("plan-mode", name === "plan");
  $$(".view-tab").forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $$(".tab-panel").forEach((panel) => { panel.hidden = panel.id !== activePanel; panel.classList.toggle("active", panel.id === activePanel); });
  if (name === "ready") renderReadyList();
}

function currentNodes() { return state.graph?.nodes ?? []; }
function allRepoKeys() { return (state.graph?.repositories ?? []).map(keyFor); }
function currentMatches() {
  const query = state.query.trim().toLocaleLowerCase("pt-BR");
  return currentNodes().filter((node) => {
    if (state.repoEnabled.size && !state.repoEnabled.has(node.repoId)) return false;
    if (state.status !== "all" && node.status !== state.status) return false;
    if (state.situation !== "all" && node.situation !== state.situation) return false;
    if (query && ![node.ticket.id, node.ticket.title].join(" ").toLocaleLowerCase("pt-BR").includes(query)) return false;
    return true;
  });
}
function renderRepoFilters() {
  const records = state.graph?.repositories ?? [];
  $("#repo-filters").innerHTML = records.map((record) => {
    const key = keyFor(record);
    const checked = state.repoEnabled.has(key);
    const count = state.graph.nodes.filter((node) => node.repoId === key).length;
    const error = record.readStatus === "error" || record.readStatus === "stale";
    return `<label class="check-row"><input type="checkbox" data-repo-filter="${escapeHtml(key)}" ${checked ? "checked" : ""}><span class="repo-swatch" style="--repo:${projectColor(record.repo)}"></span><span class="check-name">${escapeHtml(displayRepo(record.repo))}</span><small>${count}${error ? " · erro" : ""}</small></label>`;
  }).join("");
  $("#repo-filters").querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
    input.checked ? state.repoEnabled.add(input.dataset.repoFilter) : state.repoEnabled.delete(input.dataset.repoFilter);
    refreshView();
  }));
}
function populateStatusFilter() {
  const statuses = [...new Set(currentNodes().map((node) => node.status))].sort();
  $("#status-filter").innerHTML = `<option value="all">Todos os estados</option>${statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(labelForStatus(status))}</option>`).join("")}`;
  $("#status-filter").value = state.status;
}

function graphPath(edge) {
  const from = state.layout.positions.get(edge.from);
  const to = state.layout.positions.get(edge.to);
  if (!from || !to) return "";
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;
  const bend = Math.max(30, Math.abs(x2 - x1) * 0.38);
  const c1 = x1 + (x2 >= x1 ? bend : 40);
  const c2 = x2 - (x2 >= x1 ? bend : 40);
  return `M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`;
}

function resultsContext(matches) {
  const context = new Set(matches.map((node) => node.uid));
  for (const node of matches) {
    for (const edge of [...(state.graph.incoming.get(node.uid) ?? []), ...(state.graph.outgoing.get(node.uid) ?? [])]) {
      context.add(edge.from); context.add(edge.to);
    }
  }
  return context;
}

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

function drawGraph() {
  if (!state.graph) return;
  state.layout = layoutGraph(state.graph);
  const { width, height, lanes, positions, nodeWidth, nodeHeight } = state.layout;
  elements.content.replaceChildren();
  const matches = currentMatches();
  const matched = new Set(matches.map((node) => node.uid));
  const context = resultsContext(matches);
  const focusNodes = state.selectedUid ? neighborhood(state.graph, state.selectedUid) : new Set();
  const hasActiveFilters = Boolean(state.query.trim()) || state.repoEnabled.size < state.graph.repositories.length || state.status !== "all" || state.situation !== "all";

  for (const lane of lanes) {
    const background = svgElement("rect", { x: 10, y: lane.y + 12, width: width - 20, height: lane.height - 26, rx: 14, class: "lane-background" });
    background.style.setProperty("--repo", projectColor(lane.repoId.split("/").at(-1)));
    elements.content.append(background);
    const title = svgElement("text", { x: 28, y: lane.y + 38, class: "lane-title" });
    title.textContent = displayRepo(lane.repoId.split("/").at(-1));
    elements.content.append(title);
    const repoRecord = state.graph.repositories.find((record) => keyFor(record) === lane.repoId);
    const branch = svgElement("text", { x: 28 + Math.max(75, displayRepo(lane.repoId.split("/").at(-1)).length * 8), y: lane.y + 38, class: "lane-branch" });
    branch.textContent = repoRecord ? `${repoRecord.branch} · ${repoRecord.readStatus === "stale" ? "captura antiga" : repoRecord.readStatus === "error" ? "falha de leitura" : "workflow.json"}` : "fixture local";
    elements.content.append(branch);
  }

  const drawEdge = (edge, suggested = false) => {
    const source = state.graph.byUid.get(edge.from);
    const target = state.graph.byUid.get(edge.to);
    const path = svgElement("path", {
      d: graphPath(edge),
      class: `graph-edge ${suggested ? "suggested" : "confirmed"}${state.graph.issues.some((issue) => issue.type === "cycle" && issue.uids?.includes(edge.from) && issue.uids?.includes(edge.to)) ? " cycle-edge" : ""}`,
      "marker-end": suggested ? "url(#arrow-suggested)" : "url(#arrow-confirmed)",
      "data-from": edge.from, "data-to": edge.to,
      "aria-label": `${source?.ticket.id ?? "?"} para ${target?.ticket.id ?? "?"}${suggested ? ", relação sugerida" : ", dependência confirmada"}`,
    });
    let opacity = suggested ? 0.46 : (matched.has(edge.from) && matched.has(edge.to) ? 0.72 : context.has(edge.from) && context.has(edge.to) ? 0.28 : 0.1);
    if (suggested && focusNodes.size) opacity = edge.from === state.selectedUid || edge.to === state.selectedUid ? 0.5 : hasActiveFilters && (matched.has(edge.from) || matched.has(edge.to)) ? 0.17 : 0.025;
    path.style.opacity = String(opacity);
    if (!suggested && focusNodes.size) path.style.opacity = focusNodes.has(edge.from) && focusNodes.has(edge.to) ? "0.95" : hasActiveFilters && (matched.has(edge.from) || matched.has(edge.to)) ? "0.45" : "0.06";
    const title = svgElement("title");
    title.textContent = `${source?.ticket.id ?? "?"} → ${target?.ticket.id ?? "?"}${suggested ? ` · sugerida: ${edge.relation.reason}` : " · blockedBy"}`;
    path.append(title);
    elements.content.append(path);
  };
  state.graph.edges.forEach((edge) => drawEdge(edge, false));
  state.graph.suggestedEdges.forEach((edge) => drawEdge(edge, true));

  for (const node of state.graph.nodes) {
    const position = positions.get(node.uid);
    if (!position) continue;
    const group = svgElement("g", {
      class: `ticket-node status-${node.status.replace(/[^a-z0-9_-]/gi, "unknown")}${node.errors.length ? " has-error" : ""}${node.uid === state.selectedUid ? " selected" : ""}`,
      transform: `translate(${position.x} ${position.y})`,
      tabindex: "0", role: "button", "data-uid": node.uid,
      "aria-label": `${node.ticket.id ?? "Sem ID"}, ${node.ticket.title ?? "sem título"}, repositório ${displayRepo(node.repo)}, workflow ${labelForStatus(node.status)}, situação ${labelForSituation(node.situation)}${node.errors.length ? ", com erro de dados" : ""}`,
    });
    const isMatch = matched.has(node.uid);
    const opacity = state.selectedUid ? (focusNodes.has(node.uid) ? 1 : hasActiveFilters && isMatch ? 0.65 : 0.08) : isMatch ? 1 : context.has(node.uid) ? 0.36 : 0.08;
    group.style.opacity = String(opacity);
    if (focusNodes.has(node.uid)) group.classList.add("in-focus");
    if (state.graph.issues.some((issue) => issue.type === "cycle" && issue.uids?.includes(node.uid))) group.classList.add("in-cycle");
    const rect = svgElement("rect", { width: nodeWidth, height: nodeHeight, rx: 9, class: "node-card" });
    const stripe = svgElement("rect", { width: 5, height: nodeHeight, rx: 2.5, class: "node-repo-stripe" });
    stripe.style.setProperty("--repo", projectColor(node.repo));
    const id = svgElement("text", { x: 15, y: 20, class: "node-id" });
    id.textContent = String(node.ticket.id ?? "(sem ID)");
    const shortTitle = svgElement("text", { x: 15, y: 41, class: "node-title" });
    shortTitle.textContent = nodeText(node.ticket, 25);
    const stateChip = svgElement("text", { x: nodeWidth - 11, y: 19, class: "node-state", "text-anchor": "end" });
    stateChip.textContent = `${statusIcons[node.status] ?? "?"} ${labelForStatus(node.status)}`;
    group.append(rect, stripe, id, shortTitle, stateChip);
    const title = svgElement("title");
    title.textContent = `${node.ticket.id ?? "(sem ID)"} · ${node.ticket.title ?? "(sem título)"} · ${displayRepo(node.repo)} · ${labelForStatus(node.status)} · ${labelForSituation(node.situation)}`;
    group.append(title);
    group.addEventListener("click", (event) => { event.stopPropagation(); selectNode(node.uid); });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node.uid); }
    });
    elements.content.append(group);
  }
  elements.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  elements.svg.setAttribute("width", width);
  elements.svg.setAttribute("height", height);
  if (!state.viewBox) setViewBox({ x: 0, y: 0, width, height });
  else setViewBox(state.viewBox);
  $("#empty-map").classList.toggle("hidden", matches.length > 0);
  $("#result-count").textContent = String(matches.length);
  $("#graph-total").textContent = String(state.graph.nodes.length);
  $("#context-note").textContent = matches.length === state.graph.nodes.length
    ? "Arraste para mover · roda / pinça para zoom · selecione um nó para focar."
    : `${matches.length} resultado(s); vizinhos diretos permanecem esmaecidos como contexto. A seta nunca afirma ordem entre ramos independentes.`;
}

function setViewBox(box) {
  if (!box) return;
  state.viewBox = { ...box };
  elements.svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
}
function frameAll() {
  if (!state.layout) return;
  setViewBox({ x: 0, y: 0, width: state.layout.width, height: state.layout.height });
}
function centerOnNode(uid) {
  const pos = state.layout?.positions.get(uid);
  if (!pos) return;
  const width = Math.min(state.layout.width, 980);
  const height = Math.min(state.layout.height, 660);
  setViewBox({ x: Math.max(0, Math.min(state.layout.width - width, pos.x + pos.width / 2 - width / 2)), y: Math.max(0, Math.min(state.layout.height - height, pos.y + pos.height / 2 - height * 0.35)), width, height });
}
function fitNeighborhood(uid) {
  const neighborhoodSet = new Set([uid]);
  for (const edge of [...(state.graph.incoming.get(uid) ?? []), ...(state.graph.outgoing.get(uid) ?? [])]) { neighborhoodSet.add(edge.from); neighborhoodSet.add(edge.to); }
  const points = [...neighborhoodSet].map((id) => state.layout.positions.get(id)).filter(Boolean);
  if (!points.length) return;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x + point.width));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y + point.height));
  const width = Math.min(state.layout.width, Math.max(640, maxX - minX + 260));
  const height = Math.min(state.layout.height, Math.max(360, maxY - minY + 250));
  setViewBox({ x: Math.max(0, Math.min(state.layout.width - width, (minX + maxX) / 2 - width / 2)), y: Math.max(0, Math.min(state.layout.height - height, (minY + maxY) / 2 - height / 2)), width, height });
}
function zoom(factor, anchorX = null, anchorY = null) {
  if (!state.viewBox || !state.layout) return;
  const box = state.viewBox;
  const width = Math.max(340, Math.min(state.layout.width * 1.6, box.width / factor));
  const height = Math.max(260, Math.min(state.layout.height * 1.6, box.height / factor));
  const px = anchorX ?? box.x + box.width / 2;
  const py = anchorY ?? box.y + box.height / 2;
  const rx = (px - box.x) / box.width;
  const ry = (py - box.y) / box.height;
  setViewBox({ x: px - rx * width, y: py - ry * height, width, height });
}
function pointerToGraph(event) {
  const rect = elements.svg.getBoundingClientRect();
  const box = state.viewBox;
  return { x: box.x + ((event.clientX - rect.left) / rect.width) * box.width, y: box.y + ((event.clientY - rect.top) / rect.height) * box.height };
}

function directTechnicalState(node) {
  const deps = (state.graph.incoming.get(node.uid) ?? []).map((edge) => state.graph.byUid.get(edge.from));
  if (deps.length === 0) return "Nenhuma dependência técnica declarada.";
  const merged = deps.filter((dep) => dep?.status === "merged" && dep.sourceRecord?.readStatus === "ok").length;
  if (merged === deps.length) return "Todas as dependências técnicas confirmadas estão merged.";
  return `${merged} de ${deps.length} dependência(s) técnica(s) confirmada(s) estão merged.`;
}
function listItem(node, why = "") {
  return `<button class="related-row" type="button" data-related-uid="${escapeHtml(node.uid)}"><span class="related-project" style="--repo:${projectColor(node.repo)}">${escapeHtml(displayRepo(node.repo))}</span><span class="related-copy"><strong>${escapeHtml(node.ticket.id)}</strong><small>${escapeHtml(node.ticket.title ?? "sem título")}</small></span><span class="related-status status-text-${escapeHtml(node.status)}">${escapeHtml(labelForStatus(node.status))}</span>${why ? `<small class="related-why">${escapeHtml(why)}</small>` : ""}</button>`;
}
function selectNode(uid, center = false) {
  const node = state.graph.byUid.get(uid);
  if (!node) return;
  state.selectedUid = uid;
  renderDetails(node);
  drawGraph();
  if (center) centerOnNode(uid);
}
function renderDetails(node) {
  elements.detailEmpty.classList.add("hidden");
  elements.detailContent.classList.remove("hidden");
  const deps = (state.graph.incoming.get(node.uid) ?? []).map((edge) => state.graph.byUid.get(edge.from)).filter(Boolean);
  const unlocks = (state.graph.outgoing.get(node.uid) ?? []).map((edge) => state.graph.byUid.get(edge.to)).filter(Boolean);
  const suggestedIn = state.graph.suggestedEdges.filter((edge) => edge.to === node.uid);
  const suggestedOut = state.graph.suggestedEdges.filter((edge) => edge.from === node.uid);
  const source = node.sourceRecord?.sourceUrl;
  const t = node.ticket;
  const details = [
    ["Contexto", t.context], ["Objetivo", t.objective], ["Escopo", t.scope], ["Fora do escopo", t.outOfScope],
    ["Comportamento esperado", t.expectedBehavior], ["Critérios de aceite", t.acceptanceCriteria], ["Testes", t.tests],
    ["Instruções de teste", t.testInstructions], ["Arquivos prováveis", t.likelyFiles], ["Riscos", t.risks],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
  const showDetail = (value) => Array.isArray(value) ? `<ul>${value.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : typeof value === "object" ? `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>` : `<p>${escapeHtml(value)}</p>`;
  const relationItems = (edges, direction) => edges.map((edge) => {
    const related = state.graph.byUid.get(direction === "in" ? edge.from : edge.to);
    return related ? `${listItem(related, "sugerida · não afeta liberação")}<p class="evidence-note">${escapeHtml(edge.relation.reason)}<br><small>${escapeHtml(edge.relation.evidence)}</small></p>` : "";
  }).join("");
  elements.detailContent.innerHTML = `
    <div class="detail-scroll">
      <div class="detail-topline"><span class="repo-chip" style="--repo:${projectColor(node.repo)}"><i></i>${escapeHtml(displayRepo(node.repo))}</span><button class="icon-button" id="close-detail" type="button" aria-label="Limpar foco" title="Limpar seleção">×</button></div>
      <p class="ticket-id-large">${escapeHtml(t.id ?? "(sem ID)")}</p>
      <h2 class="detail-title">${escapeHtml(t.title ?? "(sem título)")}</h2>
      <div class="detail-meta"><span class="state-pill state-${escapeHtml(node.status)}"><i>${escapeHtml(statusIcons[node.status] ?? "?")}</i> Workflow: ${escapeHtml(labelForStatus(node.status))}</span><span class="branch-meta">${escapeHtml(node.branch ?? "branch?")}</span></div>
      <div class="situation-card situation-${escapeHtml(node.situation)}"><span class="eyebrow">SITUAÇÃO CALCULADA</span><strong>${escapeHtml(labelForSituation(node.situation))}</strong><small>${escapeHtml(directTechnicalState(node))}</small></div>
      ${node.errors.length ? `<div class="node-error-list">${node.errors.map((issue) => `<p>⚠ ${escapeHtml(issue.message)}</p>`).join("")}</div>` : ""}
      <button id="focus-neighborhood" class="button button-secondary full-button" type="button">⌖ Focar neste trecho do mapa</button>
      <a class="source-link" href="${escapeHtml(source ?? "#")}" target="_blank" rel="noreferrer">Abrir workflow de origem <span aria-hidden="true">↗</span></a>
      <section class="detail-section"><div class="section-title small"><div><p class="eyebrow">DIRETAS · CONFIRMADAS</p><h3>Depende de <span>${deps.length}</span></h3></div></div>${deps.length ? deps.map((item) => listItem(item, labelForStatus(item.status))).join("") : `<p class="empty-copy">Sem predecessores declarados; esta é uma raiz desta trilha.</p>`}</section>
      <section class="detail-section"><div class="section-title small"><div><p class="eyebrow">DIRETAS · CONFIRMADAS</p><h3>Libera <span>${unlocks.length}</span></h3></div></div>${unlocks.length ? unlocks.map((item) => listItem(item, `workflow: ${labelForStatus(item.status)}`)).join("") : `<p class="empty-copy">Nenhum sucessor depende diretamente deste ticket.</p>`}</section>
      ${(suggestedIn.length || suggestedOut.length) ? `<section class="detail-section suggested-detail"><div class="section-title small"><div><p class="eyebrow">RELAÇÕES SUGERIDAS · NÃO CONFIRMADAS</p><h3>Entre repositórios</h3></div></div>${relationItems(suggestedIn, "in")}${relationItems(suggestedOut, "out")}</section>` : ""}
      ${details.map(([label, value]) => `<details class="ticket-field"><summary>${escapeHtml(label)}</summary>${showDetail(value)}</details>`).join("")}
      ${t.completedAt ? `<div class="ticket-footnote">Concluído em ${escapeHtml(humanDate(t.completedAt))}</div>` : ""}
      ${t.evidence ? `<details class="ticket-field"><summary>Evidências</summary>${showDetail(t.evidence)}</details>` : ""}
    </div>`;
  $("#close-detail").addEventListener("click", clearSelection);
  $("#focus-neighborhood").addEventListener("click", () => fitNeighborhood(node.uid));
  elements.detailContent.querySelectorAll("[data-related-uid]").forEach((button) => button.addEventListener("click", () => selectNode(button.dataset.relatedUid, true)));
}
function clearSelection() {
  state.selectedUid = null;
  elements.detailContent.classList.add("hidden");
  elements.detailEmpty.classList.remove("hidden");
  drawGraph();
}

function refreshView() {
  drawGraph();
  updateSummary();
  if (state.currentView === "ready") renderReadyList();
}
function eligibleNodes() { return state.graph.nodes.filter((node) => node.situation === "eligible"); }
function renderReadyList() {
  const matches = currentMatches().filter((node) => node.situation === "eligible");
  const deferred = new Set(state.plan?.deferred.flatMap((group) => group.ids) ?? []);
  const superseded = new Set(state.plan?.superseded.flatMap((group) => group.ids) ?? []);
  const outOfFocus = new Set([...deferred, ...superseded]);
  const deferredEligible = state.demoId ? 0 : eligibleNodes().filter((node) => outOfFocus.has(node.ticket.id)).length;
  $("#ready-note").textContent = state.demoId
    ? "Fixture local: esta lista usa somente estado e dependências declaradas no exemplo."
    : deferredEligible ? `${deferredEligible} dos ${eligibleNodes().length} liberados tecnicamente estão adiados ou substituídos no plano atual. Liberação não define prioridade.`
      : "Elegibilidade calculada pelas regras do workflow. A prioridade de execução é uma decisão separada.";
  $("#ready-list-count").textContent = String(matches.length);
  $("#ready-total").textContent = String(eligibleNodes().length);
  if (!matches.length) { $("#ready-groups").innerHTML = `<div class="empty-card"><span>↗</span><h3>Nenhum ticket liberado com estes filtros</h3><p>Isso pode significar que os predecessores ainda não estão merged, o status declarado não permite início ou há um erro na fonte.</p></div>`; return; }
  const groups = new Map();
  for (const node of matches) { const items = groups.get(node.repo) ?? []; items.push(node); groups.set(node.repo, items); }
  $("#ready-groups").innerHTML = [...groups].map(([repo, nodes]) => `<section class="ready-group"><div class="ready-group-heading"><span class="repo-swatch" style="--repo:${projectColor(repo)}"></span><h3>${escapeHtml(displayRepo(repo))}</h3><span>${nodes.length === 1 ? "1 opção liberada" : `${nodes.length} opções liberadas`}</span></div><div class="ready-card-list">${nodes.map((node) => `<button class="ready-card" data-ready-uid="${escapeHtml(node.uid)}" type="button"><span class="ready-arrow" aria-hidden="true">↗</span><span><strong>${escapeHtml(node.ticket.id)}</strong><b>${escapeHtml(node.ticket.title ?? "(sem título)")}</b><small>${escapeHtml(directTechnicalState(node))}</small></span><span class="ready-label">${!state.demoId && superseded.has(node.ticket.id) ? "técnico: liberado · plano: substituído" : !state.demoId && deferred.has(node.ticket.id) ? "técnico: liberado · plano: adiado" : "ready · dependências concluídas"}</span></button>`).join("")}</div></section>`).join("");
  $("#ready-groups").querySelectorAll("[data-ready-uid]").forEach((button) => button.addEventListener("click", () => { setView("map"); selectNode(button.dataset.readyUid, true); }));
}

function renderPlan() {
  const plan = state.plan;
  $("#plan-snapshot-note").textContent = plan.basedOnCapturedAt === state.snapshot.capturedAt
    ? `Captura de ${humanDate(state.snapshot.capturedAt)}. Os três roadmaps e os PRs #103 e #104 já foram mesclados. AO-WF-RECONCILE-001 está concluído; AO-SUITE-001 é o próximo ticket AutoOS.`
    : `A captura de ${humanDate(state.snapshot.capturedAt)} mudou desde a revisão deste plano. Confira os IDs, status e pré-requisitos antes de executá-lo.`;
  $("#plan-snapshot-note").classList.toggle("outdated", plan.basedOnCapturedAt !== state.snapshot.capturedAt);
  const sourceTickets = new Map(state.snapshot.repositories.flatMap((record) => (record.workflow?.tickets ?? []).map((ticket) => [`${record.repo}#${ticket.id}`, ticket])));
  const itemHtml = (item) => {
    const ticket = sourceTickets.get(`${item.repo}#${item.id}`);
    const sourceStatus = ticket ? `No workflow · ${labelForStatus(ticket.status)}` : "Proposto · ainda não criado";
    const after = item.after?.length ? `Aceite após: ${item.after.join(" · ")}` : "Pode avançar em paralelo nesta etapa";
    return `<article class="plan-item"><span class="plan-repo" style="--repo:${projectColor(item.repo)}">${escapeHtml(displayRepo(item.repo))}</span><div class="plan-item-main"><div class="plan-item-top"><code>${escapeHtml(item.id)}</code><span class="plan-source-status${ticket ? " in-source" : ""}">${escapeHtml(sourceStatus)}</span></div><h4>${escapeHtml(item.action)}</h4><p>${escapeHtml(item.done)}</p><small>${escapeHtml(after)}</small></div>${ticket ? `<button class="plan-map-link" type="button" data-plan-repo="${escapeHtml(item.repo)}" data-plan-id="${escapeHtml(item.id)}">Ver no mapa ↗</button>` : ""}</article>`;
  };
  $("#plan-route").innerHTML = plan.phases.map((phase, index) => `<button class="route-card${index === 3 ? " route-goal" : ""}" type="button" data-route-index="${index}"><span class="route-top"><b>${escapeHtml(phase.number)}</b><span aria-hidden="true">↗</span></span><strong>${escapeHtml(phase.routeLabel ?? phase.title)}</strong><small>${escapeHtml(phase.routeOutcome ?? phase.exit)}</small></button>`).join("");
  $("#plan-phases").innerHTML = plan.phases.map((phase, index) => `<details class="plan-phase" ${index === 0 ? "open" : ""}><summary><span class="plan-phase-number">${escapeHtml(phase.number)}</span><span class="plan-phase-title"><strong>${escapeHtml(phase.title)}</strong><small>${escapeHtml(phase.parallel)}</small></span><span class="plan-phase-count">${phase.items.length} itens</span><span class="plan-chevron" aria-hidden="true">⌄</span></summary><div class="plan-phase-body"><div class="plan-exit"><span>ETAPA CONCLUÍDA QUANDO</span><strong>${escapeHtml(phase.exit)}</strong></div><div class="plan-items">${phase.items.map(itemHtml).join("")}</div></div></details>`).join("");
  const openPhase = (index) => {
    const details = $("#plan-phases").querySelectorAll(".plan-phase")[index];
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  $("#plan-route").querySelectorAll("[data-route-index]").forEach((button) => button.addEventListener("click", () => openPhase(Number(button.dataset.routeIndex))));
  $("#open-first-phase").addEventListener("click", () => openPhase(0));
  const future = plan.nextMilestone;
  $("#plan-next").innerHTML = `<div><p class="eyebrow">DEPOIS DE FISCAL PROD · ORDEM DE PRIORIDADE</p><h3>${escapeHtml(future.title)}</h3><p>Contas a receber e baixa manual formam o segundo marco. Esta sequência de prioridade não cria bloqueadores fiscais no workflow.</p></div><div class="plan-future-items">${future.items.map((item, index) => `<span><b>${index + 1}</b><code>${escapeHtml(item.id)}</code>${escapeHtml(item.action)}</span>`).join("")}</div>`;
  const groupHtml = (group) => `<details class="plan-archive-group"><summary>${escapeHtml(group.label)} <span>${group.ids.length}</span></summary><p>${group.ids.map((id) => `<code>${escapeHtml(id)}</code>`).join(" ")}</p></details>`;
  $("#plan-deferred").innerHTML = plan.deferred.map(groupHtml).join("");
  $("#plan-superseded").innerHTML = plan.superseded.map(groupHtml).join("");
  $("#plan-phases").querySelectorAll("[data-plan-id]").forEach((button) => button.addEventListener("click", () => {
    if (state.demoId) loadRealSnapshot();
    const node = state.graph.nodes.find((entry) => entry.repo === button.dataset.planRepo && entry.ticket.id === button.dataset.planId);
    if (node) { setView("map"); selectNode(node.uid, true); }
  }));
}

function renderScenarios() {
  const list = $("#scenario-list");
  list.innerHTML = Object.entries(state.fixtures).map(([id, fixture]) => `<button class="scenario-button${state.demoId === id ? " active" : ""}" type="button" data-scenario="${escapeHtml(id)}"><span class="scenario-glyph">◇</span><span><strong>${escapeHtml(fixture.title)}</strong><small>${escapeHtml(fixture.description)}</small></span><span aria-hidden="true">→</span></button>`).join("");
  list.querySelectorAll("[data-scenario]").forEach((button) => button.addEventListener("click", () => loadScenario(button.dataset.scenario)));
  if (state.demoId && state.fixtures[state.demoId]) {
    const fixture = state.fixtures[state.demoId];
    $("#scenario-notes").innerHTML = `<p class="eyebrow">CENÁRIO ATIVO</p><h3>${escapeHtml(fixture.title)}</h3><p>${escapeHtml(fixture.description)}</p><p>O mapa acima e a lista de liberação foram recalculados da fixture. As sugestões do snapshot real não foram reaproveitadas.</p><button class="button button-secondary" id="scenario-focus-graph" type="button">Ver cenário no grafo</button>`;
    $("#scenario-focus-graph").addEventListener("click", () => setView("map"));
  } else {
    $("#scenario-notes").innerHTML = `<p class="eyebrow">COMO VALIDAR</p><h3>Escolha um comportamento</h3><p>As fixtures são arquivos locais independentes. Execute <code>npm test</code> para conferir a lógica sem depender da renderização.</p><p class="scenario-warning">As fixtures não mudam nenhum dos três <code>workflow.json</code> capturados.</p>`;
  }
}
function loadScenario(id) {
  const fixture = state.fixtures[id];
  if (!fixture) return;
  state.demoId = id; state.demoLabel = fixture.title; state.selectedUid = null; resetFilters();
  const snapshot = { repositories: [{ owner: "demo", repo: "Demo", branch: "fixture", readStatus: "ok", workflow: { project: "Demonstração", tickets: fixture.tickets } }] };
  state.graph = analyzeGraph(snapshot, { relations: [] });
  elements.demoBanner.classList.remove("hidden");
  elements.demoTitle.textContent = fixture.title;
  elements.demoDescription.textContent = fixture.description;
  state.repoEnabled = new Set(["demo/Demo"]);
  clearDetailWithoutRender();
  prepareGraph();
  renderScenarios();
  setView("map");
}
function clearDetailWithoutRender() { elements.detailEmpty.classList.remove("hidden"); elements.detailContent.classList.add("hidden"); }
function loadRealSnapshot() {
  state.demoId = null; state.demoLabel = null; state.selectedUid = null; resetFilters(); state.graph = analyzeGraph(state.snapshot, state.sidecar);
  elements.demoBanner.classList.add("hidden");
  state.repoEnabled = new Set((state.snapshot.repositories ?? []).filter((record) => record.workflow).map(keyFor));
  clearDetailWithoutRender();
  prepareGraph();
  focusActiveTicket();
  renderScenarios();
  setView("map");
}
function resetFilters() {
  state.query = ""; state.status = "all"; state.situation = "all";
  $("#search").value = ""; $("#situation-filter").value = "all";
}
function prepareGraph() {
  state.viewBox = null;
  populateStatusFilter();
  renderRepoFilters();
  drawGraph();
  frameAll();
  updateSummary();
  renderIntegrity();
}

function focusActiveTicket() {
  const active = currentNodes().filter((node) => node.status === "in_progress").sort((a, b) => a.key.localeCompare(b.key));
  if (active.length !== 1) return;
  state.selectedUid = active[0].uid;
  renderDetails(active[0]);
  drawGraph();
  centerOnNode(active[0].uid);
  $("#map-caption").textContent = `Foco inicial no único ticket in_progress (${active[0].ticket.id}); não indica prioridade. “Enquadrar” mostra todo o grafo.`;
}

function updateSummary() {
  const nodes = currentNodes();
  const counts = (situation) => nodes.filter((node) => node.situation === situation).length;
  $("#total-tickets").textContent = String(nodes.length);
  $("#completed-count").textContent = String(nodes.filter((node) => node.status === "merged").length);
  $("#eligible-count").textContent = String(counts("eligible"));
  $("#waiting-count").textContent = String(counts("waiting"));
  $("#manual-blocked-count").textContent = String(counts("manual-blocked"));
  $("#repo-count").textContent = `${state.graph.repositories.length} fonte${state.graph.repositories.length === 1 ? "" : "s"}`;
  $("#ready-total").textContent = String(counts("eligible"));
  $("#graph-total").textContent = String(nodes.length);
  $("#result-count").textContent = String(currentMatches().length);
  const errors = state.graph.issues.length;
  $("#issue-total").textContent = String(errors);
  $("#integrity-summary").textContent = errors ? `${errors} problema(s) de integridade` : "Sem erros estruturais detectados";
  $("#integrity-summary").classList.toggle("has-issues", errors > 0);
  $("#map-caption").textContent = state.demoId ? "Fixture local ativa; os IDs não têm regra especial." : "Cada seta sólida vem de blockedBy. Relações pontilhadas são só sugestões.";
  if (state.demoId) $("#captured-at").textContent = "FIXTURE LOCAL · NÃO É CAPTURA";
  else $("#captured-at").textContent = `Capturado ${humanDate(state.snapshot.capturedAt)}`;
}

function renderIntegrity() {
  const graph = state.graph;
  const errorRows = graph.issues.map((issue) => {
    const associated = issue.uid ? graph.byUid.get(issue.uid) : null;
    return `<button class="integrity-row error-row" type="button" ${associated ? `data-integrity-uid="${escapeHtml(associated.uid)}"` : "disabled"}><span class="integrity-symbol">!</span><span><strong>${escapeHtml(issueLabels[issue.type] ?? "Erro")}</strong><small>${escapeHtml(issue.message)}</small></span><span class="severity-tag">erro</span></button>`;
  });
  const warnings = graph.warnings.map((warning) => `<div class="integrity-row warning-row"><span class="integrity-symbol">◇</span><span><strong>Relação textual sem aresta</strong><small>${escapeHtml(warning.message)}</small></span><span class="severity-tag">aviso</span></div>`);
  const changes = graph.repositories.flatMap((record) => {
    const delta = record.changes;
    if (!delta?.comparedToPreviousCapture) return [];
    const rows = [];
    for (const removed of delta.removedImpacts ?? []) {
      rows.push(`<div class="integrity-row warning-row"><span class="integrity-symbol">−</span><span><strong>Ticket removido: ${escapeHtml(removed.id)}</strong><small>${escapeHtml(removed.interpretation)} Referências afetadas na captura anterior: ${escapeHtml(removed.historicalReferences?.join(", ") || "nenhuma")}. Referências ainda não resolvidas: ${escapeHtml(removed.currentUnresolvedReferences?.join(", ") || "nenhuma")}.</small></span><span class="severity-tag">mudança</span></div>`);
    }
    for (const id of delta.addedIds ?? []) rows.push(`<div class="integrity-row change-row"><span class="integrity-symbol">＋</span><span><strong>Novo ticket: ${escapeHtml(record.repo)}#${escapeHtml(id)}</strong><small>Detectado nesta leitura por identidade composta; dependências vieram exclusivamente de blockedBy.</small></span><span class="severity-tag">novo</span></div>`);
    for (const change of delta.titleChanges ?? []) rows.push(`<div class="integrity-row change-row"><span class="integrity-symbol">↔</span><span><strong>Título alterado: ${escapeHtml(record.repo)}#${escapeHtml(change.id)}</strong><small>${escapeHtml(change.before ?? "sem título")} → ${escapeHtml(change.after ?? "sem título")}.</small></span><span class="severity-tag">título</span></div>`);
    return rows;
  });
  $("#integrity-list").innerHTML = errorRows.length || warnings.length || changes.length ? `${errorRows.join("")}${warnings.join("")}${changes.join("")}` : `<div class="integrity-ok"><span>✓</span><div><strong>Integridade estrutural sem erros</strong><small>IDs sem colisão por repositório, referências locais resolvidas e grafo acíclico nesta captura.</small></div></div>`;
  $("#integrity-list").querySelectorAll("[data-integrity-uid]").forEach((button) => button.addEventListener("click", () => { setView("map"); selectNode(button.dataset.integrityUid, true); }));
  const records = graph.repositories;
  $("#source-list").innerHTML = records.map((record) => `<article class="source-row"><span class="repo-swatch" style="--repo:${projectColor(record.repo)}"></span><div class="source-main"><strong>${escapeHtml(displayRepo(record.repo))} <span class="source-branch">${escapeHtml(record.branch ?? "branch indisponível")}</span></strong><small>${escapeHtml(record.path ?? ".workflow/workflow.json")} · ${record.readStatus === "ok" ? "lido" : record.readStatus === "stale" ? "captura anterior exibida" : "falha de leitura"} · ${escapeHtml(humanDate(record.commitAt))}</small><code>${escapeHtml(record.commit ?? record.readError ?? "sem commit lido")}</code></div>${record.sourceUrl ? `<a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noreferrer" aria-label="Abrir fonte ${escapeHtml(record.repo)}">↗</a>` : `<span class="source-error">!</span>`}</article>`).join("");
  const commitDates = records.filter((record) => record.commitAt).map((record) => new Date(record.commitAt).valueOf()).filter(Number.isFinite);
  const gapDays = commitDates.length > 1 ? Math.round((Math.max(...commitDates) - Math.min(...commitDates)) / 86400000) : 0;
  $("#freshness-label").textContent = gapDays > 1 ? `Commits separados por até ${gapDays} dias` : "Versões registradas por fonte";
  $("#freshness-label").classList.toggle("freshness-alert", gapDays > 1 || records.some((record) => record.readStatus !== "ok"));
  const suggestions = graph.suggestedEdges;
  $("#suggestion-count").textContent = `${suggestions.length} relações propostas`;
  $("#suggestion-list").innerHTML = suggestions.length ? suggestions.map((edge) => {
    const from = graph.byUid.get(edge.from); const to = graph.byUid.get(edge.to);
    return `<article class="suggestion-row"><span class="suggested-arrow">${escapeHtml(from?.ticket.id ?? "?")} <i>····→</i> ${escapeHtml(to?.ticket.id ?? "?")}</span><p>${escapeHtml(edge.relation.reason)}</p><small>${escapeHtml(edge.relation.evidence)}</small><span class="soft-badge">suggested</span></article>`;
  }).join("") : `<p class="empty-copy">Não há relações sugeridas nesta captura.</p>`;
  $("#integrity-count-large").textContent = String(graph.issues.length);
  $("#issue-total").textContent = String(graph.issues.length);
}

function renderProjectConfig() {
  const records = state.snapshot.repositories;
  const stored = localStorage.getItem("execution-map-project-config");
  if (stored) { try { state.projectConfig = JSON.parse(stored); } catch { state.projectConfig = {}; } }
  $("#project-config-list").innerHTML = records.map((record) => {
    const key = keyFor(record);
    const config = state.projectConfig[key] ?? { selected: true, space: "", branch: record.branch, path: record.path, exposure: "" };
    state.projectConfig[key] = config;
    return `<article class="project-config-row" data-project-config="${escapeHtml(key)}"><label class="project-included"><input type="checkbox" data-config-field="selected" ${config.selected ? "checked" : ""}><span><strong>${escapeHtml(record.owner)}/${escapeHtml(record.repo)}</strong><small>${escapeHtml(record.visibility ?? "visibilidade não verificada")} · commit ${escapeHtml((record.commit ?? "").slice(0, 8)) || "—"}</small></span></label><div class="project-config-fields"><label>Espaço<select data-config-field="space"><option value="" ${!config.space ? "selected" : ""}>Ainda não definido</option><option value="empresa" ${config.space === "empresa" ? "selected" : ""}>Empresa</option><option value="pessoal" ${config.space === "pessoal" ? "selected" : ""}>Pessoal</option></select></label><label>Branch<input data-config-field="branch" value="${escapeHtml(config.branch ?? "")}"></label><label>Caminho do workflow<input data-config-field="path" value="${escapeHtml(config.path ?? ".workflow/workflow.json")}"></label><label>Política de exposição<select data-config-field="exposure"><option value="" ${!config.exposure ? "selected" : ""}>Não definida</option><option value="public" ${config.exposure === "public" ? "selected" : ""}>Público</option><option value="internal" ${config.exposure === "internal" ? "selected" : ""}>Restrito / interno</option></select></label><small>Última leitura: ${escapeHtml(humanDate(record.capturedAt))} · ${record.readStatus === "ok" ? "ok" : "falhou"}</small></div></article>`;
  }).join("");
  $("#project-config-list").querySelectorAll("[data-project-config]").forEach((row) => row.querySelectorAll("[data-config-field]").forEach((input) => input.addEventListener("change", () => {
    const config = state.projectConfig[row.dataset.projectConfig];
    config[input.dataset.configField] = input.type === "checkbox" ? input.checked : input.value;
  })));
}

function bindInteractions() {
  $$(".view-tab").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  $("#search").addEventListener("input", (event) => {
    state.query = event.target.value;
    if (state.selectedUid) { state.selectedUid = null; clearDetailWithoutRender(); }
    refreshView();
    const matches = currentMatches();
    if (matches.length === 1) centerOnNode(matches[0].uid);
  });
  $("#status-filter").addEventListener("change", (event) => { state.status = event.target.value; refreshView(); });
  $("#situation-filter").addEventListener("change", (event) => { state.situation = event.target.value; refreshView(); });
  $("#clear-filters").addEventListener("click", () => {
    state.query = ""; state.status = "all"; state.situation = "all"; state.repoEnabled = new Set(allRepoKeys());
    $("#search").value = ""; $("#status-filter").value = "all"; $("#situation-filter").value = "all"; renderRepoFilters(); refreshView();
  });
  $("#zoom-in").addEventListener("click", () => zoom(1.25));
  $("#zoom-out").addEventListener("click", () => zoom(0.8));
  $("#fit-map").addEventListener("click", frameAll);
  $("#reset-map").addEventListener("click", () => { clearSelection(); frameAll(); });
  $("#return-real").addEventListener("click", loadRealSnapshot);
  $("#manage-projects").addEventListener("click", () => { renderProjectConfig(); $("#projects-dialog").showModal(); });
  $("#save-project-config").addEventListener("click", () => {
    localStorage.setItem("execution-map-project-config", JSON.stringify(state.projectConfig));
    $("#project-save-status").textContent = "Simulação salva neste navegador; nada foi enviado ao GitHub.";
    $("#project-save-status").classList.add("saved");
  });
  $("#refresh-snapshot").addEventListener("click", () => $("#snapshot-dialog").showModal());
  elements.viewport.addEventListener("wheel", (event) => {
    event.preventDefault(); const point = pointerToGraph(event); zoom(event.deltaY < 0 ? 1.12 : 0.89, point.x, point.y);
  }, { passive: false });
  elements.viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".ticket-node")) return;
    const point = pointerToGraph(event); state.panStart = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, point, original: { ...state.viewBox } };
    elements.viewport.setPointerCapture(event.pointerId);
  });
  elements.viewport.addEventListener("pointermove", (event) => {
    if (!state.panStart || state.panStart.pointerId !== event.pointerId) return;
    const rect = elements.svg.getBoundingClientRect();
    const dx = ((event.clientX - state.panStart.clientX) / rect.width) * state.viewBox.width;
    const dy = ((event.clientY - state.panStart.clientY) / rect.height) * state.viewBox.height;
    setViewBox({ ...state.panStart.original, x: state.panStart.original.x - dx, y: state.panStart.original.y - dy });
  });
  const endPan = (event) => { if (state.panStart?.pointerId === event.pointerId) state.panStart = null; };
  elements.viewport.addEventListener("pointerup", endPan);
  elements.viewport.addEventListener("pointercancel", endPan);
  elements.svg.addEventListener("click", (event) => { if (event.target === elements.svg || event.target === elements.content) clearSelection(); });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.selectedUid && !$("#projects-dialog").open && !$("#snapshot-dialog").open) clearSelection();
    if ((event.key === "+" || event.key === "=") && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) zoom(1.2);
    if (event.key === "-" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) zoom(0.83);
  });
}

async function init() {
  try {
    const [snapshotResponse, sidecarResponse, fixturesResponse, planResponse] = await Promise.all([
      fetch("./data/snapshot.json", { cache: "no-store" }), fetch("./data/proposed-relations.json", { cache: "no-store" }), fetch("./data/demo-fixtures.json", { cache: "no-store" }), fetch("./data/fiscal-plan.json", { cache: "no-store" }),
    ]);
    if (!snapshotResponse.ok || !sidecarResponse.ok || !fixturesResponse.ok || !planResponse.ok) throw new Error("Não foi possível ler os dados publicados.");
    [state.snapshot, state.sidecar, state.fixtures, state.plan] = await Promise.all([snapshotResponse.json(), sidecarResponse.json(), fixturesResponse.json(), planResponse.json()]);
    state.graph = analyzeGraph(state.snapshot, state.sidecar);
    state.repoEnabled = new Set((state.snapshot.repositories ?? []).filter((record) => record.workflow).map(keyFor));
    bindInteractions();
    prepareGraph();
    focusActiveTicket();
    renderScenarios();
    renderPlan();
    setView("plan");
  } catch (error) {
    $("#integrity-summary").textContent = `Falha ao carregar o painel: ${error.message}`;
    $("#integrity-summary").classList.add("has-issues");
    $(".metric-grid").innerHTML = `<div class="load-error"><strong>Não foi possível abrir a captura.</strong><p>Recarregue a página em alguns minutos. Se o problema continuar, confira a publicação do GitHub Pages.</p></div>`;
  }
}

init();
