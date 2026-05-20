/**
 * Utilidades de formatação para o ERP BIOMATE
 */

/**
 * Formata valores para o formato de moeda brasileiro (BRL R$).
 * Se hide estiver habilitado, mascara o valor.
 */
export const formatBRL = (value: number, hide: boolean): string => {
  if (hide) {
    return 'R$ ••••';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata datas ISO para exibição humana (ex: 19/05/2026 às 13:45)
 */
export const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '---';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (e) {
    return '---';
  }
};

/**
 * Formata datas curtas sem hora (ex: 19 Mai)
 */
export const formatShortDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  } catch {
    return dateStr;
  }
};

/**
 * Retorna os nomes dos clientes únicos cadastrados nas vendas
 */
export const getUniqueClients = (sales: any[]): string[] => {
  const clients = sales.map(s => s.customerName).filter(Boolean);
  return Array.from(new Set(clients)) as string[];
};

/**
 * Retorna uma estampa ou icone representativo de acordo com a categoria
 */
export const getCategoryEmoji = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  if (name.includes('bioestimu') || name.includes('estimu')) return '🧪';
  if (name.includes('fertiliz') || name.includes('foliar')) return '🍂';
  if (name.includes('proteto') || name.includes('shield') || name.includes('ecolog')) return '🛡️';
  if (name.includes('solo') || name.includes('humus') || name.includes('corret')) return '🪴';
  return '📦';
};
