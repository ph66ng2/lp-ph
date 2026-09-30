# Plano de execução atual — AutoOS Fiscal PROD

**Objetivo:** uma OS real da BMITAG chega à revisão humana, gera uma NFS-e e uma NF-e reais quando seus itens exigem os dois documentos, recebe o resultado, guarda XML e documento auxiliar e mantém o vínculo auditável na OS.

**Atualização em 30 set. 2026:** os PRs de roadmap AutoOS #102, AutoPlatform #10 e AutoBO #9 foram mesclados; `AO-WF-RECONCILE-001` está concluído. O próximo ticket AutoOS é **`AO-SUITE-001`**. O PR AutoOS #101, de Insumos Online, foi mesclado e corresponde ao ticket histórico `AO-INS-ONLINE-001`; não é uma etapa nova da trilha Fiscal. A captura factual foi atualizada em 30 set. após esses PRs; o texto de inventário do escopo técnico ainda descreve a auditoria original de 29 set. A reconciliação adicional do catálogo AutoOS foi mesclada; o status foi registrado pelo PR #104. `Após` nas tabelas é uma **dependência para aceite**; as relações externas ainda pedem revisão humana.

**Roadmaps já mesclados:** [AutoOS #102](https://github.com/ph66ng2/AutoOs/pull/102) · [AutoPlatform #10](https://github.com/ph66ng2/AutoPlatform/pull/10) · [AutoBO #9](https://github.com/ph66ng2/AutoBO/pull/9). O plano central está em [AutoPlatform `.workflow/FISCAL_PROD_ROADMAP.md`](https://github.com/ph66ng2/AutoPlatform/blob/main/.workflow/FISCAL_PROD_ROADMAP.md). A reconciliação adicional do AutoOS foi mesclada no [PR #103](https://github.com/ph66ng2/AutoOs/pull/103). O [PR #104](https://github.com/ph66ng2/AutoOs/pull/104) registrou o status `merged` do ticket de reconciliação.

## Comece por aqui

1. **Iniciar pelo AutoOS:** `AO-SUITE-001` define ownership do Core. A reconciliação dos três roadmaps foi concluída; `AP-INV-001` ainda precisa ser lido no workflow atual do AutoPlatform, pois a captura aqui é antiga. Não marcar tickets adiados como `blocked` ou `merged` para simular prioridade.
2. **Fechar duas decisões em paralelo:** AutoOS é a autoridade de cliente, produto, serviço e estoque para este produto (`AO-SUITE-001`); a contabilidade entrega a matriz fiscal aprovada para a operação real (`AP-FISC-ACCOUNTING-EXT-001`). Ambos têm ticket no workflow; a matriz contábil continua `blocked` por condição externa.
3. **Versionar o contrato faturável (`AP-CONTRACT-002`):** validar com uma OS representativa que o snapshot contém cliente, estabelecimento, itens, quantidades, valores e dados fiscais necessários. Preservar o v1. Só então fechar a interface entre produtor e receptor.
4. **Abrir três frentes paralelas:** AutoOS produz o snapshot (`AO-SUITE-002`); AutoPlatform o recebe de forma idempotente (`AP-INTEGRATION-001` redefinido); AutoPlatform constrói o núcleo fiscal (`AP-FISC-CORE-001` sem depender de `AP-SALE-001`). Integrar essas frentes em homologação antes do piloto.

As etapas seguintes aparecem abaixo. O caminho é **parcialmente paralelo**; a ordem das linhas não cria dependência entre tickets.

## 1. Base e contrato — preparar a entrada fiscal

| Item | Repo | Após, para aceite | Pronto quando |
|---|---|---|---|
| `AO-WF-RECONCILE-001` **no workflow** | AutoOs | nenhum bloqueador técnico | Os três PRs de roadmap são revisados em conjunto e classificações ficam explícitas sem falsificar status. |
| Reconciliar `AP-INV-001` | AutoPlatform | merge e evidências do PR #9 | O workflow reflete o estado validado; o trabalho restante de estoque fica identificado separadamente. Esta conciliação não bloqueia a construção do contrato fiscal. |
| `AO-SUITE-001` **no workflow** | AutoOs | decisão de produto | Existe uma matriz de autoridade para cliente, produto, serviço, estoque, equipamento e OS, com impacto nos dados já existentes. |
| `AP-FISC-ACCOUNTING-EXT-001` existente, `blocked` | AutoPlatform + contabilidade | obtenção externa da matriz fiscal | A matriz da BMITAG foi validada pela contabilidade e vinculada aos cenários de serviço, mercadoria e operação mista. |
| `AP-CONTRACT-002` **no workflow** | AutoPlatform | `AO-SUITE-001` para aprovação final | `FatoComercial` v2 versionado e validado com exemplos reais de OS; v1 continua compatível. Snapshot faturável imutável e identificável por origem/versão. |

**Decisão de contrato:** modelar a OS como origem do fato, com cliente e itens copiados no momento faturável. Identificadores, valores, descontos, estabelecimento e dados fiscais necessários devem ser confirmados por exemplos e pela matriz contábil. Definir correção por nova versão ou evento, sem mutação silenciosa do snapshot já entregue ao Fiscal.

## 2. Produzir, receber e calcular — três frentes paralelas

| Item | Repo | Após, para aceite | Pronto quando |
|---|---|---|---|
| `AO-SUITE-002` **no workflow** | AutoOs | `AO-SUITE-001`, `AP-CONTRACT-002` | Uma OS faturável produz exatamente um snapshot v2 identificável; reprocessamento e alteração da OS têm regra explícita. |
| `AP-INTEGRATION-001` **redefinir** | AutoPlatform | `AP-CONTRACT-002`, `AP-ID-001`, `AP-OBS-001` | A API autentica empresa, valida v2, persiste o fato, rejeita repetição conflitante e devolve um ID estável; logs preservam correlação. |
| `AP-FISC-CORE-001` **reconectar** | AutoPlatform | `AP-CONTRACT-002` | O núcleo recebe fato faturável sem exigir `AP-SALE-001` ou estoque central. Possui resultado e falhas rastreáveis por documento. |

O desenvolvimento do núcleo pode começar com exemplos versionados do contrato. A **integração real** exige produtor, ingestão e núcleo compatíveis; isso não obriga os três tickets a uma sequência artificial.

## 3. Emissão e operação — duas frentes paralelas

**AutoPlatform, emissão:** `AP-FISC-CONFIG-001` depende para aceite do núcleo e da matriz contábil. `AP-FISC-NFSE-001` e `AP-FISC-NFE-001` seguem em paralelo após a configuração. Certificados, credenciais e políticas do emissor permanecem no backend.

**AutoOS, experiência operacional:** a fila `AO-FISC-001` segue `AO-SUITE-002`; a revisão `AO-FISC-002` segue a fila. `AO-FISC-003` liga o AutoOS à ingestão do AutoPlatform e pode ser construída com contratos e respostas simuladas enquanto os adapters avançam. `AO-FISC-004` mostra estado e rejeições, `AO-FISC-005` expõe XML e documentos, e `AO-FISC-006` cria o vínculo consultável na OS. Os três últimos podem avançar em paralelo após a interface de retorno estar definida.

| Verificação conjunta | Evidência necessária |
|---|---|
| Fluxo de dados | OS → snapshot v2 → ingestão idempotente → pedido de emissão → resultado correlacionado. |
| Revisão humana | A tela separa serviço e mercadoria, permite confirmar o que será emitido e explica erro corrigível sem criar cobrança duplicada. |
| Documentos | XML e documento auxiliar são recuperáveis por autorização adequada e associados à OS e ao fato de origem. |

## 4. Gates — provar antes de chamar de PROD

| Gate | Após, para aceite | Evidência |
|---|---|---|
| `AP-FISC-GATE-001` existente | ambos adapters e observabilidade | Homologação fiscal no backend, com retorno, rejeição, consulta e cancelamento conforme o ambiente e os provedores escolhidos. |
| `AO-FISC-GATE-001` **no workflow** | `AO-FISC-001` a `006` e `AP-FISC-GATE-001` | Orçamento → OS → snapshot → revisão → emissão → retorno → documentos → histórico da OS em homologação integrada. |
| `AP-FISC-PROD-001` **no workflow** | os dois gates, matriz aprovada e operação controlada | Piloto BMITAG com **uma NFS-e e uma NF-e reais**, quando aplicáveis aos exemplos escolhidos; consulta, XML, documento auxiliar, vínculo com OS, rejeição tratável e idempotência demonstrada. Cancelamento deve ser validado no ambiente apropriado antes de considerá-lo coberto. |

**Marco 1: Fiscal PROD BMITAG.** A frase “NF-e e/ou NFS-e” descreve o que cada OS individual pode exigir; o critério do marco pede evidência dos **dois tipos** no conjunto do piloto. Se a empresa quiser lançar só um tipo primeiro, divida o gate em dois marcos explícitos antes de mudar o DAG.

## 5. Depois do marco fiscal — Financeiro v1

Prioridade seguinte, não dependência técnica implícita dos tickets fiscais:

1. `AP-REC-001` **novo:** contas a receber com origem no fato comercial, valor original, recebido, vencimento e estados verificáveis.
2. `AP-REC-002` **novo:** registrar recebimento manual, mantendo trilha de alterações e evitando baixa repetida.
3. `AO-FIN-001` **novo:** consultar a receber, vencido e recebido no AutoOS.

**Marco 2: Produto interno completo** quando OS, documentos fiscais, conta a receber e baixa manual podem ser acompanhados ponta a ponta. Billing de assinatura, entitlement, onboarding, Mobile Field e integrações bancárias ficam em fases posteriores. **PowerSync pertence apenas ao possível futuro Mobile Field; não é parte do desktop AutoOS.**

## Tratamento do roadmap anterior

**Adiar por prioridade, preservando status real:** assinatura e fotos do AutoOS, venda/estoque central/SaaS/expansão do AutoPlatform e estoque/venda/produto separado do AutoBO. Os IDs estão em [`data/fiscal-plan.json`](./data/fiscal-plan.json), campo `deferred`. `AO-AUTH-OPS-001` foi acrescentado como pendência de provisionamento produtivo. `AP-INV-001` exige conciliação de estado, enquanto `AP-INV-CUTOVER-001` fica adiado. `AP-MIG-001` precisa de decisão específica: confirmar se o piloto depende de algum dado histórico antes de incluí-lo ou adiá-lo.

**Substituir com rastreabilidade, sem apagar histórico:** `AO-PS-005/006/007/008` e `AO-SUB-004/005` descreviam PowerSync/Offline no desktop. O [PR #99](https://github.com/ph66ng2/AutoOs/pull/99) foi fechado sem merge; nenhum desses tickets foi marcado concluído por isso. Também ficam substituídos os seis tickets fiscais do AutoBO, cinco tickets `BO-SUITE-*` de integração entre desktops e os dois gates antigos `AP-INTEGRATION-GATE-001`/`AP-PRODUCT-SYNC-EXT-001`. Os IDs estão em `data/fiscal-plan.json`, campo `superseded`. `BO-AUTH-001` e entregas já concluídas permanecem como histórico. AutoBO continua fonte de regras e código a avaliar para migração.

| Entrega antiga | Destino proposto |
|---|---|
| `BO-FISC-CORE-001` | `AP-FISC-CORE-001` e `AO-FISC-003` |
| `BO-FISC-EXT-001`, `BO-FISC-NFE-001` | `AP-FISC-NFSE-001`, `AP-FISC-NFE-001` e revisão em `AO-FISC-002` |
| `BO-FISC-UI-001` | `AO-FISC-001` e `AO-FISC-002` |
| `BO-FISC-STATUS-001` | `AO-FISC-004`, `AO-FISC-005` e `AO-FISC-006` |
| `BO-FISC-GATE-001` | `AP-FISC-GATE-001`, `AO-FISC-GATE-001` e piloto `AP-FISC-PROD-001` |

## Auditoria histórica das mudanças propostas nos DAGs

| Fonte atual | Mudança proposta | Cuidado |
|---|---|---|
| `AP-FISC-CORE-001` depende de `AP-SALE-001` e `AP-CONTRACT-001` | Fazer depender de `AP-CONTRACT-002` | Preservar as fundações já `merged` como evidência; remover `AP-SALE-001` do caminho fiscal somente por mudança revisada no workflow. |
| `AP-INTEGRATION-001` descreve AutoOS ↔ AutoBO e depende de venda standalone | Redefinir como ingestão de `FatoComercial` v2 do AutoOS | Trocar título, objetivo, aceite e dependências juntos; não reaproveitar o ID mudando só o nome. |
| `AP-INV-001` consta `in_progress` após merge do PR #9 | Reconciliar evidências e estado | Merge de PR não autoriza inferir que todo o aceite do ticket foi cumprido. |
| `AP-FISC-CONFIG-001` já espera núcleo e matriz; `AP-FISC-GATE-001` já espera ambos adapters | Manter e revisar seus critérios | Não transformar espera contábil em bloqueio artificial do núcleo provider-neutral. |
| Tickets novos AutoOS/AutoPlatform ainda não existem | Criar com IDs, critérios, testes e `blockedBy` locais após revisão | Relações entre repositórios precisam de contrato versionado e suporte nos planejadores antes de reger “pode começar”. |

O mapa deve oferecer **estado declarado**, **elegibilidade técnica** e **prioridade de roadmap** como três informações diferentes. Os cinco tickets tecnicamente liberados na captura atual não pertencem ao caminho Fiscal PROD. Nenhum deles deve virar `blocked` apenas por ter sido adiado.

## Escopo do Execution Map com esta direção

- **Agora, no protótipo:** mostrar a captura factual atual e uma visão do plano. Cada item mostra se já existe no workflow, seu status declarado e seus pré-requisitos **propostos**. Tickets ausentes da captura não viram nós falsos; links para o mapa só aparecem quando o ticket existe.
- **Para operar o plano de verdade:** executar `AO-SUITE-001`, aprovar ownership e contrato, e implementar as dependências externas confirmadas entre projetos; depois reler os commits e recalcular o mapa.
- **Depois:** autenticação, edição por PR, atualização por backend/webhook, espaços Empresa/Pessoal e domínios continuam no escopo do produto mapa, mas não bloqueiam o piloto Fiscal interno.

**Regra de atualização:** a visão de prioridade continua neste arquivo lateral. Reexecutar `refresh_snapshot.py` lê os workflows atuais; só dependências incorporadas por merge se tornam arestas confirmadas. Após novos merges, atualizar a captura e as ressalvas deste arquivo. A tabela de auditoria histórica acima permanece como registro de decisão, não como instrução nova.
