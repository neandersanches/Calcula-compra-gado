
export interface ScenarioData {
  preco: string;
  peso: string;
  comissao: string;
  frete: string;
  castracao: string;
  gastoDiario: string;
  gmd: string;
  rendimentoCarcaca: string;
  precoVendaArroba: string;
}

export type ScenarioType = 'novilha' | 'boi_magro' | 'vaca_magra';

export interface ProjectionRow {
  dias: number;
  pesoFinal: number;
  arrobasCarneLiquida: number;
  custoPorArrobaProduzida: number;
  custoTotalPeriodo: number;
  receitaTotal: number;
  lucroPrejuizo: number;
  rentabilidadeMensal: number;
}
