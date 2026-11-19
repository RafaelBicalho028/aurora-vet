// Monta o site público em site-dist/: página de apresentação (site/index.html) + jogo (dist/) em jogo.html.
// Uso: npm run build && node scripts/build-site.mjs   (ou: npm run build:site)
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

const OUT = 'site-dist';
if (!existsSync('dist/index.html')) {
  console.error('dist/ não encontrado: rode "npm run build" antes.');
  process.exit(1);
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// jogo: o build completo, com a página do jogo renomeada para jogo.html
cpSync('dist', OUT, { recursive: true });
renameSync(`${OUT}/index.html`, `${OUT}/jogo.html`);

// apresentação: site/index.html é escrito no formato de página do claude.ai (sem <head>); aqui ganha o documento completo
const src = readFileSync('site/index.html', 'utf8');
const cut = src.indexOf('<header class="top">');
if (cut < 0) throw new Error('site/index.html: <header class="top"> não encontrado');
const base = '<style>html{-webkit-text-size-adjust:100%}body{margin:0}img{max-width:100%}[hidden]{display:none!important}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>\n';
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Aurora Vet: Jornada Veterinária — RPG educacional gratuito para estudantes de Medicina Veterinária. Jogue no navegador, no celular ou no computador.">
<link rel="icon" href="icon.svg">
${base}${src.slice(0, cut)}</head>
<body>
${src.slice(cut)}</body>
</html>
`;
writeFileSync(`${OUT}/index.html`, html);
cpSync('site/img', `${OUT}/img`, { recursive: true });
// GitHub Pages: não processar com Jekyll
writeFileSync(`${OUT}/.nojekyll`, '');
console.log(`Site montado em ${OUT}/ (index.html = apresentação, jogo.html = jogo).`);
