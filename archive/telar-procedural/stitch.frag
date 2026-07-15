// ---------------------------------------------------------------------------
// TEJIDO KANKUAMO PROCEDURAL
//
// No es una textura de tela ni un normal map pintado. Cada puntada se
// construye como geometria: tres tramos de hilo (dos piernas en V mas la
// cadeneta superior), cada uno con seccion transversal semicircular. La altura
// del hilo en cada pixel sale de esa seccion, y la normal sale de la derivada
// analitica de la altura. Por eso la luz se comporta como en fibra real.
//
// La espiral: una mochila se teje con un solo hilo que sube dando vueltas y
// nunca cierra la fila. Eso es exactamente `fila = v * FILAS + u`: al dar una
// vuelta completa (u de 0 a 1) la fila sube 1. En la costura queda un salto de
// media puntada, igual que en la mochila fisica.
// ---------------------------------------------------------------------------

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNrm;

uniform float uRows;      // filas de puntada a lo largo del perfil
uniform float uCols;      // puntadas por vuelta
uniform float uYarn;      // radio del hilo, en unidades de celda
uniform float uBump;      // fuerza del relieve
uniform float uWeave;     // 0..1 : cuanto de la mochila ya esta tejido
uniform int   uPattern;   // dibujo: 0 caracol, 1 diente de tigre, 2 rombo, 3 camino
uniform vec3  uGround;    // fique crudo, sin teñir
uniform vec3  uDyeA;
uniform vec3  uDyeB;
uniform vec3  uKeyDir;    // luz de la puerta
uniform vec3  uKeyCol;
uniform vec3  uFillCol;   // rebote frio de la sombra
uniform float uFuzz;      // pelusa de la fibra
uniform float uSeed;
uniform float uUvFlip;    // 1.0 para la gasa: el tubo trae las UV al reves

// --- ruido barato -----------------------------------------------------------
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45) + uSeed);
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1, 0));
  float c = hash21(i + vec2(0, 1)), d = hash21(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// --- distancia a un tramo de hilo -------------------------------------------
float sdSeg(vec2 p, vec2 a, vec2 b, out vec2 closest, out vec2 dir) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  closest = a + ba * h;
  dir = normalize(ba);
  return length(p - closest);
}

// Acumula un tramo de hilo sobre el campo de altura.
// Seccion semicircular: alto = sqrt(r^2 - d^2), asi que la pendiente es
// dh/dp = -(p - c) / alto  --  gradiente analitico, sin diferencias finitas.
void yarn(vec2 p, vec2 a, vec2 b, float r,
          inout float bestH, inout vec2 bestG, inout vec2 bestDir) {
  vec2 c, dir;
  float d = sdSeg(p, a, b, c, dir);
  if (d >= r) return;
  float h = sqrt(max(r * r - d * d, 1e-6));
  if (h <= bestH) return;   // el hilo de encima tapa al de abajo
  bestH = h;
  bestG = -(p - c) / h;
  bestDir = dir;
}

// Una puntada: la V (dos piernas que se abren hacia arriba desde un punto
// bajo) mas la cadeneta que la corona. Si las piernas se abren hacia abajo
// salen flechas, no tejido.
void stitch(vec2 p, float r, inout float h, inout vec2 g, inout vec2 dir) {
  yarn(p, vec2(0.0, -0.38), vec2(-0.27, 0.16), r, h, g, dir);
  yarn(p, vec2(0.0, -0.38), vec2( 0.27, 0.16), r, h, g, dir);
  yarn(p, vec2(-0.52, 0.34), vec2(0.52, 0.34), r, h, g, dir);
}

// --- dibujos kankuamos ------------------------------------------------------
// Se evaluan sobre indices enteros de puntada: los dibujos tejidos tienen la
// resolucion de la puntada, no del pixel. Por eso salen escalonados de verdad.
float dibujo(vec2 s, int which) {
  if (which == 0) {
    // caracol: la espiral, el mismo gesto con que nace la mochila
    vec2 q = vec2(mod(s.x, 18.0) - 9.0, mod(s.y, 18.0) - 9.0);
    float ang = atan(q.y, q.x);
    float rad = length(q);
    float sp = fract((rad - ang / 6.28318 * 3.2) / 3.2);
    return step(sp, 0.5) * step(rad, 8.0);
  } else if (which == 1) {
    // diente de tigre: el zigzag
    float tri = abs(mod(s.x, 14.0) - 7.0);
    return step(mod(s.y - tri, 16.0), 3.0);
  } else if (which == 2) {
    // rombo / ojo
    float dx = abs(mod(s.x, 16.0) - 8.0);
    float dy = abs(mod(s.y, 16.0) - 8.0);
    float m = dx + dy;
    return step(m, 3.0) + step(5.0, m) * step(m, 6.5);
  }
  // camino: franjas con escalones
  float band = mod(s.y, 20.0);
  float stepped = step(mod(s.x + floor(s.y / 4.0) * 2.0, 10.0), 4.0);
  return step(band, 2.0) + step(14.0, band) * step(band, 17.0) * stepped;
}

// Kajiya-Kay: brillo anisotropico a lo largo del hilo. Es lo que hace que se
// lea como hebra y no como plastico.
float sheen(vec3 t, vec3 l, vec3 v, float e) {
  float tl = dot(t, l), tv = dot(t, v);
  float a = sqrt(max(1.0 - tl * tl, 0.0));
  float b = sqrt(max(1.0 - tv * tv, 0.0));
  return pow(max(a * b - tl * tv, 0.0), e);
}

void main() {
  // el cuerpo es un torneado (u = vuelta) y la gasa un tubo (u = largo):
  // se normalizan aqui para que el resto del shader no tenga que saberlo
  vec2 uv = mix(vUv, vUv.yx, uUvFlip);

  // --- coordenada en espiral ---
  float rowf = uv.y * uRows + uv.x;
  float woven = uWeave * (uRows + 1.0);
  if (rowf > woven) discard;              // aun no tejido

  float ri = floor(rowf);
  // media puntada de desfase por fila: las puntadas caen entre las de abajo
  float colf = uv.x * uCols + ri * 0.5;

  float ci = floor(colf);

  // --- campo de altura del hilo sobre el vecindario 3x3 de puntadas ---
  // Cada fila vecina lleva su propio desfase de media puntada, asi que su
  // rejilla no coincide con la nuestra: hay que recalcular la celda fila por
  // fila en vez de restar un offset fijo.
  float h = 0.0;
  vec2  g = vec2(0.0);
  vec2  ydir = vec2(1.0, 0.0);
  for (int j = -1; j <= 1; j++) {
    float fj = float(j);
    float colfj = colf + fj * 0.5;
    float basej = floor(colfj);
    for (int i = -1; i <= 1; i++) {
      float fi = float(i);
      vec2 celda = vec2(basej + fi, ri + fj);
      vec2 p = vec2(fract(colfj) - 0.5 - fi, fract(rowf) - 0.5 - fj);
      // Nadie teje dos puntadas idénticas. Este temblor es lo que separa un
      // tejido a mano de una malla generada.
      vec2 tiemble = (vec2(hash21(celda), hash21(celda.yx + 11.1)) - 0.5) * 0.11;
      stitch(p - tiemble, uYarn, h, g, ydir);
    }
  }

  // el hueco entre puntadas deja ver el interior: la mochila es calada
  float solid = smoothstep(0.0, 0.045, h);
  if (solid < 0.02) discard;

  // --- marco tangente (vale para el cuerpo y para la gasa) ---
  vec3 dp1 = dFdx(vWorldPos), dp2 = dFdy(vWorldPos);
  vec2 du1 = dFdx(uv), du2 = dFdy(uv);
  vec3 N = normalize(vWorldNrm);
  if (!gl_FrontFacing) N = -N;

  float det = du1.x * du2.y - du2.x * du1.y;
  vec3 T = normalize((dp1 * du2.y - dp2 * du1.y) * sign(det) + 1e-8);
  vec3 B = normalize(cross(N, T));

  // --- normal perturbada por la geometria del hilo ---
  vec3 n = normalize(N - (T * g.x + B * g.y) * uBump);

  // pelusa del fique: la fibra es hirsuta, no lisa
  float fz = vnoise(vec2(colf, rowf) * 26.0) - 0.5;
  n = normalize(n + (T * fz + B * (vnoise(vec2(rowf, colf) * 31.0) - 0.5)) * uFuzz);

  vec3 Tw = normalize(T * ydir.x + B * ydir.y);   // hebra, en mundo
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uKeyDir);

  // --- color del hilo ---
  float d = dibujo(vec2(ci, ri), uPattern);
  vec3 base = mix(uGround, uDyeA, clamp(d, 0.0, 1.0));
  float d2 = dibujo(vec2(ci, ri) + vec2(0.0, 7.0), uPattern);
  base = mix(base, uDyeB, clamp(d2 * 0.55, 0.0, 1.0) * step(0.5, 1.0 - d));

  // teñido a mano: ninguna hebra queda del mismo tono
  base *= 0.82 + 0.28 * hash21(vec2(ci, ri) * 1.7);
  base *= 0.90 + 0.20 * vnoise(vec2(ci, ri) * 0.4);

  // --- luz ---
  float lam = max(dot(n, L), 0.0);
  float wrap = max((dot(n, L) + 0.35) / 1.35, 0.0);   // la fibra deja pasar luz
  vec3 diff = uKeyCol * mix(lam, wrap, 0.55);
  vec3 fill = uFillCol * (0.45 + 0.55 * max(dot(n, vec3(0.0, 1.0, 0.0)), 0.0));

  vec3 col = base * (diff + fill);
  // El fique brilla poco: es fibra corta y mate. Pasado de 0.15 esto deja de
  // ser hilo y empieza a ser plastico.
  col += uKeyCol * sheen(Tw, L, V, 14.0) * 0.13;

  // oclusion en el fondo de la puntada
  col *= 0.45 + 0.55 * smoothstep(0.0, uYarn * 0.9, h);

  // halo de fibra en el contorno
  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  col += uKeyCol * fres * 0.14;

  // la puntada que se esta tejiendo ahora mismo va caliente
  float edge = smoothstep(2.0, 0.0, woven - rowf);
  col = mix(col, uKeyCol * 1.5, edge * 0.28);

  gl_FragColor = vec4(col, solid);

  // Sin esto el shader escribe lineal directo a un framebuffer sRGB: el añil se
  // hunde a negro y el fique se va a dorado metalico. ShaderMaterial no lo
  // aplica solo, hay que pedirlo.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
