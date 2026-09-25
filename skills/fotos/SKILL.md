---
name: fotos
description: "Tira preview dos blocos Gutenberg do tema WP atual — renderiza no front, screenshota (Chrome headless), salva PNG em <tema>/foto/; aprovado, vira preview.webp com fallback .svg. Use para \"tirar foto dos blocos\"/gerar thumbnails."
---

# /fotos — previews dos blocos do tema WordPress

Gera as imagens de preview (as que aparecem no inserter do Gutenberg) dos blocos do
tema **do projeto atual**. Fluxo com **portão de aprovação**: primeiro só PNGs em
`<tema>/foto/` para o usuário revisar; só depois converte para `.webp` e fia nos blocos.

## Pré-requisitos (verificar antes; se faltar, parar e avisar)
- WP-CLI: `wp` direto OU `lando wp` (detecte qual responde: `lando wp option get blogname` / `wp option get blogname`).
- Chrome do sistema: `/usr/bin/google-chrome` (ou `google-chrome`/`chromium`). Use `--version` p/ confirmar.
- `puppeteer-core`: instalar no tema sem sujar o package.json → `npm i puppeteer-core --no-save`.
- `cwebp` (libwebp) para a conversão final (`command -v cwebp`). Alternativa: `convert`/`magick`.
- O tema é Sage/Acorn-like: blocos em `resources/blocks/<slug>/` (block.json/php/jsx), views em
  `resources/views/blocks/<slug>.blade.php`, registro em `app/Blocks/BlockManager.php`. Adapte se a
  estrutura diferir; se não achar blocos, pare e pergunte.

## Convenções
- Pasta de saída: **`<tema>/foto/`** (raiz do tema). Crie se não existir. PNGs de revisão ficam aqui.
- `preview.svg` padrão (placeholder) — gere para TODO bloco que não tiver, com este template
  (trocando o título): caixa cinza tracejada + nome + "PREVIEW".
- Sistema de fallback: o `block.jsx` importa `preview.webp` e usa `<img onError>` para cair no
  `preview.svg`. **Mantém os dois arquivos.**

## Passo 1 — listar e confirmar (SEMPRE)
1. Liste os blocos do tema (`resources/blocks/*/` exceto `components/`).
2. Marque os que **já têm** `preview.webp` (não precisam) e os que precisam.
3. **Pergunte ao usuário** (AskUserQuestion) se a lista de alvos está certa, e o que pular
   (blocos de layout/vazios como `container`/`spacer`, ou os que devem manter só o svg como
   `rich-content`). Não tire foto de bloco vazio (sem conteúdo visível).
4. Garanta `preview.svg` (padrão acima) em todos os alvos que não tiverem.

## Passo 2 — página temporária "foto"
- Atalho: `bash <tema>/scripts/wp/sample-pages.sh` (via `lando wp`) cria uma página "Kit sample" por categoria de bloco a partir do `example` de cada `block.json`, mais a página de style guide — dá para fotografar direto nelas.
- Monte/atualize uma página WP **`foto`** (rascunho publicado) com **1 instância de cada bloco-alvo**,
  cada um com **`anchor` = `foto-<slug>`** (o tema injeta isso como `id` no elemento raiz; se não
  injetar, envolva cada bloco num wrapper com esse id). Use os defaults de cada bloco.
- Blocos "bare"/primitivos (heading, text, badge, etc.) ficam estreitos: envolva num `container`
  (fundo claro) com o `anchor` no container, para enquadrar melhor.
- Crie/atualize via wp-cli passando o conteúdo em `--post_content` (o container do Lando não lê `/tmp`
  do host; passe inline com `"$(cat arquivo)"`).
- Garanta que blocos com imagem venham **completos**: se o default não tem imagem, use a imagem de
  exemplo branded do tema (ex.: `public/.../exemplo.webp`) como fallback no Blade — nunca `<img src="">`.

## Passo 3 — screenshots (PNG) e PARAR para aprovação
- Escreva o script abaixo no tema (`.shoot.cjs`) e rode `node .shoot.cjs <URL-da-pagina-foto>`.
- Ele auto-descobre todos os `[id^="foto-"]`, esconde o header fixo (evita vazamento no topo) e
  salva `<tema>/foto/<slug>.png`.
- **PARE aqui.** Avise o usuário para revisar os PNGs em `<tema>/foto/`. Enquanto não aprovar, NÃO
  converta nada. Se ele pedir refazer algum, ajuste o bloco/conteúdo e re-rode o script.

```js
// .shoot.cjs — node .shoot.cjs http://site.lndo.site/foto/
const puppeteer = require('puppeteer-core');
const path = require('path');
const URL = process.argv[2];
const OUT = path.join(process.cwd(), 'foto');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--hide-scrollbars'],
    defaultViewport: { width: 1440, height: 1200, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
  await page.addStyleTag({ content: 'header[data-header],header.banner,#wpadminbar{display:none !important}' });
  await sleep(2000);
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[id^="foto-"]')).map((el) => el.id));
  let ok = 0; const fail = [];
  for (const id of ids) {
    const el = await page.$('#' + id);
    if (!el) { fail.push(id); continue; }
    await el.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await sleep(500);
    try { await el.screenshot({ path: path.join(OUT, id.replace(/^foto-/, '') + '.png') }); ok++; }
    catch (e) { fail.push(id + ':' + e.message); }
  }
  await browser.close();
  console.log('OK=' + ok + ' FAIL=' + (fail.length ? JSON.stringify(fail) : '0'));
})();
```

## Passo 4 — (APÓS aprovação) converter e fiar
1. Para cada `foto/<slug>.png` cujo bloco existe: `cwebp -quiet -q 82 foto/<slug>.png -o resources/blocks/<slug>/preview.webp`.
2. Em cada `block.jsx` que use `src={previewImage}`: garanta
  `import previewImage from './preview.webp';` + `import previewFallback from './preview.svg';` e
  `<img src={previewImage} onError={(e)=>{e.currentTarget.src=previewFallback;}} ... />`.
  Se o bloco NÃO tem webp, importe o svg em `previewImage` e não adicione fallback.
  (Use `perl -0pi` para regex confiável; `sed -E` trata `\|` como pipe literal — não use alternância com `\|`.)
3. Blocos sem `isPreview` (ex.: `button`/`container`): adicione o atributo `isPreview` + `"example": {"attributes":{"isPreview":true}}` no block.json e o early-return de preview no jsx (após os hooks, respeitando as Regras de Hooks).
4. `npm run build`. Verifique: nenhum `onError` sem o respectivo `import previewFallback`.
5. Limpe o temporário: `rm .shoot.cjs`. Reporte quais blocos ficaram sem webp.

## Verificação (ground-truth)
- Confirme por render real (abrir 2-3 PNGs) que os blocos saíram completos (com conteúdo/imagem) e
  sem o header vazando no topo.
- Após a fase 4, build verde e grep confirmando consistência import↔onError.
