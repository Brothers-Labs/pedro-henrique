import { MAX_RECEIPT_SIZE_IN_BYTES, validateReceipt } from './pix-receipt';

function fakeFile(type: string, size: number, name = 'comprovante'): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateReceipt', () => {
  it('aceita imagens e PDF dentro do limite', () => {
    expect(validateReceipt(fakeFile('image/png', 1024))).toBeNull();
    expect(validateReceipt(fakeFile('image/jpeg', 1024))).toBeNull();
    expect(validateReceipt(fakeFile('image/webp', 1024))).toBeNull();
    expect(validateReceipt(fakeFile('application/pdf', MAX_RECEIPT_SIZE_IN_BYTES))).toBeNull();
  });

  it('recusa outros formatos', () => {
    expect(validateReceipt(fakeFile('text/plain', 10))).toContain('imagem');
    expect(validateReceipt(fakeFile('', 10))).toContain('imagem');
  });

  it('recusa arquivo vazio ou grande demais', () => {
    expect(validateReceipt(fakeFile('image/png', 0))).toContain('vazio');
    expect(validateReceipt(fakeFile('image/png', MAX_RECEIPT_SIZE_IN_BYTES + 1))).toContain('5 MB');
  });
});
