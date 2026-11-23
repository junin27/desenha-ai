import { describe, expect, it } from "vitest";
import { ClassificadorFalso, probabilidadesCom, RelogioFalso } from "./dubles";
import { ClassificadorMedido } from "../../src/application/classificador-medido";
import { MedicoesDaSessao } from "../../src/application/medicoes-da-sessao";
import type {
  ClassificadorDeDesenho,
  ErroDoClassificador,
  ProbabilidadesDasRedes,
} from "../../src/application/portas";
import { criarDesenho } from "../../src/domain/desenho/desenho";
import { ok, type Resultado } from "../../src/domain/resultado";

// Spec `painel-tecnico`, requisito "Medições das redes".
const DESENHO = criarDesenho([[[0, 0]]]);
const PROBABILIDADES = probabilidadesCom(0, 0.5);

/** Classificador que leva `duracao` ms no relógio falso e informa os tempos de cada rede. */
class ClassificadorCronometrado implements ClassificadorDeDesenho {
  constructor(
    private readonly relogio: RelogioFalso,
    private readonly duracao: number,
  ) {}

  classificar(): Promise<Resultado<ProbabilidadesDasRedes, ErroDoClassificador>> {
    this.relogio.avancar(this.duracao);
    const milissegundos = { cnn: 12.5, lstm: 30.25 };
    return Promise.resolve(ok({ cnn: PROBABILIDADES, lstm: PROBABILIDADES, milissegundos }));
  }
}

describe("medições das redes", () => {
  it("depois de um traço, o painel tem os milissegundos da CNN, da LSTM e do palpite inteiro", async () => {
    const relogio = new RelogioFalso();
    const medicoes = new MedicoesDaSessao();
    const classificador = new ClassificadorMedido(
      new ClassificadorCronometrado(relogio, 45),
      medicoes,
      relogio,
    );
    const resposta = await classificador.classificar(DESENHO);
    expect(resposta.ok).toBe(true);
    expect(medicoes.retrato.redes).toEqual({ cnnMs: 12.5, lstmMs: 30.25, totalMs: 45 });
  });

  it("palpite que falha não apaga a medição anterior", async () => {
    const relogio = new RelogioFalso();
    const medicoes = new MedicoesDaSessao();
    await new ClassificadorMedido(new ClassificadorCronometrado(relogio, 10), medicoes, relogio).classificar(
      DESENHO,
    );
    const quebrado = new ClassificadorFalso().programarFalha();
    await new ClassificadorMedido(quebrado, medicoes, relogio).classificar(DESENHO);
    expect(medicoes.retrato.redes?.totalMs).toBe(10);
  });

  it("avisa os ouvintes a cada medição", async () => {
    const relogio = new RelogioFalso();
    const medicoes = new MedicoesDaSessao();
    let avisos = 0;
    medicoes.aoMudar(() => (avisos += 1));
    await new ClassificadorMedido(new ClassificadorCronometrado(relogio, 5), medicoes, relogio).classificar(
      DESENHO,
    );
    expect(avisos).toBe(1);
  });

  it("guarda o resultado do autoteste de paridade", () => {
    const medicoes = new MedicoesDaSessao();
    medicoes.registrarParidade({ passou: true, casos: 8, maiorDiferenca: 2e-7 });
    expect(medicoes.retrato.paridade).toEqual({ passou: true, casos: 8, maiorDiferenca: 2e-7 });
  });
});
