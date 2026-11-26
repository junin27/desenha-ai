/* Landing viva (protótipo 16). Uma linha do tempo GSAP pausada conta a história; a rodinha, as setas e o toque
   movem um "alvo" de tempo, e parado ela anda sozinha. Transições = mergulho (zoom através de um objeto que vira
   a próxima cena) ou afastamento (a cena encolhe para dentro de um objeto da próxima). */
gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, SplitText);

const CORES = ["#b5401f", "#c98a00", "#2f7d32", "#3d6c9e"];
const SEGUNDOS_PARADO_PARA_AUTOPLAY = 4;
const SEGUNDOS_POR_PIXEL_DA_RODINHA = 0.006;
const SEGUNDOS_POR_TECLA = 3;
const SEGUNDOS_NO_FIM_ANTES_DE_RECOMECAR = 10;
const SUAVIZACAO = 0.08;
const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const raioDaTela = () => Math.hypot(innerWidth, innerHeight);

/* ---------- Zé: clona o SVG do jogo e troca os ids internos para não colidirem ---------- */
function criarZe(lugar, humor, sufixo) {
  const svg = $("#tpl-ze").content.querySelector("svg").cloneNode(true);
  svg.id = `ze-${sufixo}`;
  svg.setAttribute("class", `ze-svg humor-${humor}`);
  svg.querySelectorAll("[id]").forEach((el) => { el.id = `${el.id}-${sufixo}`; });
  svg.querySelectorAll("[fill^='url(#']").forEach((el) => el.setAttribute("fill", el.getAttribute("fill").replace(")", `-${sufixo})`)));
  $(lugar).prepend(svg);
  return svg;
}

/* ---------- Partículas de tinta (toon: bolinha com contorno) e rastro do mouse ---------- */
const tela = $("#particulas"), ctx = tela.getContext("2d"), rastro = $("#rastro"), cr = rastro.getContext("2d");
const particulas = [], pontosDoRastro = [];
function ajustarTelas() { for (const c of [tela, rastro]) { c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; } }
function explodirTinta(x, y, quantidade, forca = 14) {
  const d = devicePixelRatio;
  for (let i = 0; i < quantidade; i++) {
    const a = Math.random() * Math.PI * 2, v = (4 + Math.random() * forca) * d;
    particulas.push({ x: x * d, y: y * d, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4 * d, r: (4 + Math.random() * 9) * d, cor: CORES[i % 4], vida: 1 });
  }
}
function pintarParticulas() {
  ctx.clearRect(0, 0, tela.width, tela.height);
  ctx.lineWidth = 2.5 * devicePixelRatio; ctx.strokeStyle = "#2b1a0a";
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.vy += .5 * devicePixelRatio; p.x += p.vx; p.y += p.vy; p.vx *= .985; p.vida -= .012;
    if (p.vida <= 0 || p.y > tela.height + 40) { particulas.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, p.vida * 1.5); ctx.fillStyle = p.cor;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function pintarRastro() {
  const agora = performance.now();
  cr.clearRect(0, 0, rastro.width, rastro.height);
  while (pontosDoRastro.length && agora - pontosDoRastro[0].t > 500) pontosDoRastro.shift();
  cr.lineCap = cr.lineJoin = "round"; cr.strokeStyle = "#b5401f";
  for (let i = 1; i < pontosDoRastro.length; i++) {
    const a = pontosDoRastro[i - 1], b = pontosDoRastro[i], vida = 1 - (agora - b.t) / 500;
    cr.globalAlpha = vida * .8; cr.lineWidth = (3 + 12 * vida) * devicePixelRatio;
    cr.beginPath(); cr.moveTo(a.x, a.y); cr.lineTo(b.x, b.y); cr.stroke();
  }
  cr.globalAlpha = 1;
}
addEventListener("pointermove", (e) => pontosDoRastro.push({ x: e.clientX * devicePixelRatio, y: e.clientY * devicePixelRatio, t: performance.now() }));

/* ---------- Peças montadas por código ---------- */
const CAMINHO_DO_SOL = "M0 -48 C27 -48 48 -27 48 0 C48 27 27 48 0 48 C-27 48 -48 27 -48 0 C-48 -27 -27 -48 0 -48";
const RAIOS = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; });
function montarRaios() {
  $("#raios").innerHTML = RAIOS.map(([c, s]) => `<path class="traco raio" d="M${c * 64} ${s * 64} L${c * 92} ${s * 92}"/>`).join("");
}
function rasterizarSol() {
  // Mesmo espírito do pré-processamento do jogo: desenho cabe numa caixa de 22 px dentro de 28×28
  const c = document.createElement("canvas"); c.width = c.height = 28;
  const g = c.getContext("2d"), escala = 22 / 184;
  g.translate(14, 14); g.scale(escala, escala); g.lineWidth = 1.6 / escala; g.lineCap = "round"; g.strokeStyle = "#000";
  g.stroke(new Path2D(CAMINHO_DO_SOL));
  for (const [x, y] of RAIOS) { g.beginPath(); g.moveTo(x * 64, y * 64); g.lineTo(x * 92, y * 92); g.stroke(); }
  const alfa = g.getImageData(0, 0, 28, 28).data;
  return Array.from({ length: 784 }, (_, i) => alfa[i * 4 + 3] / 255);
}
function pintarMapa(canvas, valores, lado, [r, gr, b]) {
  canvas.width = canvas.height = lado;
  const g = canvas.getContext("2d"), img = g.createImageData(lado, lado), maximo = Math.max(...valores, 1e-6);
  valores.forEach((v, i) => {
    const k = Math.max(0, v) / maximo;
    img.data.set([255 - (255 - r) * k, 253 - (253 - gr) * k, 246 - (246 - b) * k, 255], i * 4);
  });
  g.putImageData(img, 0, 0);
}
function convoluir(entrada, nucleo) {
  const saida = [];
  for (let y = 1; y < 27; y++) for (let x = 1; x < 27; x++) {
    let soma = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) soma += entrada[(y + j) * 28 + x + i] * nucleo[(j + 1) * 3 + i + 1];
    saida.push(soma);
  }
  return saida;
}
function montarCNN() {
  const sol = rasterizarSol();
  pintarMapa($("#grade"), sol, 28, [43, 26, 10]);
  const nucleos = [[-1, -1, -1, 2, 2, 2, -1, -1, -1], [-1, 2, -1, -1, 2, -1, -1, 2, -1], [2, -1, -1, -1, 2, -1, -1, -1, 2], [1, 1, 1, 1, -8, 1, 1, 1, 1].map((v) => -v)];
  const cores = [[181, 64, 31], [201, 138, 0], [47, 125, 50], [61, 108, 158]];
  $("#pilha").innerHTML = nucleos.map(() => `<div class="plano"><canvas></canvas></div>`).join("");
  $$("#pilha canvas").forEach((cv, i) => pintarMapa(cv, convoluir(sol, nucleos[i]), 26, cores[i]));
  $$("#pilha .plano").forEach((p, i) => gsap.set(p, { x: i * 22, y: i * 30, z: -i * 70, rotationY: -32, transformOrigin: "50% 50%" }));
  const palpites = [["sol", 82], ["flor", 9], ["lua", 4]];
  $("#barras-cnn").innerHTML = palpites.map(([c, p]) => `<li data-p="${p}"><span class="barra"></span><span>${c}</span><span>${p}%</span></li>`).join("");
}
function montarLSTM() {
  $("#contas").insertAdjacentHTML("beforeend", Array.from({ length: 14 }, () => `<circle r="7" cx="0" cy="-48"/>`).join(""));
  const entradas = ["(Δx, Δy, ✎)", "(Δx, Δy, ✎)", "(Δx, Δy, ↑)", "(Δx, Δy, ✎)", "(Δx, Δy, ✎)", "…"];
  $("#corrente").innerHTML = entradas.map((e) => `<div class="celula">LSTM<em>${e}</em></div>`).join("");
  $("#corrente").insertAdjacentHTML("afterend", `<div class="memoria"><i></i></div>`);
  $("#s-lstm .memoria").style.zIndex = 1;
}
const TOKENS = ["Ô", " trem", " bão", ",", " sô", "!", " Isso", " aí", " é", " um", " SOL", "!", " ☀"];
function montarTokens() { $("#balao-tokens").innerHTML = TOKENS.map((t) => `<span class="token">${t}</span>`).join(""); }
function montarGotas() { $("#gotas").innerHTML = Array.from({ length: 10 }, () => "<i></i>").join(""); }
function montarPesos() {
  $("#pesos").insertAdjacentHTML("afterbegin", Array.from({ length: 60 }, () => `<div class="peso"></div>`).join(""));
}
function montarBits() {
  $("#bits").innerHTML = Array.from({ length: 16 }, (_, i) => `<i>${"0110100110111010"[i]}</i>`).join("");
}
const HEXAGONOS = [["domínio<br>regras do jogo", 0, 0, "centro"], ["redes<br>ONNX", 0, -1], ["Zé<br>llama.cpp", .866, -.5, "", "hex-ze"],
  ["mão<br>MediaPipe", .866, .5], ["telas", 0, 1], ["placar", -.866, .5], ["aplicação", -.866, -.5]];
function montarHexagonos() {
  const caixa = $("#hexagonos"), largura = caixa.clientWidth, altura = caixa.clientHeight, lado = innerWidth * .13;
  caixa.innerHTML = HEXAGONOS.map(([texto, dx, dy, classe = "", id = ""]) => {
    const x = largura / 2 + dx * lado * .9 - lado / 2, y = altura / 2 + dy * lado * .82 - lado * .5;
    return `<div class="hex ${classe}" ${id ? `id="${id}"` : ""} style="left:${x}px;top:${y}px"><span>${texto}</span></div>`;
  }).join("");
}

/* ---------- Geometria das transições ---------- */
function centroDe(sel) { const r = $(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function telaParaCaixa({ x, y }) {
  // viewBox 1600×900 com "slice": converte pixels da tela em coordenadas da camada de tinta
  const s = Math.max(innerWidth / 1600, innerHeight / 900);
  return { x: (x - (innerWidth - 1600 * s) / 2) / s, y: (y - (innerHeight - 900 * s) / 2) / s };
}
const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
let tempoAnterior = 0, pontosDaDestilacao = null;
const soIndoPraFrente = (fn) => () => { if (tl.time() >= tempoAnterior) fn(); };

// O ponto de foco é medido na hora em que a transição começa (valores-função do GSAP são avaliados no 1º render
// do tween): assim o objeto já está no lugar final, depois de todas as animações de entrada da cena.
/* ---------- Portal: corte por correspondência ----------
   A cena de DENTRO aparece já encaixada no OBJETO da cena de FORA (a âncora de dentro casa com o objeto de fora:
   o sol desenhado vira a grade de pixels, a janela da casa mostra a mesa...). Depois uma única "câmera" escala as
   duas juntas até a de dentro ocupar a tela. Matemática: P0 põe "dentro" sobre o objeto (escala s0); a câmera
   C(u) amplia por s0^-u em torno do objeto e o leva ao lugar da âncora; em u = 1, C∘P0 = identidade. */
const PREVIA = .5, DURACAO_DO_PORTAL = 1.7, VIDEO = { largura: 1280, altura: 720 };
const easePortal = gsap.parseEase("power2.inOut");
function retDoVideo({ x, y, w, h }) {
  // object-fit: cover do vídeo de fundo -> coordenadas de tela
  const s = Math.max(innerWidth / VIDEO.largura, innerHeight / VIDEO.altura);
  const ox = (innerWidth - VIDEO.largura * s) / 2, oy = (innerHeight - VIDEO.altura * s) / 2;
  return { x: ox + x * s, y: oy + y * s, w: w * s, h: h * s };
}
const JANELA_DA_CASA = { x: 225, y: 374, w: 22.5, h: 30 }; // medida nos pixels do vídeo da roça (1280×720)
function medirSemTransformar(el) {
  // mede fora da "câmera": zera só a transformação da cena (a do portal) e restaura. As do próprio elemento
  // ficam (o título, por exemplo, é centralizado com translate -50%).
  const cena = el.closest(".cena"), salvo = cena?.style.transform;
  if (cena) cena.style.transform = "none";
  const r = el.getBoundingClientRect();
  if (cena) cena.style.transform = salvo;
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
function medir(spec) {
  if (!spec) return { x: 0, y: 0, w: innerWidth, h: innerHeight, forma: "ret" };
  if (typeof spec === "function") return { forma: "ret", ...spec() };
  const { sel, forma = "ret", canto = 18 } = typeof spec === "string" ? { sel: spec } : spec;
  return { ...medirSemTransformar($(sel)), forma, canto };
}
function geometriaDoPortal(objeto) {
  // O objeto vira a PRÓXIMA TELA INTEIRA: assim, quando a câmera termina, a cena nova cobre a tela sem bordas.
  // A tela "cobre" o objeto; o recorte começa no formato do objeto (círculo = canto de meio lado) e se abre
  // até o retângulo da tela, sempre dentro da cena nova: nunca aparece borda de "cartão".
  const O = medir(objeto), W = innerWidth, H = innerHeight;
  const oc = { x: O.x + O.w / 2, y: O.y + O.h / 2 }, ac = { x: W / 2, y: H / 2 };
  const s0 = Math.max(O.w / W, O.h / H);
  const ox = oc.x - s0 * ac.x, oy = oc.y - s0 * ac.y;
  const canto = O.forma === "circulo" ? Math.min(O.w, O.h) / 2 : (O.canto ?? 18);
  const L = { l: (O.x - ox) / s0, t: (O.y - oy) / s0, w: O.w / s0, h: O.h / s0, canto: canto / s0 };
  return { W, H, oc, ac, s0, ox, oy, L };
}
function aplicarPortal(fora, dentro, G, u, opacidade) {
  const z = Math.pow(G.s0, -u), Tx = G.oc.x + (G.ac.x - G.oc.x) * u, Ty = G.oc.y + (G.ac.y - G.oc.y) * u, k = z * G.s0;
  fora.style.transform = `matrix(${z},0,0,${z},${Tx - z * G.oc.x},${Ty - z * G.oc.y})`;
  dentro.style.transform = `matrix(${k},0,0,${k},${z * (G.ox - G.oc.x) + Tx},${z * (G.oy - G.oc.y) + Ty})`;
  const e = easePortal(gsap.utils.clamp(0, 1, (u - .3) / .7)), f = 1 - e, L = G.L;
  dentro.style.clipPath = `inset(${L.t * f}px ${(G.W - L.l - L.w) * f}px ${(G.H - L.t - L.h) * f}px ${L.l * f}px round ${L.canto * f}px)`;
  if (u >= 1) { dentro.style.clipPath = "none"; dentro.style.transform = "none"; fora.style.transform = "none"; }
  dentro.style.opacity = opacidade;
}
function portal({ fora, dentro, objeto, t, sentido = "entrar" }) {
  const elFora = $(fora), elDentro = $(dentro), progresso = { r: 0 };
  let G = null;
  const total = DURACAO_DO_PORTAL + PREVIA, fase = PREVIA / total;
  const atualizar = () => {
    G ??= geometriaDoPortal(objeto); // medido na 1ª vez que a câmera chega aqui: tudo já no lugar
    const r = progresso.r;
    if (sentido === "entrar") aplicarPortal(elFora, elDentro, G, r < fase ? 0 : easePortal((r - fase) / (1 - fase)), Math.min(1, r / fase));
    else aplicarPortal(elFora, elDentro, G, 1 - easePortal(Math.min(1, r / (1 - fase))), r < 1 - fase ? 1 : 1 - (r - (1 - fase)) / fase);
  };
  if (sentido === "entrar") tl.set(elDentro, { autoAlpha: 1, zIndex: 2 }, t).set(elFora, { zIndex: 1 }, t);
  else tl.set(elFora, { autoAlpha: 1, zIndex: 1 }, t).set(elDentro, { zIndex: 2 }, t);
  tl.fromTo(progresso, { r: 0 }, { r: 1, duration: total, ease: "none", immediateRender: false, onUpdate: atualizar }, t)
    .set(sentido === "entrar" ? elFora : elDentro, { autoAlpha: 0 }, t + total);
}
function cartao(cena, entra, sai) {
  const c = `${cena} .cartao`, letras = new SplitText(`${c} h2`, { type: "chars,words" }).chars;
  const palavras = new SplitText(`${c} p:not(.sobre)`, { type: "words" }).words;
  tl.from(c, { x: -90, rotation: -4, opacity: 0, duration: .6, ease: "back.out(1.6)" }, entra)
    .from(letras, { yPercent: 110, opacity: 0, rotate: () => gsap.utils.random(-20, 20), duration: .5, ease: "back.out(2)", stagger: .02 }, entra + .2)
    .from(palavras, { y: 16, opacity: 0, duration: .35, stagger: .012 }, entra + .45)
    .to(c, { x: -70, opacity: 0, duration: .4, ease: "power2.in" }, sai);
}
const atualizadores = [];
function contar(sel, de, ate, inicio, fim, formatar = (v) => Math.round(v).toLocaleString("pt-BR")) {
  atualizadores.push((t) => { $(sel).textContent = formatar(de + (ate - de) * gsap.utils.clamp(0, 1, (t - inicio) / (fim - inicio))); });
}

/* ---------- Cenas ---------- */
function cenaAbertura() {
  tl.addLabel("s-abertura", 0)
    .from("#gota", { y: -560, duration: .6, ease: "power2.in" }, .2)
    .to("#gota", { morphSVG: "#forma-mancha", duration: .4, ease: "back.out(2.5)" }, .8)
    .call(soIndoPraFrente(() => explodirTinta(innerWidth / 2, innerHeight / 2, 60, 18)), null, .8)
    .to("#mancha-abertura", { scale: 1.75, svgOrigin: "800 450", duration: .4, ease: "power1.inOut" }, 1.1)
    .set("#t-titulo", { visibility: "visible" }, 1.1)
    .from(new SplitText("#t-titulo", { type: "chars,words" }).chars, { yPercent: 130, opacity: 0, rotate: () => gsap.utils.random(-25, 25),
      duration: .7, ease: "back.out(2.2)", stagger: .03 }, 1.1)
    .to("#mancha-abertura", { scale: 1.85, svgOrigin: "800 450", duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, 1.6);
}
function cenaRoca() {
  tl.addLabel("s-roca", 6.2)
    .fromTo("#s-roca .fundo-video", { scale: 1.12 }, { scale: 1, transformOrigin: "22.5% 52%", duration: 5, ease: "power2.out" }, 5.2)
    .from("#ze-roca", { yPercent: 120, duration: .8, ease: "back.out(1.5)" }, 6.5);
  cartao("#s-roca", 6.3, 11.2);
}
function cenaCaderno() {
  tl.addLabel("s-caderno", 13)
    .from(".folha", { y: 80, rotation: 8, opacity: 0, duration: .7, ease: "back.out(1.4)" }, 13)
    .from("#lapis", { y: -300, opacity: 0, duration: .5, ease: "back.out(1.6)" }, 13.5)
    .fromTo("#sol-circulo", { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.8, ease: "power1.inOut" }, 13.9)
    .to("#lapis", { motionPath: { path: "#sol-circulo", align: "#sol-circulo", alignOrigin: [.5, .5] }, duration: 1.8, ease: "power1.inOut" }, 13.9)
    .fromTo("#raios .raio", { drawSVG: "0%" }, { drawSVG: "100%", duration: .15, stagger: .13, ease: "none" }, 15.7)
    .call(soIndoPraFrente(() => { const c = centroDe("#f-sol"); explodirTinta(c.x, c.y, 30, 9); }), null, 16.8)
    .to("#lapis", { x: 160, y: -160, rotation: 20, opacity: 0, duration: .5, ease: "power2.in" }, 17.1);
  cartao("#s-caderno", 13.1, 18.5);
}
function cenaCNN() {
  tl.addLabel("s-cnn", 20.3)
;
  [2, 6, 10, 14, 18, 22].forEach((linha, i) => {
    tl.set("#janela-conv", { top: `${linha / 28 * 100}%`, left: "0%" }, 21 + i * .38)
      .to("#janela-conv", { left: `${25 / 28 * 100}%`, duration: .34, ease: "steps(25)" }, 21 + i * .38);
  });
  tl.from("#pilha .plano", { x: -360, opacity: 0, rotationY: 40, duration: .7, ease: "back.out(1.3)", stagger: .28 }, 21.4)
    .from("#barras-cnn li", { x: 120, opacity: 0, duration: .5, stagger: .15 }, 23)
    .fromTo("#barras-cnn .barra", { width: "0%" }, { width: (i, el) => `${el.closest("li").dataset.p}%`, duration: 1, stagger: .15 }, 23.2);
  cartao("#s-cnn", 20.4, 25.5);
}
function cenaLSTM() {
  tl.addLabel("s-lstm", 27.3);
  $$("#contas circle").forEach((bola, i, todas) => {
    tl.fromTo(bola, { opacity: 0 }, { opacity: 1, duration: .1 }, 27.6 + i * .12)
      .to(bola, { motionPath: { path: "#sol-trilho", align: "#sol-trilho", alignOrigin: [.5, .5], start: 0, end: (i + 1) / todas.length },
        duration: 1.2, ease: "power2.inOut" }, 27.6 + i * .12);
  });
  tl.from("#corrente .celula", { y: 80, opacity: 0, duration: .5, stagger: .1, ease: "back.out(1.6)" }, 27.5)
    .from("#s-lstm .memoria", { scaleX: 0, transformOrigin: "left", duration: .6 }, 27.9)
    .fromTo("#s-lstm .memoria i", { left: "0%" }, { left: "calc(100% - 20px)", duration: 3, ease: "none" }, 28.4)
    .to("#corrente .celula", { backgroundColor: "#fbe7bf", y: -10, duration: .25, stagger: .5, yoyo: true, repeat: 1 }, 28.4)
    .from("#saida-lstm", { scale: 0, duration: .5, ease: "back.out(2)" }, 28.2);
  const chutes = [[0, "?"], [28.9, "bola?<br>31%"], [29.9, "lua?<br>47%"], [30.9, "sol!<br>91%"]];
  atualizadores.push((t) => {
    const texto = chutes.filter(([inicio]) => t >= inicio).at(-1)[1], el = $("#saida-lstm");
    if (el.dataset.texto !== texto) { el.dataset.texto = texto; el.firstChild.replaceWith(document.createRange().createContextualFragment(`<span>${texto}</span>`)); }
  });
  cartao("#s-lstm", 27.4, 32.5);
}
function cenaZe() {
  tl.addLabel("s-ze", 34.3)
    .from("#ze-slm", { yPercent: 100, duration: .8, ease: "back.out(1.4)" }, 34.4)
    .from("#balao-tokens .token", { scale: 0, opacity: 0, duration: .25, stagger: .2, ease: "back.out(3)" }, 35.1);
  cartao("#s-ze", 34.4, 39.5);
}
function cenaDestilacao() {
  tl.addLabel("s-destilacao", 41.3)
    .from(".professor", { y: -260, duration: .8, ease: "back.out(1.4)" }, 41.3)
    .from(".funil", { y: 300, duration: .7, ease: "back.out(1.4)", stagger: .1 }, 41.4)
    .fromTo("#nivel", { height: "0%" }, { height: "68%", duration: 3.6, ease: "none" }, 41.9);
  const { origem, destino } = pontosDaDestilacao;
  $$("#gotas i").forEach((gota, i) => {
    tl.fromTo(gota, { left: origem.x + gsap.utils.random(-40, 40), top: origem.y, opacity: 1 },
      { left: destino.x - 9, top: destino.y, opacity: 0, duration: .9, ease: "power2.in" }, 41.9 + i * .3);
  });
  contar("#cont-aprovados", 0, 455, 41.9, 45.5);
  contar("#cont-reprovados", 0, 46, 41.9, 45.5);
  cartao("#s-destilacao", 41.4, 46.5);
}
function cenaQLoRA() {
  tl.addLabel("s-qlora", 48.3)
    .from("#ad-a", { x: -400, opacity: 0, duration: .6, ease: "back.out(1.4)" }, 49.6)
    .from("#ad-b", { y: -200, opacity: 0, duration: .6, ease: "back.out(1.4)" }, 49.9)
    .to("#pesos .peso", { boxShadow: "inset 0 0 0 5px #b5401f", backgroundColor: "#e9d9b4", duration: .3,
      stagger: { each: .015, from: "start", grid: [6, 10] } }, 50.4)
    .from([".legenda-pesos", ".antes-depois"], { y: 60, opacity: 0, duration: .5, stagger: .2 }, 50.4);
  contar("#formato", 78, 100, 50.6, 52.2, (v) => `${Math.round(v)}%`);
  cartao("#s-qlora", 48.4, 53.5);
}
function cenaGGUF() {
  tl.addLabel("s-gguf", 55.3)
    .from("#arquivo", { x: 300, opacity: 0, duration: .6, ease: "back.out(1.3)" }, 55.8)
    .to("#bits i:nth-child(n+9)", { y: 120, rotation: () => gsap.utils.random(-90, 90), opacity: 0, duration: .6, stagger: .05, ease: "power2.in" }, 56.6)
    .to("#bits i:nth-child(-n+8)", { backgroundColor: "#2f7d32", color: "#fff6df", duration: .3, stagger: .04 }, 57)
    .fromTo("#barra-tamanho", { width: "100%" }, { width: `${1.83 / 3.44 * 100}%`, duration: 1.6, ease: "power2.inOut" }, 57)
    .from(".cpu", { y: 120, opacity: 0, duration: .5, ease: "back.out(1.6)" }, 58);
  contar("#tamanho", 3.44, 1.83, 57, 58.6, (v) => `${v.toFixed(2).replace(".", ",")} GB`);
  cartao("#s-gguf", 55.4, 60.5);
}
function cenaEngenharia() {
  tl.addLabel("s-engenharia", 62.3)
    .from("#selos span", { y: 60, opacity: 0, duration: .4, stagger: .1, ease: "back.out(1.6)" }, 63.4);
  contar("#cont-py", 0, 472, 63.4, 64.8);
  contar("#cont-ts", 0, 622, 63.4, 64.8);
  cartao("#s-engenharia", 62.4, 67.5);
}
function cenaConvite() {
  tl.addLabel("s-convite", 69.3)
    .set("#t-convite", { visibility: "visible" }, 69.3)
    .from(new SplitText("#t-convite", { type: "chars,words" }).chars, { yPercent: 130, opacity: 0, rotate: () => gsap.utils.random(-25, 25),
      duration: .7, ease: "back.out(2.2)", stagger: .04 }, 69.4)
    .from("#ze-convite", { yPercent: 120, duration: .8, ease: "back.out(1.5)" }, 69.5)
    .fromTo("#jogar", { scale: 0 }, { scale: 1, duration: .6, ease: "back.out(2.5)" }, 70.2)
    .call(soIndoPraFrente(() => { const c = centroDe("#jogar"); explodirTinta(c.x, c.y, 70, 16); }), null, 70.5)
    .to("#jogar", { scale: 1.12, duration: .5, yoyo: true, repeat: 3, ease: "sine.inOut" }, 71)
    .to({}, { duration: 1 }, 74);
}

/* ---------- Ordem da história: cenas e transições entre elas ---------- */
function letraO() {
  // a "bolinha" do ô de "sô!": a roça aparece dentro dela
  const el = $$("#foco-so div").find((d) => d.textContent === "ô"), r = medirSemTransformar(el);
  const raio = r.w * .3, cx = r.x + r.w / 2, cy = r.y + r.h * .62;
  return { x: cx - raio, y: cy - raio, w: raio * 2, h: raio * 2, forma: "circulo" };
}
function montarHistoria() {
  // A trajetória das gotas é medida antes dos from() da cena
  pontosDaDestilacao = { origem: centroDe(".professor svg"), destino: centroDe("#f-jarro") };
  cenaAbertura(); cenaRoca(); cenaCaderno(); cenaCNN(); cenaLSTM(); cenaZe(); cenaDestilacao(); cenaQLoRA(); cenaGGUF(); cenaEngenharia(); cenaConvite();
  const janela = () => ({ ...retDoVideo(JANELA_DA_CASA), canto: 2 });
  portal({ fora: "#s-abertura", dentro: "#s-roca", objeto: letraO, t: 4.5 });
  portal({ fora: "#s-roca", dentro: "#s-caderno", objeto: janela, t: 11.3 }); // pela janela, a mesa
  portal({ fora: "#s-caderno", dentro: "#s-cnn", objeto: "#desenho-sol", t: 18.6 }); // sol -> pixels
  portal({ fora: "#s-cnn", dentro: "#s-lstm", objeto: ".grade-caixa", t: 25.6 }); // pixels -> trilha
  portal({ fora: "#s-lstm", dentro: "#s-ze", objeto: { sel: "#saida-lstm", canto: 24 }, t: 32.6 });
  portal({ fora: "#s-ze", dentro: "#s-destilacao", objeto: { sel: "#ze-slm .cabeca", forma: "circulo" }, t: 39.6 });
  portal({ fora: "#s-destilacao", dentro: "#s-qlora", objeto: { sel: ".jarro", canto: 40 }, t: 46.6 });
  portal({ fora: "#s-qlora", dentro: "#s-gguf", objeto: { sel: "#pesos .peso:nth-child(25)", canto: 6 }, t: 53.6 });
  portal({ fora: "#s-engenharia", dentro: "#s-gguf", objeto: { sel: "#hex-ze", forma: "circulo" }, t: 60.6, sentido: "sair" });
  portal({ fora: "#s-convite", dentro: "#s-engenharia", objeto: janela, t: 67.6, sentido: "sair" }); // tudo isso era dentro da casa
}

/* ---------- Navegação: rodinha, teclas, toque, autoplay e progresso ---------- */
const CENAS = $$(".cena[data-nome]").map((s) => s.id);
let alvo = 0, ultimaInteracao = -1e9, fimDesde = null, modo = "historia";
function mexeu(segundos) {
  if (modo !== "historia") return;
  alvo = gsap.utils.clamp(0, tl.duration(), alvo + segundos);
  ultimaInteracao = performance.now();
}
addEventListener("wheel", (e) => { e.preventDefault(); mexeu(e.deltaY * SEGUNDOS_POR_PIXEL_DA_RODINHA); }, { passive: false });
addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (["ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); mexeu(SEGUNDOS_POR_TECLA); }
  if (["ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); mexeu(-SEGUNDOS_POR_TECLA); }
});
let toqueY = null;
addEventListener("touchstart", (e) => { toqueY = e.touches[0].clientY; });
addEventListener("touchmove", (e) => { const y = e.touches[0].clientY; mexeu((toqueY - y) * SEGUNDOS_POR_PIXEL_DA_RODINHA * 3); toqueY = y; });

function cenaAtual() {
  let id = CENAS[0];
  for (const c of CENAS) if (tl.time() >= tl.labels[c]) id = c;
  return $(`#${id}`);
}
function passo(_, dtMs) {
  pintarParticulas(); pintarRastro();
  if (modo !== "historia") return;
  const parado = (performance.now() - ultimaInteracao) / 1000 > SEGUNDOS_PARADO_PARA_AUTOPLAY;
  if (parado) alvo = Math.min(tl.duration(), alvo + dtMs / 1000);
  tempoAnterior = tl.time();
  tl.time(tempoAnterior + (alvo - tempoAnterior) * (parado ? 1 : SUAVIZACAO));
  const t = tl.time();
  atualizadores.forEach((fn) => fn(t));
  if (t >= tl.duration() - .05 && parado) {
    fimDesde ??= performance.now();
    if ((performance.now() - fimDesde) / 1000 > SEGUNDOS_NO_FIM_ANTES_DE_RECOMECAR) { alvo = 0; tl.time(0); fimDesde = null; }
  } else fimDesde = null;
}

/* ---------- JOGAR: mergulha na tinta e abre a tela do apelido ---------- */
let portalDoApelido = null;
function irParaApelido(origem) {
  if (modo === "apelido") return;
  modo = "apelido";
  const fora = cenaAtual(), dentro = $("#s-apelido"), G = geometriaDoPortal({ sel: origem, canto: 20 }), p = { r: 0 };
  portalDoApelido = { fora, dentro, G, p };
  gsap.set(dentro, { autoAlpha: 1, zIndex: 20 }); gsap.set("#pular", { autoAlpha: 0 });
  gsap.to(p, { r: 1, duration: 1.8, ease: "none", onUpdate: moverPortalDoApelido, onComplete: () => $("#apelido").focus() });
}
function moverPortalDoApelido() {
  const { fora, dentro, G, p } = portalDoApelido, fase = .25;
  aplicarPortal(fora, dentro, G, p.r < fase ? 0 : easePortal((p.r - fase) / (1 - fase)), Math.min(1, p.r / fase));
}
function voltarParaHistoria() {
  const { fora, dentro, p } = portalDoApelido;
  gsap.to(p, { r: 0, duration: 1.6, ease: "none", onUpdate: moverPortalDoApelido, onComplete: () => {
    gsap.set(dentro, { autoAlpha: 0 }); dentro.style.clipPath = "none"; dentro.style.transform = "none"; fora.style.transform = "none";
    gsap.set("#pular", { autoAlpha: 1 }); modo = "historia"; ultimaInteracao = performance.now();
  } });
}
function ligarApelido() {
  $("#jogar").addEventListener("click", () => irParaApelido("#jogar"));
  $("#pular").addEventListener("click", () => irParaApelido("#pular"));
  $("#voltar").addEventListener("click", voltarParaHistoria);
  $$(".sugestoes button").forEach((b) => b.addEventListener("click", () => { $("#apelido").value = b.textContent; }));
  $$(".modo button").forEach((b) => b.addEventListener("click", () => { $$(".modo button").forEach((x) => x.classList.toggle("ativo", x === b)); }));
  const comecar = () => {
    const nome = $("#apelido").value.trim();
    $("#aviso").textContent = nome.length >= 1 && nome.length <= 16
      ? `Bora, ${nome}! (protótipo: aqui começa a partida do jogo de verdade)` : "Escolha um apelido de 1 a 16 letras, sô!";
  };
  $("#comecar").addEventListener("click", comecar);
  $("#apelido").addEventListener("keydown", (e) => { if (e.key === "Enter") comecar(); });
  $("#jogar").addEventListener("pointermove", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    gsap.to("#jogar", { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .3, duration: .3 });
  });
  $("#jogar").addEventListener("pointerleave", () => gsap.to("#jogar", { x: 0, y: 0, duration: .5, ease: "elastic.out(1, .4)" }));
}

/* Vídeos em loop recarregando a fonte (o http.server do Python não aceita Range, então não dá para voltar ao início) */
$$(".fundo-video").forEach((v) => { v.loop = false; v.addEventListener("ended", () => { v.src = v.getAttribute("src"); v.load(); v.play().catch(() => {}); }); });
// Os pontos de foco são medidos uma vez; mudou o tamanho da janela, remonta tudo
let esperaDoResize = 0;
addEventListener("resize", () => { clearTimeout(esperaDoResize); esperaDoResize = setTimeout(() => location.reload(), 400); });

document.fonts.ready.then(() => {
  ajustarTelas();
  $("#mancha-cobre").setAttribute("d", $("#forma-mancha").getAttribute("d"));
  $("#mancha-cobre").setAttribute("transform", "translate(800 450) scale(0)");
  criarZe("#ze-roca", "falando", "roca"); criarZe("#ze-slm", "falando", "slm"); criarZe("#ze-convite", "comemorando", "convite");
  montarRaios(); montarCNN(); montarLSTM(); montarTokens(); montarGotas(); montarPesos(); montarBits(); montarHexagonos();
  gsap.set(".cena", { autoAlpha: 0 }); gsap.set("#s-abertura", { autoAlpha: 1 });
  gsap.set(["#t-titulo", "#t-convite"], { xPercent: -50, yPercent: -50, visibility: "hidden" });
  montarHistoria(); ligarApelido();
  if (movimentoReduzido) { alvo = tl.duration(); tl.progress(1); }
  gsap.ticker.add(passo);
});
