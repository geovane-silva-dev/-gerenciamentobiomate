import React, { useMemo, useState } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { formatBRL, formatDate } from '../utils';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Calculator,
  TrendingUp,
  LineChart,
  Target,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Legend
} from 'recharts';

export default function ReportsView() {
  const {
    sales,
    products,
    expenses,
    productionBatches,
    hideValues
  } = useBiomate();

  const [selectedProduct, setSelectedProduct] = useState('all');

  // Filter list
  const filteredSales = useMemo(() => {
    if (selectedProduct === 'all') return sales;
    return sales.filter(s => s.productId === selectedProduct);
  }, [sales, selectedProduct]);

  // General Summary Totals
  const financials = useMemo(() => {
    const revenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const prodCosts = filteredSales.reduce((acc, s) => acc + s.productionCost, 0);
    const profit = filteredSales.reduce((acc, s) => acc + s.profit, 0);
    const avgMargin = revenue > 0 ? (profit / revenue) * 105 : 0; // margin index

    // All expenses
    const outlays = expenses.reduce((acc, e) => acc + e.amount, 0);

    return {
      revenue,
      prodCosts,
      profit,
      avgMargin,
      outlays
    };
  }, [filteredSales, expenses]);

  // Sales per product distribution bar chart
  const productsPerformanceData = useMemo(() => {
    return products.map(p => {
      // Find total sales quantity
      const quantity = sales
        .filter(s => s.productId === p.id)
        .reduce((acc, s) => acc + s.quantity, 0);

      const value = sales
        .filter(s => s.productId === p.id)
        .reduce((acc, s) => acc + s.totalAmount, 0);

      return {
        name: p.name,
        'Qtd Vendida': quantity,
        'Faturamento (R$)': value
      };
    }).sort((a,b) => b['Qtd Vendida'] - a['Qtd Vendida']);
  }, [sales, products]);

  // Monthly or chronological composto chart comparing Revenue vs. Cost
  const composedReportData = useMemo(() => {
    const grouped: { [date: string]: { revenue: number; cost: number; profit: number } } = {};
    
    // Group last 5 recorded days
    const uniqueDays = Array.from(new Set(sales.map(s => s.date.split('T')[0]))).sort().slice(-5) as string[];
    
    uniqueDays.forEach(day => {
      grouped[day] = { revenue: 0, cost: 0, profit: 0 };
    });

    sales.forEach(s => {
      const day = s.date.split('T')[0];
      if (grouped[day] !== undefined) {
        grouped[day].revenue += s.totalAmount;
        grouped[day].cost += s.productionCost;
        grouped[day].profit += s.profit;
      }
    });

    return Object.keys(grouped).map(day => {
      const [year, month, dStr] = day.split('-');
      return {
        date: `${dStr}/${month}`,
        'Faturamento': grouped[day].revenue,
        'Custo': grouped[day].cost,
        'Margem Líquida': grouped[day].profit
      };
    });
  }, [sales]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    // Basic CSV assembler
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Data,Cliente,Produto,Quantidade,preco_unidade,total_vendido,custo_estimado,margem_lucro_liquido\n';
    
    sales.forEach(s => {
      const prod = products.find(p => p.id === s.productId);
      csvContent += `${s.date.split('T')[0]},"${s.customerName}","${prod ? prod.name : 'Outros'}",${s.quantity},${s.unitPrice},${s.totalAmount},${s.productionCost},${s.profit}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'relatorio_biomate_vendas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-50">Relatórios de Rentabilidade</h2>
          <p className="text-xs text-gray-500 dark:text-emerald-400 font-medium">Balanços de performance, vendas consolidadas e faturamento tributário.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#122c24] border border-emerald-900/5 dark:border-emerald-800/10 hover:shadow text-gray-700 dark:text-emerald-100 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#00C984]" />
            <span>Exportar Planilha</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#122c24] border border-emerald-900/5 dark:border-emerald-800/10 hover:shadow text-gray-700 dark:text-emerald-100 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-600 dark:text-[#00C984]" />
            <span>Imprimir Invoice</span>
          </button>
        </div>
      </div>

      {/* Analytical calculations indicators */}
      <div className="bg-white dark:bg-[#122c24] p-6 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex flex-col md:flex-row gap-6 md:divide-x md:divide-emerald-900/5">
        <div className="flex-1 space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-[#00C984]" />
            <span>Estratégia de Performance</span>
          </span>
          <p className="text-xs text-gray-500 leading-relaxed dark:text-emerald-400">
            Abaixo estão os indicadores consolidados baseados no faturamento de insumos biológicos. Ajuste o filtro rápido à direita para focar em indicadores específicos de um produto.
          </p>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 mt-3">Análise por Produto</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-xs font-bold bg-[#F0FAF7] dark:bg-emerald-950/40 border-none px-3 py-2 rounded-lg text-gray-750 dark:text-white"
            >
              <option value="all">TODOS OS PRODUTOS</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic calculation values */}
        <div className="md:pl-6 w-full md:w-80 space-y-3.5 pt-4 md:pt-0">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold uppercase">Faturamento Conquistado:</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white">{formatBRL(financials.revenue, hideValues)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold uppercase">Custos Fabris Insumidos:</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white text-amber-700">{formatBRL(financials.prodCosts, hideValues)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold uppercase">Despesas Administrativas:</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white text-rose-500">{formatBRL(financials.outlays, hideValues)}</span>
          </div>
          <div className="border-t border-gray-100 dark:border-emerald-950 pt-3 flex justify-between items-center text-sm">
            <span className="text-gray-800 dark:text-emerald-100 font-black uppercase">Excesso Líquido:</span>
            <span className="font-mono font-black text-[#00965e] dark:text-[#00C984]">
              {formatBRL(financials.revenue - financials.prodCosts - financials.outlays, hideValues)}
            </span>
          </div>
        </div>
      </div>

      {/* Composed Chart: Revenue vs Cost chronological comparative */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#122c24] p-5 sm:p-6 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-emerald-50 text-base">Timeline de Faturamento</h3>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Comparativo entre faturamento, insumo de fabricação e margens líquidas</p>
          </div>

          <div className="w-full h-64 pt-2">
            {composedReportData.length === 0 ? (
              <div className="text-xs text-gray-400 text-center uppercase py-10">Faltam registros de vendas cronológicos</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={composedReportData} margin={{ left: -15, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#8A9F9A" fontSize={10} />
                  <YAxis stroke="#8A9F9A" fontSize={9} tickFormatter={(value) => formatBRL(value, hideValues)} />
                  <Tooltip formatter={(value: any) => formatBRL(value, hideValues)} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Bar dataKey="Faturamento" fill="#00C984" barSize={25} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Custo" fill="#59391D" barSize={15} radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="Margem Líquida" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quantidade vendida por produto rank */}
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-emerald-50 text-base">Produtos Líderes de Venda</h3>
            <p className="text-[10px] text-gray-450 dark:text-emerald-400/60 mt-0.5 uppercase font-medium">RANK DE QUANTIDADE ABSORVIDA POR COMPRADORES</p>
          </div>

          <div className="w-full h-52 my-4">
            {productsPerformanceData.length === 0 ? (
              <div className="text-xs text-gray-400 text-center uppercase py-10">Sem performance faturada</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productsPerformanceData} layout="vertical" margin={{ left: 15, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="#8A9F9A" fontSize={8} />
                  <YAxis type="category" dataKey="name" stroke="#8A9F9A" fontSize={8} width={75} />
                  <Tooltip />
                  <Bar dataKey="Qtd Vendida" fill="#00C984" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 border-t border-gray-50 dark:border-emerald-950 pt-3">
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold uppercase">
              <span>Produto</span>
              <span>Litragem/Quilos Vendidos</span>
            </div>
            {productsPerformanceData.slice(0, 3).map((p, index) => (
              <div key={p.name} className="flex items-center justify-between text-xs font-semibold py-1">
                <span className="flex items-center gap-2 text-gray-700 dark:text-emerald-250">
                  <span className="font-mono text-[10px] text-emerald-800 dark:text-[#00C984]">#0{index + 1}</span>
                  <span className="truncate max-w-40">{p.name}</span>
                </span>
                <span className="font-mono font-bold text-[#00965e] dark:text-[#00C984]">{p['Qtd Vendida']} un</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive balance sheet summaries table */}
      <div className="bg-white dark:bg-[#122c24] p-6 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 dark:text-emerald-50 text-base">Diário de Controle Industrial & Vendas Integrados</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-emerald-150">
            <thead>
              <tr className="border-b border-gray-100 dark:border-emerald-950 pb-2 text-gray-400 font-bold uppercase">
                <th className="py-2">Ref ID</th>
                <th className="py-2">Data Lançamento</th>
                <th className="py-2">Comprador Tributado</th>
                <th className="py-2 text-center font-mono">Unidades</th>
                <th className="py-2 text-center">Insumo Base de Venda</th>
                <th className="py-2 text-center">Preço por Un.</th>
                <th className="py-2 text-right">Faturamento Consolidado</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => {
                const prod = products.find(p => p.id === s.productId);
                return (
                  <tr key={s.id} className="border-b border-gray-50 dark:border-emerald-950/20 py-2.5 hover:bg-[#F0FAF7]/10 transition-colors">
                    <td className="py-2.5 font-mono text-gray-400 text-[10px]">{s.id}</td>
                    <td className="py-2.5 font-mono text-gray-400">{formatDate(s.date)}</td>
                    <td className="py-2.5 font-bold text-gray-850 dark:text-white">{s.customerName}</td>
                    <td className="py-2.5 text-center font-mono font-bold">{s.quantity} {prod?.unit || ''}</td>
                    <td className="py-2.5 text-center font-medium">{prod ? prod.name : 'Outros'}</td>
                    <td className="py-2.5 text-center font-mono">{formatBRL(s.unitPrice, hideValues)}</td>
                    <td className="py-2.5 text-right font-black font-mono text-[#00965e] dark:text-[#00C984]">{formatBRL(s.totalAmount, hideValues)}</td>
                  </tr>
                );
              })}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-400">Nenhum lançamento no livro mercantil.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
