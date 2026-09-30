export const KNOWN_STATUSES = new Set(["ready", "blocked", "in_progress", "review", "merged"]);

export function identityKey({ owner, repo, id }) {
  return `${owner}/${repo}#${id}`;
}

function repoKey(record) {
  return `${record.owner}/${record.repo}`;
}

function ticketCompare(a, b) {
  return String(a.ticket.id ?? "").localeCompare(String(b.ticket.id ?? ""), "en", { numeric: true }) || a.uid.localeCompare(b.uid);
}

export function flattenSnapshot(snapshot) {
  return (snapshot?.repositories ?? []).flatMap((record) => {
    const repo = repoKey(record);
    const workflow = record.workflow;
    return (workflow?.tickets ?? []).map((ticket, index) => ({
      uid: `${repo}#${ticket?.id ?? "(sem ID)"}${index ? `::row${index}` : ""}`,
      key: `${repo}#${ticket?.id ?? "(sem ID)"}`,
      owner: record.owner,
      repo: record.repo,
      repoId: repo,
      branch: record.branch,
      sourceUrl: record.sourceUrl,
      sourceRecord: record,
      ticket,
      sourceIndex: index,
      status: typeof ticket?.status === "string" ? ticket.status : "(sem status)",
      blockers: Array.isArray(ticket?.blockedBy) ? ticket.blockedBy : [],
      errors: [],
      rank: 0,
    }));
  });
}

function addNodeError(node, issue) {
  if (node && !node.errors.some((existing) => existing.type === issue.type && existing.message === issue.message)) {
    node.errors.push(issue);
  }
}

function stronglyConnectedComponents(nodes, edges) {
  const outgoing = new Map(nodes.map((node) => [node.uid, []]));
  for (const edge of edges) outgoing.get(edge.from)?.push(edge.to);
  let cursor = 0;
  const index = new Map();
  const low = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  function visit(uid) {
    index.set(uid, cursor);
    low.set(uid, cursor++);
    stack.push(uid);
    onStack.add(uid);
    for (const next of outgoing.get(uid) ?? []) {
      if (!index.has(next)) {
        visit(next);
        low.set(uid, Math.min(low.get(uid), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(uid, Math.min(low.get(uid), index.get(next)));
      }
    }
    if (low.get(uid) === index.get(uid)) {
      const members = [];
      let next;
      do {
        next = stack.pop();
        onStack.delete(next);
        members.push(next);
      } while (next !== uid);
      components.push(members);
    }
  }
  for (const node of nodes) if (!index.has(node.uid)) visit(node.uid);
  return components;
}

export function analyzeGraph(snapshotOrRecords, sidecar = { relations: [] }) {
  const repositories = Array.isArray(snapshotOrRecords) ? snapshotOrRecords : (snapshotOrRecords?.repositories ?? []);
  const nodes = flattenSnapshot({ repositories });
  const issues = [];
  const warnings = [];
  const repoById = new Map(repositories.map((record) => [repoKey(record), record]));
  const byRepoId = new Map();
  for (const node of nodes) {
    const group = byRepoId.get(node.key) ?? [];
    group.push(node);
    byRepoId.set(node.key, group);
  }
  const pushIssue = (issue) => {
    issues.push(issue);
    if (issue.uid) addNodeError(nodes.find((node) => node.uid === issue.uid), issue);
  };

  for (const record of repositories) {
    if (record.readStatus === "error" || record.readStatus === "stale") {
      const issue = {
        type: record.readStatus === "stale" ? "stale-source" : "read-error",
        severity: "error",
        repoId: repoKey(record),
        message: record.readStatus === "stale"
          ? `${repoKey(record)}: leitura falhou; exibindo a captura anterior (${record.readError ?? "erro de leitura"}).`
          : `${repoKey(record)}: falha de leitura (${record.readError ?? "erro desconhecido"}).`,
      };
      issues.push(issue);
      for (const node of nodes.filter((item) => item.repoId === repoKey(record))) addNodeError(node, issue);
    }
  }

  for (const node of nodes) {
    if (!node.ticket?.id) pushIssue({ type: "missing-id", severity: "error", uid: node.uid, message: `${node.repo}: ticket sem id.` });
    if (!node.ticket?.title) pushIssue({ type: "missing-title", severity: "error", uid: node.uid, message: `${node.key}: título ausente.` });
    if (!KNOWN_STATUSES.has(node.status)) pushIssue({ type: "unknown-status", severity: "error", uid: node.uid, message: `${node.key}: estado desconhecido “${node.status}”.` });
  }
  for (const [key, group] of byRepoId) {
    if (group.length > 1) {
      const issue = { type: "duplicate-id", severity: "error", message: `${key}: ID duplicado ${group.length} vezes.` };
      issues.push(issue);
      for (const node of group) addNodeError(node, issue);
    }
  }

  const edges = [];
  for (const node of nodes) {
    for (const blockedBy of node.blockers) {
      const key = `${node.repoId}#${blockedBy}`;
      const matches = byRepoId.get(key) ?? [];
      if (matches.length === 0) {
        pushIssue({ type: "missing-reference", severity: "error", uid: node.uid, message: `${node.key}: blockedBy aponta para ID ausente ${blockedBy}.` });
      } else if (matches.length > 1) {
        pushIssue({ type: "ambiguous-reference", severity: "error", uid: node.uid, message: `${node.key}: blockedBy ${blockedBy} é ambíguo por ID duplicado.` });
      } else {
        edges.push({ from: matches[0].uid, to: node.uid, type: "confirmed", source: "blockedBy", external: false });
      }
    }
  }

  // Cross-repository links affect order/readiness only after an explicit sidecar entry is confirmed.
  for (const relation of sidecar?.relations ?? []) {
    if (relation.state !== "confirmed") continue;
    const fromKey = identityKey(relation.from ?? {});
    const toKey = identityKey(relation.to ?? {});
    const from = byRepoId.get(fromKey) ?? [];
    const to = byRepoId.get(toKey) ?? [];
    if (from.length !== 1 || to.length !== 1) {
      pushIssue({ type: "bad-confirmed-relation", severity: "error", message: `Dependência confirmada ${fromKey} → ${toKey} tem endpoint ausente ou ambíguo.` });
      continue;
    }
    edges.push({ from: from[0].uid, to: to[0].uid, type: "confirmed", source: "sidecar", external: from[0].repoId !== to[0].repoId, relation });
  }

  const suggestedEdges = [];
  for (const relation of sidecar?.relations ?? []) {
    if (relation.state !== "suggested") continue;
    const fromKey = identityKey(relation.from ?? {});
    const toKey = identityKey(relation.to ?? {});
    const from = byRepoId.get(fromKey) ?? [];
    const to = byRepoId.get(toKey) ?? [];
    if (from.length !== 1 || to.length !== 1) {
      warnings.push({ type: "unresolved-suggestion", severity: "warning", message: `Relação sugerida ${fromKey} → ${toKey} não foi desenhada: endpoint ausente ou ambíguo.` });
      continue;
    }
    suggestedEdges.push({ from: from[0].uid, to: to[0].uid, type: "suggested", external: from[0].repoId !== to[0].repoId, relation });
  }
  for (const item of sidecar?.unresolvedMentions ?? []) {
    warnings.push({ type: "unresolved-mention", severity: "warning", message: `${item.source?.repo ?? "Workflow"} ${item.source?.id ?? ""}: referência textual ${item.mention} sem aresta desenhada — ${item.reason}` });
  }

  const components = stronglyConnectedComponents(nodes, edges);
  const componentOf = new Map();
  components.forEach((members, index) => members.forEach((uid) => componentOf.set(uid, index)));
  const componentEdges = new Map(components.map((_, index) => [index, new Set()]));
  const componentIndegree = new Map(components.map((_, index) => [index, 0]));
  for (const edge of edges) {
    const from = componentOf.get(edge.from);
    const to = componentOf.get(edge.to);
    if (from !== to && !componentEdges.get(from).has(to)) {
      componentEdges.get(from).add(to);
      componentIndegree.set(to, componentIndegree.get(to) + 1);
    }
  }
  const cyclicComponents = new Set();
  components.forEach((members, index) => {
    if (members.length > 1 || edges.some((edge) => edge.from === members[0] && edge.to === members[0])) cyclicComponents.add(index);
  });
  for (const index of cyclicComponents) {
    const members = components[index];
    const names = members.map((uid) => nodes.find((node) => node.uid === uid)?.key ?? uid).sort().join(", ");
    const memberSet = new Set(members);
    const cycleEdges = edges.filter((edge) => memberSet.has(edge.from) && memberSet.has(edge.to));
    const edgeList = cycleEdges.map((edge) => `${nodes.find((node) => node.uid === edge.from)?.ticket.id} → ${nodes.find((node) => node.uid === edge.to)?.ticket.id}`).join(", ");
    const issue = { type: "cycle", severity: "error", message: `Ciclo entre ${names}; arestas participantes: ${edgeList}.`, uids: members, edges: cycleEdges };
    issues.push(issue);
    for (const uid of members) addNodeError(nodes.find((node) => node.uid === uid), issue);
  }
  const queue = [...componentIndegree].filter(([, degree]) => degree === 0).map(([index]) => index);
  const componentRank = new Map(components.map((_, index) => [index, 0]));
  for (let head = 0; head < queue.length; head += 1) {
    const from = queue[head];
    for (const to of componentEdges.get(from)) {
      componentRank.set(to, Math.max(componentRank.get(to), componentRank.get(from) + 1));
      componentIndegree.set(to, componentIndegree.get(to) - 1);
      if (componentIndegree.get(to) === 0) queue.push(to);
    }
  }
  for (const node of nodes) node.rank = componentRank.get(componentOf.get(node.uid)) ?? 0;

  const incoming = new Map(nodes.map((node) => [node.uid, []]));
  const outgoing = new Map(nodes.map((node) => [node.uid, []]));
  for (const edge of edges) {
    incoming.get(edge.to)?.push(edge);
    outgoing.get(edge.from)?.push(edge);
  }
  const stateByUid = new Map(nodes.map((node) => [node.uid, repoById.get(node.repoId)?.readStatus ?? "ok"]));
  for (const node of nodes) {
    const predecessors = incoming.get(node.uid) ?? [];
    const predecessorNodes = predecessors.map((edge) => nodes.find((candidate) => candidate.uid === edge.from));
    const stalePredecessor = predecessors.some((edge) => stateByUid.get(edge.from) !== "ok");
    const invalidPredecessor = predecessorNodes.some((predecessor) => !predecessor || predecessor.errors.length > 0 || !KNOWN_STATUSES.has(predecessor.status));
    const allMerged = predecessorNodes.every((predecessor) => predecessor?.status === "merged");
    if (node.status === "merged") node.situation = "completed";
    else if (node.status === "blocked") node.situation = "manual-blocked";
    else if (node.status === "ready" && (node.errors.length > 0 || stalePredecessor || invalidPredecessor || stateByUid.get(node.uid) !== "ok")) node.situation = "data-error";
    else if (node.status === "ready" && allMerged) node.situation = "eligible";
    else if (node.status === "ready") node.situation = "waiting";
    else if (node.status === "review") node.situation = "in-review";
    else if (node.status === "in_progress") node.situation = "in-progress";
    else node.situation = "unknown";
    node.incoming = predecessors;
    node.outgoing = outgoing.get(node.uid) ?? [];
  }

  return {
    nodes, edges, suggestedEdges, issues, warnings, repositories,
    byUid: new Map(nodes.map((node) => [node.uid, node])),
    byKey: byRepoId,
    incoming, outgoing,
  };
}

export function layoutGraph(graph, options = {}) {
  const nodeWidth = options.nodeWidth ?? 174;
  const nodeHeight = options.nodeHeight ?? 64;
  const colGap = options.colGap ?? 222;
  const rowGap = options.rowGap ?? 78;
  const top = 78;
  const laneGap = 100;
  const repoOrder = graph.repositories.map(repoKey);
  const repoGroups = new Map(repoOrder.map((id) => [id, new Map()]));
  for (const node of graph.nodes) {
    if (!repoGroups.has(node.repoId)) repoGroups.set(node.repoId, new Map());
    const ranks = repoGroups.get(node.repoId);
    const layer = ranks.get(node.rank) ?? [];
    layer.push(node);
    ranks.set(node.rank, layer);
  }
  let laneOffset = 0;
  let maxRank = 0;
  const lanes = [];
  const positions = new Map();
  for (const repoId of repoGroups.keys()) {
    const ranks = repoGroups.get(repoId);
    for (const layer of ranks.values()) layer.sort(ticketCompare);
    const maxCount = Math.max(1, ...[...ranks.values()].map((layer) => layer.length));
    const laneHeight = top + maxCount * rowGap + laneGap;
    lanes.push({ repoId, y: laneOffset, height: laneHeight, name: graph.repositories.find((record) => repoKey(record) === repoId)?.workflow?.project ?? repoId });
    for (const [rank, layer] of ranks) {
      maxRank = Math.max(maxRank, rank);
      layer.forEach((node, index) => positions.set(node.uid, {
        x: 154 + rank * colGap,
        y: laneOffset + top + index * rowGap,
        width: nodeWidth,
        height: nodeHeight,
        rank,
      }));
    }
    laneOffset += laneHeight;
  }
  return { positions, lanes, width: Math.max(1000, 154 + maxRank * colGap + nodeWidth + 150), height: Math.max(700, laneOffset + 20), nodeWidth, nodeHeight };
}

export function neighborhood(graph, selectedUid) {
  if (!selectedUid || !graph.byUid.has(selectedUid)) return new Set();
  const seen = new Set([selectedUid]);
  const visit = (start, map) => {
    const stack = [...(map.get(start) ?? []).map((edge) => map === graph.incoming ? edge.from : edge.to)];
    while (stack.length) {
      const uid = stack.pop();
      if (seen.has(uid)) continue;
      seen.add(uid);
      stack.push(...(map.get(uid) ?? []).map((edge) => map === graph.incoming ? edge.from : edge.to));
    }
  };
  visit(selectedUid, graph.incoming);
  visit(selectedUid, graph.outgoing);
  return seen;
}
