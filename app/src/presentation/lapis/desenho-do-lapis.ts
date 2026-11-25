import type { DesgasteDoLapis } from "./desgaste";

/**
 * Desenho do lápis de cor (protótipo 13, aprovado em 25/11): na horizontal, com a ponta do grafite em (0, 0)
 * e a borracha no outro extremo. O comprimento muda com o desgaste. Tudo em SVG próprio, sem endereço.
 */
const LARGURA_DA_PONTA = 30;
const LARGURA_DO_ANEL = 22;

export function comprimentoDoLapis(desgaste: DesgasteDoLapis): number {
  return LARGURA_DA_PONTA + desgaste.corpo + LARGURA_DO_ANEL + desgaste.borracha;
}

/** Cor mais clara (fator > 0) ou mais escura (fator < 0), para as faces do corpo sextavado. */
export function tom(hex: string, fator: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const canais = [n >> 16, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(fator > 0 ? c + (255 - c) * fator : c * (1 + fator)),
  );
  return `rgb(${canais.join(",")})`;
}

export function desenharLapis(desgaste: DesgasteDoLapis, cor: string, sufixo: string): string {
  const { corpo, borracha, ponta } = desgaste;
  const fimCorpo = LARGURA_DA_PONTA + corpo;
  const fimAnel = fimCorpo + LARGURA_DO_ANEL;
  const fim = fimAnel + borracha;
  const grafite = 4 + 6 * ponta;
  const rombudo = 3 * (1 - ponta);
  return `
    <path d="M0 0 L30 -14 L30 14 Z" fill="url(#madeira-${sufixo})" stroke="#2b1a0a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M0 ${String(-1.5 - rombudo)} L${String(grafite)} -4.7 L${String(grafite)} 4.7 L0 ${String(1.5 + rombudo)} Z" fill="${cor}" stroke="#2b1a0a" stroke-width="1"/>
    <rect x="30" y="-14" width="${String(corpo)}" height="9" fill="${tom(cor, 0.35)}"/>
    <rect x="30" y="-5" width="${String(corpo)}" height="10" fill="${cor}"/>
    <rect x="30" y="5" width="${String(corpo)}" height="9" fill="${tom(cor, -0.3)}"/>
    <rect x="30" y="-14" width="${String(corpo)}" height="28" fill="url(#brilho-${sufixo})"/>
    <rect class="corpo-do-lapis" x="30" y="-14" width="${String(corpo)}" height="28" fill="none" stroke="#2b1a0a" stroke-width="2.5"/>
    <path d="M30 -14 Q34 -9 30 -5 Q34 0 30 5 Q34 9 30 14" fill="#f6dcb0" stroke="#2b1a0a" stroke-width="2"/>
    <rect x="${String(fimCorpo)}" y="-15" width="22" height="30" rx="3" fill="url(#metal-${sufixo})" stroke="#2b1a0a" stroke-width="2.5"/>
    <path d="M${String(fimCorpo + 7)} -15 L${String(fimCorpo + 7)} 15 M${String(fimCorpo + 15)} -15 L${String(fimCorpo + 15)} 15" stroke="#7d8087" stroke-width="1.5"/>
    <path d="M${String(fimAnel)} -14 L${String(fim - 8)} -14 Q${String(fim)} -14 ${String(fim)} 0 Q${String(fim)} 14 ${String(fim - 8)} 14 L${String(fimAnel)} 14 Z" fill="url(#borracha-${sufixo})" stroke="#2b1a0a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M${String(fimAnel + 4)} -8 Q${String(fimAnel + 10)} -9 ${String(fim - 4)} -4" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`;
}

export function gradientes(sufixo: string): string {
  return `<defs>
    <linearGradient id="madeira-${sufixo}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dcb0"/><stop offset="1" stop-color="#d9b07a"/></linearGradient>
    <linearGradient id="metal-${sufixo}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f6f6"/><stop offset=".45" stop-color="#b9bcc2"/><stop offset=".55" stop-color="#8d9097"/><stop offset="1" stop-color="#dcdee1"/></linearGradient>
    <linearGradient id="borracha-${sufixo}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4a8a6"/><stop offset="1" stop-color="#c8605e"/></linearGradient>
    <linearGradient id="brilho-${sufixo}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
    <radialGradient id="sombra-${sufixo}"><stop offset="0" stop-color="#2b1a0a" stop-opacity=".35"/><stop offset="1" stop-color="#2b1a0a" stop-opacity="0"/></radialGradient>
  </defs>`;
}

/** Balde inclinado com a gota de tinta caindo no ponto. */
export function desenharBalde(cor: string): string {
  return `<g transform="translate(4 -50)">
    <path d="M8 26 L36 0 L64 26 L36 54 Z" fill="#fffdf6" stroke="#2b1a0a" stroke-width="3" stroke-linejoin="round" transform="rotate(10 36 26)"/>
    <path d="M14 30 Q30 40 52 24 L60 26 L36 54 Z" fill="${cor}" stroke="#2b1a0a" stroke-width="2" transform="rotate(10 36 26)"/>
    <path d="M22 12 L6 -6" stroke="#2b1a0a" stroke-width="4" stroke-linecap="round"/>
    <path d="M-4 40 C-4 40 4 48 4 54 C4 58 0 60 -4 60 C-8 60 -12 58 -12 54 C-12 48 -4 40 -4 40 Z" fill="${cor}" stroke="#2b1a0a" stroke-width="2" transform="translate(4 -10)"/>
  </g>`;
}

/** Conta-gotas com a ponta no ponto e o líquido na cor atual. */
export function desenharContaGotas(cor: string): string {
  return `<g transform="rotate(-45)">
    <path d="M0 0 L22 -5 L22 5 Z" fill="#d7e8ef" stroke="#2b1a0a" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="22" y="-7" width="70" height="14" rx="3" fill="#e9f3f7" stroke="#2b1a0a" stroke-width="2.5"/>
    <rect x="24" y="-5" width="40" height="10" fill="${cor}"/>
    <path d="M92 -10 L106 -10 Q126 -10 126 0 Q126 10 106 10 L92 10 Z" fill="#c8605e" stroke="#2b1a0a" stroke-width="2.5"/>
  </g>`;
}
