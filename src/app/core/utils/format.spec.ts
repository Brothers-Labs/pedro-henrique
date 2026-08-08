import { formatDuration, formatFileSize, normalizeText } from './format';

describe('formatDuration', () => {
  it('formata minutos e segundos com dois dígitos', () => {
    expect(formatDuration(75)).toBe('1:15');
  });

  it('inclui horas quando o vídeo passa de 60 minutos', () => {
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('protege contra valores inválidos', () => {
    expect(formatDuration(Number.NaN)).toBe('0:00');
    expect(formatDuration(-10)).toBe('0:00');
  });
});

describe('formatFileSize', () => {
  it('mantém bytes sem casa decimal', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('usa vírgula como separador decimal', () => {
    expect(formatFileSize(1536)).toBe('1,5 KB');
  });

  it('sobe até a maior unidade adequada', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5,0 MB');
  });
});

describe('normalizeText', () => {
  it('remove espaços das bordas e colapsa os do meio', () => {
    expect(normalizeText('  olá   mundo  ')).toBe('olá mundo');
  });
});
