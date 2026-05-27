export function normalizeText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseDeliveryDays(normalized: string): string {
  if (normalized.includes('hoy')) return '0';
  if (normalized.includes('manana')) return '1';
  const match = /(\d+)\s*dia/.exec(normalized);
  return match?.[1] ?? '';
}
