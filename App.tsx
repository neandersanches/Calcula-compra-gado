
import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Lightbulb, RefreshCw, Trash2, ArrowUpRight, TrendingUp, DollarSign, Weight, BarChart3, Info } from 'lucide-react';
import { ScenarioData, ScenarioType, ProjectionRow } from './types';
import { SCENARIO_DEFAULTS, KILOS_POR_ARROBA_BRUTA, KILOS_POR_ARROBA_CARNE, PERIODOS } from './constants';
import { GoogleGenAI } from '@google/genai';

const CowIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 11c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z" />
    <path d="M11 11c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z" />
    <path d="M5 10c0-4 3-7 7-7s7 3 7 7v1l-1 2H6l-1-2v-1z" />
    <path d="M6 13c-1.105 0-2 .895-2 2s.895 2 2 2h12c1.105 0 2-.895 2-2s-.895-2-2-2" />
    <path d="M12 17v4M8 21h8" />
  </svg>
);

const InputField = ({ label, id, value, onChange, icon: Icon, suffix, prefix, color = "emerald" }: any) => (
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
        placeholder="0,00"
      />
      {suffix && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-slate-400 text-sm font-medium">{suffix}</span>
        </div>
      )}
    </div>
  </div>
);

const ResultCard = ({ label, value, colorClass = "text-slate-900", icon: Icon }: any) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-start gap-2 hover:border-emerald-200 transition-all">
    <div className="flex items-center justify-between w-full">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      {Icon && <Icon className="w-4 h-4 text-slate-300" />}
    </div>
    <p className={`text-xl font-bold ${colorClass} truncate w-full`}>{value}</p>
  </div>
);

export default function App() {
  const [scenario, setScenario] = useState<ScenarioData>(() => {
    try {
      const saved = localStorage.getItem('boinolucro_scenario');
      // Inicializa com Novilha por padrão se não houver salvo
      return saved ? JSON.parse(saved) : SCENARIO_DEFAULTS.novilha;
    } catch {
      return SCENARIO_DEFAULTS.novilha;
    }
  });
  const [activeScenarioType, setActiveScenarioType] = useState<ScenarioType | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    localStorage.setItem('boinolucro_scenario', JSON.stringify(scenario));
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

    const projections: ProjectionRow[] = PERIODOS.map(dias => {
      const meses = dias / 30;
      const pesoFinal = pesoInicial + (gmd * dias);
      const arrobasCarneLiquida = (pesoFinal * (rendimentoCarcaca / 100)) / KILOS_POR_ARROBA_CARNE;
      const custoManutencao = gastoDiario * dias;
      const custoTotalPeriodo = custoTotalAquisicao + custoManutencao;
      const receitaTotal = arrobasCarneLiquida * precoVendaArroba;
      const lucroPrejuizo = receitaTotal - custoTotalPeriodo;
      const roi = custoTotalPeriodo > 0 ? (lucroPrejuizo / custoTotalPeriodo) * 100 : 0;
      const rentabilidadeMensal = meses > 0 ? roi / meses : 0;

      return {
        dias,
        pesoFinal,
        arrobasCarneLiquida,
        custoTotalPeriodo,
        receitaTotal,
        lucroPrejuizo,
        rentabilidadeMensal,
        custoPorArrobaProduzida: 0
      };
    });

    return {
      arrobasBrutas,
      precoArrobaBase,
      custoTotalAquisicao,
      custoPorArrobaAquisicao,
      projections
    };
  }, [scenario]);

  const runAiAnalysis = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setAiAnalysis("Erro: Chave de API não configurada.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Aja como um consultor sênior de pecuária. Avalie se esta compra é lucrativa:
        - Nome do App: Boi no Lucro
        - Preço Compra: R$ ${scenario.preco} (${scenario.peso}kg)
        - Custo Entrada c/ Frete e Taxas: R$ ${calculations.custoTotalAquisicao.toFixed(2)}
        - Custo por @ de entrada: R$ ${calculations.custoPorArrobaAquisicao.toFixed(2)}
        - Ganho diário: ${scenario.gmd}kg/dia | Custo dia: R$ ${scenario.gastoDiario}
        - Expectativa de venda: R$ ${scenario.precoVendaArroba}/@

        Analise em português:
        1. O ágio de compra permite lucro?
        2. Qual o melhor prazo de saída?
        3. Veredito: COMPRAR ou NEGOCIAR.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiAnalysis(response.text || 'Análise indisponível.');
    } catch (error) {
      setAiAnalysis('Falha na consulta. Tente novamente mais tarde.');
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
            <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-xl shadow-emerald-100">
              <CowIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Boi no Lucro</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-lg leading-relaxed">
            Sua calculadora de viabilidade. Descubra se o preço do boi permite lucro real após os custos de manutenção.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {(['novilha', 'boi_magro', 'vaca_magra'] as ScenarioType[]).map(type => (
            <button 
              key={type}
              onClick={() => loadScenarioType(type)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeScenarioType === type ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500'}`}
            >
              {type === 'novilha' ? 'Novilha' : type === 'boi_magro' ? 'Boi' : 'Vaca'}
            </button>
          ))}
          <button 
            onClick={clearFields}
            className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Custos de Compra
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Preço Compra" id="preco" value={scenario.preco} onChange={(v:string) => updateScenario('preco', v)} prefix="R$" />
                <InputField label="Peso Vivo" id="peso" value={scenario.peso} onChange={(v:string) => updateScenario('peso', v)} suffix="kg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Frete Total" id="frete" value={scenario.frete} onChange={(v:string) => updateScenario('frete', v)} prefix="R$" />
                <InputField label="Comissão (%)" id="comissao" value={scenario.comissao} onChange={(v:string) => updateScenario('comissao', v)} suffix="%" />
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manutenção</p>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Ganho/Dia (kg)" id="gmd" value={scenario.gmd} onChange={(v:string) => updateScenario('gmd', v)} />
                  <InputField label="Custo/Dia" id="gastoDiario" value={scenario.gastoDiario} onChange={(v:string) => updateScenario('gastoDiario', v)} prefix="R$" />
                </div>
                <InputField label="Preço Venda (@)" id="precoVenda" value={scenario.precoVendaArroba} onChange={(v:string) => updateScenario('precoVendaArroba', v)} prefix="R$" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
            <CowIcon className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-emerald-400" />
                Parecer Técnico
              </h3>
              <p className="text-slate-400 text-sm mb-6">Nossa IA analisa o ágio da compra e os riscos do negócio para você.</p>
              <button 
                onClick={runAiAnalysis}
                disabled={isAnalyzing || !scenario.preco}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                {isAnalyzing ? 'Consultando...' : 'Consulte nosso especialista'}
              </button>
              {aiAnalysis && (
                <div className="mt-6 p-4 bg-slate-800 rounded-2xl text-sm border border-slate-700 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-[10px] tracking-widest uppercase">
                    <Info className="w-3 h-3" /> ANÁLISE BOI NO LUCRO
                  </div>
                  <p className="text-slate-200 italic leading-relaxed">{aiAnalysis}</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="lg:col-span-8 space-y-6">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard label="Peso Inicial (@)" value={`${calculations.arrobasBrutas.toFixed(2)} @`} icon={Weight} />
            <ResultCard label="Preço @ (Puro)" value={formatCurrency(calculations.precoArrobaBase)} />
            <ResultCard label="Invest. Total" value={formatCurrency(calculations.custoTotalAquisicao)} colorClass="text-emerald-600" icon={ArrowUpRight} />
            <ResultCard label="Custo @ Entrada" value={formatCurrency(calculations.custoPorArrobaAquisicao)} colorClass="text-indigo-600" />
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Cenários de Engorda</h2>
              <span className="text-[10px] font-bold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full tracking-wider">MARGENS PROJETADAS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Período</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Peso Final</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">@ de Carne</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Custo Tot.</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Lucro Est.</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Rent./Mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculations.projections.map((row) => (
                    <tr key={row.dias} className={`hover:bg-slate-50 transition-colors ${row.dias === 120 ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{row.dias} dias</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.pesoFinal.toFixed(1)} kg</td>
                      <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{row.arrobasCarneLiquida.toFixed(2)} @</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatCurrency(row.custoTotalPeriodo)}</td>
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
          </section>
        </main>
      </div>
    </div>
  );
}
