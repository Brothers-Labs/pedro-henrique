/** Tamanho máximo do comprovante: sobra para um print de celular ou um PDF do banco. */
export const MAX_RECEIPT_SIZE_IN_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_RECEIPT_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
];

/** Valor do atributo `accept` do campo de arquivo. */
export const RECEIPT_ACCEPT_ATTRIBUTE = ACCEPTED_RECEIPT_TYPES.join(',');

/**
 * Confere o comprovante antes do envio e devolve o motivo da recusa, ou `null`.
 *
 * O `accept` do campo só sugere os tipos ao seletor de arquivos — arrastar e
 * soltar ou "Todos os arquivos" passam por ele —, então a conferência é aqui.
 * O servidor confere de novo.
 */
export function validateReceipt(file: File): string | null {
  if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
    return 'Envie o comprovante como imagem (PNG, JPG ou WEBP) ou PDF.';
  }

  if (file.size === 0) {
    return 'Este arquivo está vazio. Escolha o comprovante de novo.';
  }

  if (file.size > MAX_RECEIPT_SIZE_IN_BYTES) {
    return 'O comprovante passa de 5 MB. Envie um print ou um PDF menor.';
  }

  return null;
}
