import { BufferAttribute, BufferGeometry, Matrix4, type Object3D, Vector3 } from 'three';

import { createFrame, sampleFrame, worldPoint, type Course, type CourseFrame, type CourseSample } from '../course/course-geometry';

/** Um corte da faixa: de um ponto (lado, altura) até outro, no referencial da pista. */
export interface RibbonEdge {
  readonly fromLateral: number;
  readonly fromHeight: number;
  readonly toLateral: number;
  readonly toHeight: number;
}

const scratchFrame = createFrame();
const scratchPoint = { x: 0, y: 0, z: 0 };
const xAxis = new Vector3();
const yAxis = new Vector3();
const zAxis = new Vector3();
const basis = new Matrix4();

/**
 * Pontos da linha central prontos para virar faixa.
 *
 * Na arena o primeiro ponto se repete no fim, com a distância da volta
 * inteira: a textura não dá um pulo para trás no último pedaço.
 */
export function ribbonSamples(course: Course): readonly CourseSample[] {
  if (!course.isCircuit) {
    return course.samples;
  }

  return [...course.samples, { ...course.samples[0], distance: course.length }];
}

/**
 * Faixa que acompanha a pista inteira, com o mesmo corte em todo ponto.
 *
 * O corte vai da esquerda para a direita de quem corre: assim a face vira
 * para o "em cima" da pista.
 *
 * É assim que nascem o asfalto, as laterais, o fundo e as luzes de neon:
 * no looping ela gira junto com o "em cima" da pista. `isSegmentShown` corta
 * os pedaços que não existem — os buracos.
 */
export function buildRibbon(
  samples: readonly CourseSample[],
  edge: RibbonEdge,
  textureLength: number,
  isSegmentShown: (startDistance: number, endDistance: number) => boolean,
): BufferGeometry {
  const count = samples.length;
  const positions = new Float32Array(count * 2 * 3);
  const uvs = new Float32Array(count * 2 * 2);
  const indices: number[] = [];

  samples.forEach((sample, index) => {
    writeVertex(positions, index * 2, sample, edge.fromLateral, edge.fromHeight);
    writeVertex(positions, index * 2 + 1, sample, edge.toLateral, edge.toHeight);
    uvs.set([0, sample.distance / textureLength, 1, sample.distance / textureLength], index * 4);
  });

  for (let index = 0; index < count - 1; index += 1) {
    if (!isSegmentShown(samples[index].distance, samples[index + 1].distance)) {
      continue;
    }

    const a = index * 2;

    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  return finish(positions, uvs, indices);
}

/**
 * Remendo deitado na pista entre duas distâncias: largada, turbo, rampa.
 *
 * `heightAt` recebe de 0 a 1 ao longo do remendo; a rampa usa isso para
 * subir.
 */
export function buildPatch(
  course: Course,
  fromDistance: number,
  toDistance: number,
  fromLateral: number,
  toLateral: number,
  heightAt: (progress: number) => number = () => 0,
  steps = 6,
): BufferGeometry {
  const positions = new Float32Array((steps + 1) * 2 * 3);
  const uvs = new Float32Array((steps + 1) * 2 * 2);
  const indices: number[] = [];

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const frame = sampleFrame(course, fromDistance + (toDistance - fromDistance) * progress, scratchFrame);
    const height = heightAt(progress);

    writeVertex(positions, step * 2, frame, fromLateral, height);
    writeVertex(positions, step * 2 + 1, frame, toLateral, height);
    uvs.set([0, progress, 1, progress], step * 4);

    if (step < steps) {
      const a = step * 2;

      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  return finish(positions, uvs, indices);
}

/**
 * Põe um objeto em pé na pista: a frente dele olha para onde a pista vai e
 * o alto dele aponta para o "em cima" dela.
 */
export function placeOnCourse(object: Object3D, frame: CourseFrame, lateral: number, height: number): void {
  worldPoint(frame, lateral, height, scratchPoint);
  object.position.set(scratchPoint.x, scratchPoint.y, scratchPoint.z);
  object.quaternion.setFromRotationMatrix(courseBasis(frame));
}

/** Mesma pose, numa matriz: é o que as malhas instanciadas recebem. */
export function courseMatrix(frame: CourseFrame, lateral: number, height: number, out: Matrix4): Matrix4 {
  worldPoint(frame, lateral, height, scratchPoint);
  out.copy(courseBasis(frame));
  out.setPosition(scratchPoint.x, scratchPoint.y, scratchPoint.z);

  return out;
}

/**
 * Base da pose: o x local é a esquerda de quem corre, o y é o "em cima" e o
 * z é a frente. Esquerda, e não direita, para os três eixos formarem uma
 * rotação de verdade (cima × frente = esquerda).
 */
function courseBasis(frame: CourseFrame): Matrix4 {
  xAxis.set(-frame.rightX, -frame.rightY, -frame.rightZ);
  yAxis.set(frame.upX, frame.upY, frame.upZ);
  zAxis.set(frame.tangentX, frame.tangentY, frame.tangentZ);

  return basis.makeBasis(xAxis, yAxis, zAxis);
}

function writeVertex(positions: Float32Array, vertex: number, frame: CourseFrame | CourseSample, lateral: number, height: number): void {
  positions[vertex * 3] = frame.x + frame.rightX * lateral + frame.upX * height;
  positions[vertex * 3 + 1] = frame.y + frame.rightY * lateral + frame.upY * height;
  positions[vertex * 3 + 2] = frame.z + frame.rightZ * lateral + frame.upZ * height;
}

function finish(positions: Float32Array, uvs: Float32Array, indices: readonly number[]): BufferGeometry {
  const geometry = new BufferGeometry();

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  const isLarge = positions.length / 3 > 65535;

  geometry.setIndex(new BufferAttribute(isLarge ? new Uint32Array(indices) : new Uint16Array(indices), 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}
