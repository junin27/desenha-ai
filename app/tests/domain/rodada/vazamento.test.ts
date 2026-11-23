import { describe, expect, it } from "vitest";
import { formaComparavel, vaza } from "../../../src/domain/rodada/vazamento";

describe("Requisito: Forma comparável das palavras", () => {
  it.each([
    ["Chapéu", ["chapeu"]],
    ["CHAPEU", ["chapeu"]],
    ["vaquinha", ["vacinha"]],
    ["aviões", ["aviao"]],
    ["sóis", ["sol"]],
    ["Xícara de café!", ["xicara", "de", "cafe"]],
    ["porquinho-da-índia", ["porcinho", "da", "india"]],
  ] as const)("%s", (texto, esperado) => {
    expect(formaComparavel(texto)).toEqual(esperado);
  });
});

describe("Requisito: Detecção de vazamento", () => {
  it.each([
    ["vaca", "A vaca malhada dá leite"],
    ["vaca", "Quem é a vaquinha do pasto?"],
    ["avião", "Vários aviões no céu"],
    ["xícara de café", "Serve o cafezinho da tarde"],
    ["sol", "O soldado marchou"],
  ])("%s vaza em %j", (secreta, texto) => {
    expect(vaza(secreta, texto)).toBe(true);
  });

  it.each([
    ["vaca", "Malhada, mansa, faz muuu e dá leite"],
    ["xícara de café", "um desenho de criança"],
  ])("%s não vaza em %j", (secreta, texto) => {
    expect(vaza(secreta, texto)).toBe(false);
  });
});
