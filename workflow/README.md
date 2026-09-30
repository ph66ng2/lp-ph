# Mapa de execução

Publicado em <https://phmedeiros.dev/workflow/> pelo GitHub Pages deste repositório. A página principal de `phmedeiros.dev` permanece em `/`.

O arquivo `data/snapshot.json` reúne os tickets de `AutoOs@feature`, `AutoBO@main` e `AutoPlatform@main`. A Action `Atualizar mapa de execução` consulta os três workflows a cada 30 minutos e só grava uma nova captura quando o conteúdo de algum workflow ou o estado de leitura muda. O push da captura aciona a publicação do GitHub Pages. A Action também pode ser iniciada manualmente na aba Actions.

O mapa lê dados publicados ao abrir a página; recarregue o navegador para ver uma captura nova. O plano Fiscal PROD em `data/fiscal-plan.json` é uma recomendação editorial e requer revisão humana quando os workflows mudam. O próprio painel mostra um aviso se a captura for posterior à revisão do plano.

Se uma fonte falhar, a última captura disponível dela continua visível e é marcada como desatualizada. A Action registra falha nesse caso.
