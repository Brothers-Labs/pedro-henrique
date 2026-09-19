/**
 * Imagem local com as dimensões reais do arquivo.
 *
 * As medidas acompanham a imagem para que todo `<img>` do site possa declarar
 * `width`/`height` e reservar o espaço antes do download — é o que evita o
 * conteúdo pular quando a foto termina de carregar.
 */
export interface ImageAsset {
  /** Caminho servido a partir de `public/`, já pronto para uso em `src`. */
  readonly src: string;
  readonly width: number;
  readonly height: number;
}
