// Confere, no Edge headless, que a política de conteúdo do build (CSP, app/vite.config.ts) não quebra o jogo:
// 1) uma partida inteira (as redes ONNX palpitam, o Zé cai na reserva) sem violação de CSP;
// 2) o modo Mão carrega o MediaPipe (wasm e modelo da mão) com uma câmera FALSA, sem violação de CSP.
// Registra também todo host contatado: o que não for localhost/127.0.0.1 é conexão bloqueada ou vazamento.
// Precisa do jogo servido em http://localhost:4173 (npm --prefix app run build e preview).
// Uso: node scripts/conferir_politica_de_conteudo.mjs [pasta-de-capturas] [segundos-de-espera-da-telemetria]
// O registro de uso do MediaPipe dispara a cada 60 s: use 75 para ver a CSP bloqueando-o.
// Limite honesto: a câmera falsa do Edge é uma imagem de teste sem mão; isto prova que o modelo carrega e o
// laço de detecção roda, não que os gestos funcionam (isso exige webcam e mão de verdade, tarefa 5.1).
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const saida = process.argv[2];
const ESPERA_DA_TELEMETRIA_S = Number(process.argv[3] ?? 0);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORTA = 9300 + Math.floor(Math.random() * 500);
const URL_DO_JOGO = "http://localhost:4173/";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
if (saida) mkdirSync(saida, { recursive: true });

const perfil = mkdtempSync(join(tmpdir(), "edge-csp-"));
const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`,
  "--window-size=1366,768", "--hide-scrollbars", "--mute-audio",
  "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "about:blank"], { stdio: "ignore" });

async function alvo() {
  for (let i = 0; i < 50; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
      const pagina = lista.find((t) => t.type === "page");
      if (pagina) return pagina.webSocketDebuggerUrl;
    } catch { /* ainda subindo */ }
    await espera(200);
  }
  throw new Error("Edge não abriu a porta de depuração");
}

const ws = new WebSocket(await alvo());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pendentes = new Map();
const hosts = new Map(); // host -> quantidade de requisições
const erros = []; // console.error e exceções
const bloqueios = []; // requisições que o navegador bloqueou (CSP)
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pendentes.has(msg.id)) { pendentes.get(msg.id)(msg); pendentes.delete(msg.id); return; }
  if (msg.method === "Network.requestWillBeSent") {
    const url = new URL(msg.params.request.url);
    if (url.protocol === "http:" || url.protocol === "https:") hosts.set(url.host, (hosts.get(url.host) ?? 0) + 1);
  } else if (msg.method === "Network.loadingFailed" && msg.params.blockedReason) {
    bloqueios.push(`${msg.params.blockedReason}: ${msg.params.requestId}`);
  } else if (msg.method === "Runtime.exceptionThrown") {
    erros.push(`exceção: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    erros.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    erros.push(`log(${msg.params.entry.source}): ${msg.params.entry.text} ${msg.params.entry.url ?? ""}`);
  }
});
const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; pendentes.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
async function js(expressao) {
  const r = await cdp("Runtime.evaluate", { expression: `(async () => { ${expressao} })()`, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
}
async function foto(nome) {
  if (!saida) return;
  const f = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(saida, nome), Buffer.from(f.result.data, "base64"));
}

await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Log.enable");
await cdp("Network.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
// Registra as violações de CSP antes de qualquer script da página rodar.
await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `
  window.__violacoes = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__violacoes.push(e.violatedDirective + ' bloqueou ' + (e.blockedURI || '(inline/eval)')));
` });
await cdp("Page.navigate", { url: URL_DO_JOGO });
await espera(6000);

const resultado = { csp: await js(`return document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null;`) };
resultado.abertura = await js(`return { tela: [...document.querySelectorAll('[data-tela]')].filter(t=>!t.hidden).map(t=>t.dataset.tela).join(','), violacoes: window.__violacoes.length };`);

// 1) Partida: abertura -> apelido -> charada -> desenho no modo Mouse -> veredito.
await js(`document.querySelector('[data-acao=jogar-agora]').click();`);
await espera(1500);
await js(`const c=document.querySelector('[data-campo=apelido]'); c.value='CSP'; c.dispatchEvent(new Event('input'));`);
await js(`document.querySelector('[data-acao=jogar]').click();`);
await espera(4000);
await js(`document.querySelector('[data-acao=desenhar]').click();`);
await espera(1500);
await js(`const cv=document.querySelector('canvas.quadro'), r=cv.getBoundingClientRect();
  const t=(pts)=>{const ev=(ty,[x,y])=>cv.dispatchEvent(new PointerEvent(ty,{clientX:r.left+x*r.width,clientY:r.top+y*r.height,pointerId:1,bubbles:true})); ev('pointerdown',pts[0]); pts.slice(1).forEach(p=>ev('pointermove',p)); ev('pointerup',pts.at(-1));};
  t([[.15,.45],[.5,.15],[.85,.45]]); t([[.2,.42],[.2,.85],[.8,.85],[.8,.42]]);`);
await espera(2500);
resultado.palpites = await js(`return [...document.querySelectorAll('[data-lista=palpites] li')].map(li => li.textContent.trim());`);
await foto("1-palpites-com-csp.png");
await js(`document.querySelector('[data-acao=pronto]').click();`);
await espera(4500);
resultado.veredito = await js(`return { tela: [...document.querySelectorAll('[data-tela]')].filter(t=>!t.hidden).map(t=>t.dataset.tela).join(','), narracao: document.querySelector('[data-texto=narracao]')?.textContent ?? null };`);
resultado.violacoesDaPartida = await js(`return [...window.__violacoes];`);

// 2) Modo Mão: nova rodada, escolhe "Mão" na tela de desenho e espera o MediaPipe carregar.
await js(`document.querySelector('[data-acao=proxima]').click();`);
await espera(4000);
await js(`document.querySelector('[data-acao=desenhar]').click();`);
await espera(1500);
await js(`[...document.querySelectorAll('[data-modo=mao]')].find(b => b.offsetParent !== null).click();`);
let miniatura = null;
for (let i = 0; i < 40 && !miniatura?.visivel; i++) {
  await espera(500);
  miniatura = await js(`const m = document.querySelector('[data-parte=miniatura]'); return { visivel: m !== null && !m.hidden, gesto: document.querySelector('[data-texto=gesto]')?.textContent ?? null, aviso: (() => { const a = document.querySelector('[data-texto=aviso-camera]'); return a && !a.hidden ? a.textContent : null; })() };`);
  if (miniatura.aviso) break;
}
await espera(3000); // deixa o laço de detecção rodar alguns quadros
resultado.modoMao = { ...miniatura, gestoDepois: await js(`return document.querySelector('[data-texto=gesto]')?.textContent ?? null;`),
  video: await js(`const v = document.querySelector('video.video-da-camera'); return v ? { largura: v.videoWidth, altura: v.videoHeight, pronto: v.readyState } : null;`) };
await foto("2-modo-mao-com-csp.png");
if (ESPERA_DA_TELEMETRIA_S > 0) await espera(ESPERA_DA_TELEMETRIA_S * 1000);
resultado.violacoesTotais = await js(`return [...window.__violacoes];`);
// A telemetria do MediaPipe (odml.pa.googleapis.com) é o bloqueio que a CSP existe para fazer; qualquer outra
// violação é um recurso do jogo que a política está quebrando.
resultado.violacoesInesperadas = resultado.violacoesTotais.filter((v) => !v.includes("odml.pa.googleapis.com"));
resultado.hosts = Object.fromEntries(hosts);
resultado.errosDoConsole = erros;
resultado.requisicoesBloqueadas = bloqueios;

console.log(JSON.stringify(resultado, null, 2));
ws.close();
edge.kill();
process.exit(0);
