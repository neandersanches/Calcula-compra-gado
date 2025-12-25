
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calculator, Lightbulb, RefreshCw, Trash2, ArrowUpRight, TrendingUp, DollarSign, Weight, BarChart3, Info } from 'lucide-react';
import { ScenarioData, ScenarioType, ProjectionRow } from './types';
import { SCENARIO_DEFAULTS, KILOS_POR_ARROBA_BRUTA, KILOS_POR_ARROBA_CARNE, PERIODOS } from './constants';
import { GoogleGenAI } from '@google/genai';

// Custom Cow Icon for Logo
const CowIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 11c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z" />
    <path d="M11 11c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z" />
    <path d="M5 10c0-4 3-7 7-7s7 3 7 7v1l-1 2H6l-1-2v-1z" />
    <path d="M6 13c-1.105 0-2 .895-2 2s.895 2 2 2h12c1.105 0 2-.895 2-2s-.895-2-2-2" />
    <path d="M12 17v4M8 21h8" />
  </svg>
);

const InputField = ({ label, id, value, onChange, icon: Icon, suffix, prefix, color = "blue" }: any) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
      )}
      {prefix && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-slate-400 text-sm">{prefix}</span>
        </div>
      )}
      <input
        type="number"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`block w-full rounded-xl border-slate-200 bg-white ${Icon || prefix ? 'pl-9' : 'pl-4'} ${suffix ? 'pr-10' : 'pr-4'} py-2.5 text-slate-800 shadow-sm transition-all focus:ring-2 focus:ring-${color}-500/20 focus:border-${color}-500 border`}
        placeholder="0.00"
      />
      {suffix && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-slate-400 text-sm font-medium">{suffix}</span>
        </div>
      )}
    </div>
  </div>
);

const ResultCard = ({ label, value, colorClass = "text-blue-900", icon: Icon }: any) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-start gap-2 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between w-full">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      {Icon && <Icon className="w-4 h-4 text-slate-300" />}
    </div>
    <p className={`text-xl font-bold ${colorClass} truncate w-full`}>{value}</p>
  </div>
);

export default function App() {
  const [scenario, setScenario] = useState<ScenarioData>(() => {
    const saved = localStorage.getItem('gadicerto_scenario');
    return saved ? JSON.parse(saved) : SCENARIO_DEFAULTS.novilha;
  });
  const [activeScenarioType, setActiveScenarioType] = useState<ScenarioType | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    localStorage.setItem('gadicerto_scenario', JSON.stringify(scenario));
  }, [scenario]);

  const updateScenario = (key: keyof ScenarioData, value: string) => {
    setScenario(prev => ({ ...prev, [key]: value }));
  };

  const loadScenarioType = (type: ScenarioType) => {
    setActiveScenarioType(type);
    setScenario(SCENARIO_DEFAULTS[type]);
  };

  const clearFields = () => {
    setScenario({
      preco: '', peso: '', comissao: '', frete: '', castracao: '',
      gastoDiario: '', gmd: '', rendimentoCarcaca: '', precoVendaArroba: ''
    });
    setActiveScenarioType(null);
    setAiAnalysis('');
  };

  const calculations = useMemo(() => {
    const precoBase = parseFloat(scenario.preco) || 0;
    const pesoInicial = parseFloat(scenario.peso) || 0;
    const comissaoPercentual = parseFloat(scenario.comissao) || 0;
    const frete = parseFloat(scenario.frete) || 0;
    const castracao = parseFloat(scenario.castracao) || 0;
    const gastoDiario = parseFloat(scenario.gastoDiario) || 0;
    const gmd = parseFloat(scenario.gmd) || 0;
    const rendimentoCarcaca = parseFloat(scenario.rendimentoCarcaca) || 50;
    const precoVendaArroba = parseFloat(scenario.precoVendaArroba) || 0;

    const arrobasBrutas = pesoInicial > 0 ? pesoInicial / KILOS_POR_ARROBA_BRUTA : 0;
    const precoArrobaBase = precoBase > 0 && arrobasBrutas > 0 ? precoBase / arrobasBrutas : 0;
    const valorComissao = precoBase * (comissaoPercentual / 100);
    const custoTotalAquisicao = precoBase + valorComissao + frete + castracao;
    const custoPorArrobaAquisicao = arrobasBrutas > 0 ? custoTotalAquisicao / arrobasBrutas : 0;
    const custoPorKgAquisicao = pesoInicial > 0 ? custoTotalAquisicao / pesoInicial : 0;

    const projections: ProjectionRow[] = PERIODOS.map(dias => {
      const meses = dias / 30;
      const pesoFinal = pesoInicial + (gmd * dias);
      const arrobasCarneLiquida = (pesoFinal * (rendimentoCarcaca / 100)) / KILOS_POR_ARROBA_CARNE;
      const custoManutencao = gastoDiario * dias;
      const pesoGanho = pesoFinal - pesoInicial;
      const arrobasProduzidas = (pesoGanho * (rendimentoCarcaca / 100)) / KILOS_POR_ARROBA_CARNE;
      const custoPorArrobaProduzida = arrobasProduzidas > 0 ? custoManutencao / arrobasProduzidas : 0;
      const custoTotalPeriodo = custoTotalAquisicao + custoManutencao;
      const receitaTotal = arrobasCarneLiquida * precoVendaArroba;
      const lucroPrejuizo = receitaTotal - custoTotalPeriodo;
      const roi = custoTotalPeriodo > 0 ? (lucroPrejuizo / custoTotalPeriodo) * 100 : 0;
      const rentabilidadeMensal = meses > 0 ? roi / meses : 0;

      return {
        dias,
        pesoFinal,
        arrobasCarneLiquida,
        custoPorArrobaProduzida,
        custoTotalPeriodo,
        receitaTotal,
        lucroPrejuizo,
        rentabilidadeMensal
      };
    });

    return {
      arrobasBrutas,
      precoArrobaBase,
      custoTotalAquisicao,
      custoPorArrobaAquisicao,
      custoPorKgAquisicao,
      projections
    };
  }, [scenario]);

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Aja como um consultor sênior de pecuária. Analise se vale a pena comprar este lote:
        Cenário: ${activeScenarioType || 'Geral'}
        Dados de Compra:
        - Peso: ${scenario.peso}kg | Preço: R$ ${scenario.preco}
        - Custos extras (frete/comissão/etc): R$ ${(calculations.custoTotalAquisicao - (parseFloat(scenario.preco)||0)).toFixed(2)}
        - Custo por @ na compra: R$ ${calculations.custoPorArrobaAquisicao.toFixed(2)}
        
        Plano de Engorda:
        - GMD esperado: ${scenario.gmd}kg/dia
        - Gasto por dia: R$ ${scenario.gastoDiario}
        - Expectativa de venda: R$ ${scenario.precoVendaArroba}/@

        Responda em português de forma concisa:
        1. O ágio de compra está saudável? (Custo @ compra vs Expectativa de venda)
        2. Qual o prazo de dias em que o lucro é mais eficiente (ROI/mês)?
        3. Dê o veredito: COMPRAR ou NEGOCIAR PREÇO?
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiAnalysis(response.text || 'Não foi possível gerar a análise.');
    } catch (error) {
      console.error(error);
      setAiAnalysis('Ocorreu um erro ao consultar o especialista de IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-600 p-2 rounded-2xl shadow-lg shadow-emerald-200">
              <CowIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">GadoCerto AI</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-lg">
            Sua ferramenta definitiva para decidir se a compra do boi é viável. Analise o ágio, projete custos e garanta o lucro da recria.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => loadScenarioType('novilha')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeScenarioType === 'novilha' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500'}`}
          >
            Novilha
          </button>
          <button 
            onClick={() => loadScenarioType('boi_magro')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeScenarioType === 'boi_magro' ? 'bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-200' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-500'}`}
          >
            Boi Magro
          </button>
          <button 
            onClick={() => loadScenarioType('vaca_magra')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeScenarioType === 'vaca_magra' ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500'}`}
          >
            Vaca Magra
          </button>
          <button 
            onClick={clearFields}
            className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Limpar campos"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Inputs */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-800">Custo de Entrada</h2>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Preço da Compra" id="preco" value={scenario.preco} onChange={(v:string) => updateScenario('preco', v)} prefix="R$" />
                <InputField label="Peso Vivo" id="peso" value={scenario.peso} onChange={(v:string) => updateScenario('peso', v)} suffix="kg" icon={Weight} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Comissão (%)" id="comissao" value={scenario.comissao} onChange={(v:string) => updateScenario('comissao', v)} suffix="%" />
                <InputField label="Frete Total" id="frete" value={scenario.frete} onChange={(v:string) => updateScenario('frete', v)} prefix="R$" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Sanidade/Cast." id="castracao" value={scenario.castracao} onChange={(v:string) => updateScenario('castracao', v)} prefix="R$" />
                <InputField label="Custo Diário" id="gastoDiario" value={scenario.gastoDiario} onChange={(v:string) => updateScenario('gastoDiario', v)} prefix="R$" />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Parâmetros de Engorda</p>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="GMD (kg/dia)" id="gmd" value={scenario.gmd} onChange={(v:string) => updateScenario('gmd', v)} color="emerald" />
                  <InputField label="Rendimento %" id="rendimento" value={scenario.rendimentoCarcaca} onChange={(v:string) => updateScenario('rendimentoCarcaca', v)} color="emerald" />
                </div>
              </div>

              <InputField label="Preço @ de Venda Projeta" id="precoVenda" value={scenario.precoVendaArroba} onChange={(v:string) => updateScenario('precoVendaArroba', v)} prefix="R$" color="emerald" />
            </div>
          </div>

          {/* AI Advisor Card */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <CowIcon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">Veredito do Especialista</h3>
              </div>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Nossa IA avalia o ágio da compra e os custos de manutenção para dizer se o negócio é viável.
              </p>
              
              <button 
                onClick={runAiAnalysis}
                disabled={isAnalyzing || !scenario.preco}
                className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                {isAnalyzing ? 'Consultando...' : 'Avaliar Viabilidade'}
              </button>

              {aiAnalysis && (
                <div className="mt-6 p-5 bg-slate-800 rounded-2xl border border-slate-700 text-sm animate-in fade-in slide-in-from-top-4 shadow-inner">
                  <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold uppercase text-[10px] tracking-widest">
                    <Info className="w-3 h-3" />
                    Análise GadoCerto
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-200 italic">
                    {aiAnalysis}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-8 space-y-8">
          {/* Quick Stats */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Resumo da Aquisição
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ResultCard label="Peso em Arrobas" value={`${calculations.arrobasBrutas.toFixed(2)} @`} icon={Weight} />
              <ResultCard label="Preço @ (Base)" value={formatCurrency(calculations.precoArrobaBase)} icon={DollarSign} />
              <ResultCard label="Custo Total Real" value={formatCurrency(calculations.custoTotalAquisicao)} colorClass="text-emerald-600" icon={ArrowUpRight} />
              <ResultCard label="Custo @ de Entrada" value={formatCurrency(calculations.custoPorArrobaAquisicao)} colorClass="text-indigo-600" />
            </div>
          </section>

          {/* Table */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Simulação de Recria e Engorda</h2>
                <p className="text-xs text-slate-400 font-medium">Projeções baseadas no seu custo diário</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">Atualizado em tempo real</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Período</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peso Final</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Carne Liq (@)</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custo Acum.</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Venda Est.</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lucro Líquido</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rentab./Mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculations.projections.map((row) => (
                    <tr 
                      key={row.dias} 
                      className={`hover:bg-slate-50 transition-colors group ${row.dias === 120 ? 'bg-emerald-50/40' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold ${row.dias === 120 ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {row.dias} dias
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.pesoFinal.toFixed(1)} kg</td>
                      <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{row.arrobasCarneLiquida.toFixed(2)} @</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatCurrency(row.custoTotalPeriodo)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatCurrency(row.receitaTotal)}</td>
                      <td className={`px-6 py-4 text-sm font-bold ${row.lucroPrejuizo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(row.lucroPrejuizo)}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${row.rentabilidadeMensal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {row.rentabilidadeMensal.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 text-[11px] text-slate-400 font-medium italic">
              * Nota: A rentabilidade mensal é calculada dividindo o ROI total pelo número de meses. O custo acumulado inclui o valor de aquisição e todos os gastos diários informados.
            </div>
          </section>
        </main>
      </div>
      
      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-slate-200 text-center">
        <div className="flex items-center justify-center gap-2 mb-2 text-slate-300">
           <CowIcon className="w-5 h-5" />
           <span className="font-bold text-sm tracking-tighter">GADOCERTO AI</span>
        </div>
        <p className="text-slate-400 text-xs font-medium">
          © 2024 Gestão Pecuária de Precisão. Verifique sempre os preços do Cepea para maior acurácia.
        </p>
      </footer>
    </div>
  );
}
