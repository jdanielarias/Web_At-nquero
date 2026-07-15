// Pasa a fragmento todo lo que el tejido necesita para iluminarse:
// posicion y normal en espacio mundo, y la UV donde u = vuelta alrededor
// del cuerpo y v = avance a lo largo del perfil (arco, no indice).

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNrm;

void main() {
  vUv = uv;

  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNrm = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * wp;
}
