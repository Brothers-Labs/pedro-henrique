import type { ContentFile } from '../models/content.model';

/** De onde vem o JSON lido: um arquivo de conteúdo ou um mundo salvo. */
export type JsonSource = ContentFile | 'world-save';

/**
 * Erro de leitura: um JSON (de conteúdo ou de save) fora do contrato.
 *
 * A mensagem sempre diz o arquivo e o caminho do campo (`blocks.json:
 * blocks[3].hardness: deve ser no mínimo 0`), para quem edita o JSON achar o
 * erro sem abrir o código.
 */
export class ContentError extends Error {
  constructor(
    readonly file: JsonSource,
    readonly problems: readonly string[],
  ) {
    super(`${file}.json: ${problems.join(' | ')}`);
    this.name = 'ContentError';
  }
}

type JsonObject = Readonly<Record<string, unknown>>;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const CONTENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Leitor de um campo do JSON, que lembra onde está.
 *
 * Cada leitura confere o tipo e lança `ContentError` com o caminho completo
 * na primeira violação. Nada de `as` espalhado pelos parsers: o tipo de saída
 * é sempre o que foi conferido aqui.
 */
export class JsonReader {
  constructor(
    private readonly file: JsonSource,
    private readonly path: string,
    private readonly value: unknown,
  ) {}

  static root(file: JsonSource, value: unknown): JsonReader {
    return new JsonReader(file, '', value);
  }

  /** Os campos de um objeto. Falha se o valor não for objeto. */
  object(): JsonObjectReader {
    if (typeof this.value !== 'object' || this.value === null || Array.isArray(this.value)) {
      this.fail('deve ser um objeto');
    }

    return new JsonObjectReader(this.file, this.path, this.value as JsonObject);
  }

  /** Os itens de uma lista, cada um com o próprio caminho. */
  array(options: { readonly minLength?: number } = {}): readonly JsonReader[] {
    if (!Array.isArray(this.value)) {
      this.fail('deve ser uma lista');
    }

    const items: readonly unknown[] = this.value;

    if (items.length < (options.minLength ?? 0)) {
      this.fail(`deve ter pelo menos ${options.minLength} item(ns)`);
    }

    return items.map((item, index) => new JsonReader(this.file, `${this.path}[${index}]`, item));
  }

  string(options: { readonly allowEmpty?: boolean } = {}): string {
    if (typeof this.value !== 'string') {
      this.fail('deve ser um texto');
    }

    if (!options.allowEmpty && this.value.trim().length === 0) {
      this.fail('não pode ser vazio');
    }

    return this.value;
  }

  /** Id de conteúdo: kebab-case, letras minúsculas e números. */
  id(): string {
    const value = this.string();

    if (!CONTENT_ID.test(value)) {
      this.fail(`"${value}" não é um id válido (use kebab-case, como "iron-pickaxe")`);
    }

    return value;
  }

  color(): string {
    const value = this.string();

    if (!HEX_COLOR.test(value)) {
      this.fail(`"${value}" não é uma cor no formato #rrggbb`);
    }

    return value;
  }

  number(options: { readonly min?: number; readonly max?: number; readonly integer?: boolean } = {}): number {
    if (typeof this.value !== 'number' || !Number.isFinite(this.value)) {
      this.fail('deve ser um número');
    }

    const value = this.value;

    if (options.integer && !Number.isInteger(value)) {
      this.fail('deve ser um número inteiro');
    }

    if (options.min !== undefined && value < options.min) {
      this.fail(`deve ser no mínimo ${options.min}`);
    }

    if (options.max !== undefined && value > options.max) {
      this.fail(`deve ser no máximo ${options.max}`);
    }

    return value;
  }

  boolean(): boolean {
    if (typeof this.value !== 'boolean') {
      this.fail('deve ser verdadeiro ou falso');
    }

    return this.value;
  }

  /** Um dos valores permitidos, já com o tipo da união. */
  oneOf<TValue extends string>(allowed: readonly TValue[]): TValue {
    const value = this.string();
    const match = allowed.find((candidate) => candidate === value);

    if (match === undefined) {
      this.fail(`"${value}" não é permitido (use ${allowed.join(', ')})`);
    }

    return match;
  }

  get isNull(): boolean {
    return this.value === null;
  }

  fail(message: string): never {
    throw new ContentError(this.file, [problemAt(this.path, message)]);
  }
}

/** O caminho vazio é a raiz do arquivo. */
function problemAt(path: string, message: string): string {
  return `${path || 'raiz'}: ${message}`;
}

export class JsonObjectReader {
  constructor(
    private readonly file: JsonSource,
    private readonly path: string,
    private readonly fields: JsonObject,
  ) {}

  /** Campo obrigatório: não pode faltar nem ser `null`. */
  field(name: string): JsonReader {
    const value = this.fields[name];

    if (value === undefined || value === null) {
      this.fail(`campo "${name}" é obrigatório`);
    }

    return this.child(name, value);
  }

  /** Campo que pode faltar ou ser `null`; nos dois casos devolve `null`. */
  optionalField(name: string): JsonReader | null {
    const value = this.fields[name];

    return value === undefined || value === null ? null : this.child(name, value);
  }

  /** As chaves de um objeto usado como dicionário (a legenda de uma receita). */
  entries(): readonly (readonly [string, JsonReader])[] {
    return Object.entries(this.fields).map(([key, value]) => [key, this.child(key, value)] as const);
  }

  fail(message: string): never {
    throw new ContentError(this.file, [problemAt(this.path, message)]);
  }

  private child(name: string, value: unknown): JsonReader {
    return new JsonReader(this.file, this.path ? `${this.path}.${name}` : name, value);
  }
}

/** Atalhos para os campos mais comuns, sem repetir a mesma ladainha em cada parser. */
export function optionalId(object: JsonObjectReader, name: string): string | null {
  return object.optionalField(name)?.id() ?? null;
}

export function colorList(reader: JsonReader): readonly string[] {
  return reader.array({ minLength: 1 }).map((color) => color.color());
}

/** Confere que o arquivo traz a versão de schema que este código entende. */
export function readSchemaVersion(root: JsonObjectReader, expected: number): void {
  const version = root.field('schemaVersion').number({ integer: true, min: 1 });

  if (version !== expected) {
    root.fail(`schemaVersion ${version} não é suportada (esperada ${expected})`);
  }
}

/** Ids repetidos numa lista são erro: a referência ficaria ambígua. */
export function ensureUniqueIds(file: ContentFile, label: string, ids: readonly string[]): void {
  const seen = new Set<string>();
  const repeated = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));

  if (repeated.length > 0) {
    throw new ContentError(file, [`${label} com id repetido: ${[...new Set(repeated)].join(', ')}`]);
  }
}
