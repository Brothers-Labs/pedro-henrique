import {
  type Camera,
  HalfFloatType,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Tom e espaço de cor entram aqui, e não na cena: desenhando num alvo, o
 * Three.js entrega a cor linear. O corte de cores vem por último, sobre a cor
 * que a tela mostra, para cada degrau ter o mesmo tamanho aos olhos.
 */
const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform float levels;
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(map, vUv);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>

    float steps = max(levels - 1.0, 1.0);
    gl_FragColor.rgb = floor(gl_FragColor.rgb * steps + 0.5) / steps;
    gl_FragColor.a = 1.0;
  }
`;

/**
 * Corte de cores das telas retrô.
 *
 * A cena é desenhada num alvo do tamanho do quadro (já pequeno nas telas
 * retrô, então quase de graça) e copiada para a tela com poucos tons por
 * canal, como nos consoles antigos.
 */
export class RetroPass {
  private readonly target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new PlaneGeometry(2, 2);
  private readonly material: ShaderMaterial;
  private readonly size = new Vector2();
  private readonly levelsUniform: { value: number };

  constructor(levels: number) {
    this.levelsUniform = { value: levels };
    this.material = new ShaderMaterial({
      uniforms: { map: { value: this.target.texture }, levels: this.levelsUniform },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new Mesh(this.geometry, this.material);

    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  set levels(levels: number) {
    this.levelsUniform.value = levels;
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    renderer.getDrawingBufferSize(this.size);

    if (this.target.width !== this.size.x || this.target.height !== this.size.y) {
      this.target.setSize(this.size.x, this.size.y);
    }

    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.target.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
