/**
 * Desenho original do Zé do Rabisco (protótipo 11 da change `visual-tinta-cinetica`), em SVG embutido:
 * nada é carregado de fora. `ID_DO_XADREZ` é trocado por um id único por instância, para dois Zés na
 * mesma página não dividirem o padrão da camisa.
 */
export const DESENHO_DO_ZE = `
<defs>
<pattern id="ID_DO_XADREZ" width="16" height="16" patternUnits="userSpaceOnUse">
<rect width="16" height="16" fill="#c98a00"/><rect width="8" height="16" fill="#b5401f" opacity=".55"/><rect width="16" height="8" fill="#b5401f" opacity=".45"/>
</pattern>
</defs>
<g class="corpo">
<!-- Braços (atrás do tronco) -->
<g class="braco-e"><path class="preenche xadrez" fill="url(#ID_DO_XADREZ)" d="M66 150 C 50 158, 40 172, 38 186 L 50 190 C 54 178, 62 168, 74 162 Z"/><circle class="preenche pele" cx="43" cy="192" r="9"/></g>
<g class="braco-d"><path class="preenche xadrez" fill="url(#ID_DO_XADREZ)" d="M134 150 C 150 158, 160 172, 162 186 L 150 190 C 146 178, 138 168, 126 162 Z"/><circle class="preenche pele" cx="157" cy="192" r="9"/></g>
<!-- Tronco com camisa xadrez, suspensório e calça -->
<path class="preenche xadrez" fill="url(#ID_DO_XADREZ)" d="M68 146 C 72 140, 128 140, 132 146 L 138 200 L 62 200 Z"/>
<path class="linha" d="M84 146 L 80 200 M116 146 L 120 200"/>
<path class="preenche" style="fill:#3d6c9e" d="M62 198 L 138 198 L 136 222 L 104 222 L 100 208 L 96 222 L 64 222 Z"/>
<g class="cabeca">
<!-- Orelhas e rosto -->
<ellipse class="preenche pele" cx="58" cy="100" rx="9" ry="12"/><ellipse class="preenche pele" cx="142" cy="100" rx="9" ry="12"/>
<ellipse class="preenche pele" cx="100" cy="102" rx="44" ry="42"/>
<!-- Cabelo espetado saindo do chapéu -->
<path class="preenche" style="fill:#7a4a22" d="M62 76 L 70 92 L 76 78 L 84 92 L 92 78 L 100 90 L 108 78 L 116 92 L 124 78 L 130 92 L 138 76 Z"/>
<circle class="bochecha" cx="72" cy="118" r="9"/><circle class="bochecha" cx="128" cy="118" r="9"/>
<circle class="sarda" cx="80" cy="110" r="1.8"/><circle class="sarda" cx="86" cy="114" r="1.8"/><circle class="sarda" cx="114" cy="114" r="1.8"/><circle class="sarda" cx="120" cy="110" r="1.8"/>
<path class="linha" d="M98 104 C 94 112, 102 114, 104 110"/>
<g class="sobrancelhas"><path class="linha e" d="M74 86 C 80 82, 88 82, 92 85"/><path class="linha d" d="M108 85 C 112 82, 120 82, 126 86"/></g>
<g class="olhos">
<g class="aberto"><ellipse class="olho" cx="84" cy="97" rx="4.5" ry="6"/><ellipse class="olho" cx="116" cy="97" rx="4.5" ry="6"/></g>
<g class="cima"><ellipse class="olho" cx="86" cy="92" rx="4.5" ry="5"/><ellipse class="olho" cx="118" cy="92" rx="4.5" ry="5"/></g>
<g class="feliz"><path class="linha" d="M78 98 Q 84 90 90 98 M110 98 Q 116 90 122 98"/></g>
<g class="meio"><path class="linha" d="M78 97 L 90 97 M110 97 L 122 97"/><ellipse class="olho" cx="84" cy="99" rx="4" ry="2.5"/><ellipse class="olho" cx="116" cy="99" rx="4" ry="2.5"/></g>
<g class="triste"><ellipse class="olho" cx="84" cy="99" rx="4" ry="5"/><ellipse class="olho" cx="116" cy="99" rx="4" ry="5"/></g>
<g class="arregalado"><circle cx="84" cy="96" r="8" fill="#fff" stroke="#2b1a0a" stroke-width="3"/><circle class="olho" cx="84" cy="96" r="3"/><circle cx="116" cy="96" r="8" fill="#fff" stroke="#2b1a0a" stroke-width="3"/><circle class="olho" cx="116" cy="96" r="3"/></g>
</g>
<g class="boca">
<path class="linha sorriso" d="M84 124 Q 100 136 116 124"/>
<path class="preenche fala" style="fill:#7a2a14" d="M88 122 Q 100 140 112 122 Z"/>
<path class="linha hum" d="M90 128 Q 100 124 110 128"/>
<path class="preenche aberta" style="fill:#7a2a14" d="M82 120 Q 100 148 118 120 Z"/>
<path class="linha brava" d="M86 130 Q 100 120 114 130"/>
<ellipse class="preenche tedio" style="fill:#7a2a14" cx="100" cy="127" rx="5" ry="3"/>
<path class="linha torta" d="M86 130 C 94 124, 104 132, 114 126"/>
<ellipse class="preenche oh" style="fill:#7a2a14" cx="100" cy="128" rx="7" ry="9"/>
</g>
<!-- Capim no canto da boca e lápis atrás da orelha -->
<path class="linha capim" style="stroke:#2f7d32;stroke-width:3" d="M116 126 L 140 118 M128 122 L 136 112"/>
<path class="preenche lapis" d="M146 70 L 154 74 L 140 104 L 132 100 Z"/><path class="preenche" style="fill:#f3c79b" d="M132 100 L 140 104 L 132 110 Z"/>
</g>
<!-- Chapéu de palha com remendo e faixa -->
<g class="chapeu">
<ellipse class="preenche palha" cx="100" cy="74" rx="68" ry="12"/>
<path class="preenche palha" d="M66 72 C 66 40, 134 40, 134 72 Z"/>
<path class="preenche faixa" d="M67 64 C 90 70, 110 70, 133 64 L 134 72 C 110 78, 90 78, 66 72 Z"/>
<path class="preenche" style="fill:#2f7d32" d="M108 52 L 121 54 L 120 64 L 107 62 Z"/>
<path class="linha" style="stroke-width:2" d="M80 50 L 84 60 M96 44 L 96 58 M42 76 L 38 84 M158 76 L 162 84 M50 80 L 48 86"/>
</g>
</g>
<!-- Efeitos de cada humor -->
<g class="extras">
<g class="bolhas"><circle class="preenche" style="fill:#fff" cx="160" cy="54" r="5"/><circle class="preenche" style="fill:#fff" cx="172" cy="38" r="8"/><circle class="preenche" style="fill:#fff" cx="184" cy="16" r="12"/></g>
<g class="estrelas"><path class="preenche" style="fill:#c98a00" d="M28 40 l4 9 10 1 -8 6 3 10 -9 -5 -9 5 3 -10 -8 -6 10 -1 z"/><path class="preenche" style="fill:#b5401f" d="M172 30 l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 z"/><path class="preenche" style="fill:#2f7d32" d="M178 120 l3 6 7 1 -5 4 2 7 -7 -4 -6 4 2 -7 -5 -4 7 -1 z"/></g>
<g class="fumaca"><path class="preenche" style="fill:#d9cbb3" d="M56 46 c -8 -2 -10 -12 -2 -14 c 2 -8 14 -6 12 2 c 8 2 6 12 -2 12 z"/><path class="preenche" style="fill:#d9cbb3" d="M150 46 c -8 -2 -10 -12 -2 -14 c 2 -8 14 -6 12 2 c 8 2 6 12 -2 12 z"/></g>
<g class="zzz"><text x="146" y="60">z</text><text x="154" y="48">z</text><text x="162" y="36">Z</text></g>
<path class="gota preenche" style="fill:#8ec5ef" d="M150 82 C 146 90, 146 96, 150 96 C 154 96, 154 90, 150 82 Z"/>
</g>
`;
