import * as THREE from 'three';

// Silueta de una mochila kankuama, de ombligo a boca: base redonda, cuerpo
// abarrilado, boca recogida. En radio/altura, para tornear alrededor del eje Y.
// Una mochila es casi tan ancha como alta (relacion ~1.05). Estirada de mas
// deja de leerse como mochila y se vuelve jarron.
const SILUETA = [
  [0.001, -0.86],
  [0.36, -0.845],
  [0.62, -0.75],
  [0.735, -0.57],
  [0.775, -0.34],
  [0.785, -0.05],
  [0.785, 0.25],
  [0.77, 0.50],
  [0.725, 0.70],
  [0.66, 0.83],
  [0.62, 0.89],
];

// Remuestrear por longitud de arco es obligatorio: LatheGeometry reparte v
// segun el indice del punto, no segun la distancia. Con los puntos crudos las
// puntadas saldrian aplastadas en la base y estiradas en el cuerpo.
export function perfilMochila(pasos = 220) {
  const curva = new THREE.SplineCurve(SILUETA.map(([x, y]) => new THREE.Vector2(x, y)));
  return curva.getSpacedPoints(pasos);
}

export function largoDeArco(puntos) {
  let l = 0;
  for (let i = 1; i < puntos.length; i++) l += puntos[i].distanceTo(puntos[i - 1]);
  return l;
}

// La gasa sale de un costado de la boca, sube y cruza al otro. Se teje aparte
// y despues se une, asi que en el telar tambien va como pieza propia.
export function curvaGasa() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.57, 0.76, 0.06),
    new THREE.Vector3(-0.74, 1.20, 0.02),
    new THREE.Vector3(-0.55, 1.66, 0.0),
    new THREE.Vector3(-0.05, 1.84, 0.0),
    new THREE.Vector3(0.46, 1.68, 0.0),
    new THREE.Vector3(0.70, 1.24, 0.02),
    new THREE.Vector3(0.57, 0.76, 0.06),
  ]);
}
