// Joga uma partida no Edge headless (protocolo de depuração do navegador) e salva uma captura de cada
// tela, medindo rolagem e o humor do Zé. Precisa do jogo servido em http://localhost:4173 (npm --prefix app
// run build e preview). Uso: node scripts/capturar_telas.mjs docs/capturas/tinta-cinetica 1366 768 [reduzido]
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [saida, largura, altura, modo] = process.argv.slice(2);
const W = Number(largura), H = Number(altura), reduzido = modo === "reduzido";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORTA = 9300 + Math.floor(Math.random() * 500);
const URL_DO_JOGO = "http://localhost:4173/";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(saida, { recursive: true });

const perfil = mkdtempSync(join(tmpdir(), "edge-cdp-"));
const edge = spawn(EDGE, [`--headless=new`, `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`,
  `--window-size=${W},${H}`, "--hide-scrollbars", "--mute-audio",
  // Câmera falsa (imagem de teste, sem mão): só serve para a miniatura do modo Mão aparecer na captura 4c.
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
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pendentes.has(msg.id)) { pendentes.get(msg.id)(msg); pendentes.delete(msg.id); }
});
const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; pendentes.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
async function js(expressao) {
  const r = await cdp("Runtime.evaluate", { expression: `(async () => { ${expressao} })()`, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
}
const relatorio = [];
async function capturar(nome) {
  const medida = await js(`return { tela: [...document.querySelectorAll('[data-tela]')].filter(t=>!t.hidden).map(t=>t.dataset.tela).join(','), rolagemV: document.documentElement.scrollHeight > innerHeight, rolagemH: document.documentElement.scrollWidth > innerWidth, pincelada: document.querySelector('.pincelada')?.classList.contains('vai') ?? false, rabiscos: document.querySelectorAll('.fundo-de-rabiscos path').length, humor: document.querySelector('[data-tela]:not([hidden]) .ze-svg')?.dataset.humor ?? null };`);
  const foto = await cdp("Page.captureScreenshot", { format: "png" });
  const arquivo = `${W}x${H}${reduzido ? "-reduzido" : ""}-${nome}.png`;
  writeFileSync(join(saida, arquivo), Buffer.from(foto.result.data, "base64"));
  relatorio.push({ arquivo, ...medida });
}

await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
if (reduzido) await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await cdp("Page.navigate", { url: URL_DO_JOGO });
await espera(6000);
await capturar("1-abertura");

await js(`document.querySelector('[data-acao=jogar-agora]').click();`);
await espera(1500);
await js(`const c=document.querySelector('[data-campo=apelido]'); c.value='Juninho'; c.dispatchEvent(new Event('input'));`);
await espera(500);
await capturar("2-apelido");

await js(`document.querySelector('[data-acao=jogar]').click();`);
await espera(400);
await espera(3500);
await capturar("3b-charada");

const DESENHAR_CASA = `const cv=document.querySelector('canvas.quadro'), r=cv.getBoundingClientRect();
  const t=(pts)=>{const ev=(ty,[x,y])=>cv.dispatchEvent(new PointerEvent(ty,{clientX:r.left+x*r.width,clientY:r.top+y*r.height,pointerId:1,bubbles:true})); ev('pointerdown',pts[0]); pts.slice(1).forEach(p=>ev('pointermove',p)); ev('pointerup',pts.at(-1));};
  t([[.15,.45],[.5,.15],[.85,.45]]); t([[.2,.42],[.2,.85],[.8,.85],[.8,.42]]); t([[.43,.85],[.43,.62],[.57,.62],[.57,.85]]);`;
for (let rodada = 1; rodada <= 3; rodada++) {
  await js(`document.querySelector('[data-acao=desenhar]').click();`);
  await espera(1500);
  if (rodada !== 2) await js(DESENHAR_CASA);
  await espera(2500);
  if (rodada === 1) {
    await capturar("4-desenho");
    await js(`document.querySelector('[data-ferramenta=borracha]').click();`);
    await capturar("4b-desenho-borracha");
    // Modo Mão no meio da rodada (traços mantidos): confere que a miniatura não cria rolagem. Volta ao Mouse.
    await js(`[...document.querySelectorAll('[data-modo=mao]')].find((b) => b.offsetParent !== null).click();`);
    for (let i = 0; i < 40; i++) {
      await espera(500);
      if (await js(`const m = document.querySelector('[data-parte=miniatura]'); return m !== null && !m.hidden;`)) break;
    }
    await espera(1000);
    await capturar("4c-desenho-mao");
    await js(`[...document.querySelectorAll('[data-modo=mouse]')].find((b) => b.offsetParent !== null).click();`);
    await espera(500);
  }
  await js(`document.querySelector('[data-acao=pronto]').click();`);
  await espera(4500);
  if (rodada === 1) await capturar("5a-veredito");
  if (rodada === 2) await capturar("5b-veredito-sem-desenho");
  if (rodada === 3) await capturar("5c-veredito-ultima-rodada");
  await js(`document.querySelector('[data-acao=proxima]').click();`);
  await espera(4000);
}
await capturar("6-placar");

writeFileSync(join(saida, `${W}x${H}${reduzido ? "-reduzido" : ""}-relatorio.json`), JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio));
ws.close();
edge.kill();
process.exit(0);
