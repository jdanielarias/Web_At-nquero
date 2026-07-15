import * as THREE from 'three';
import vert from './stitch.vert?raw';
import frag from './stitch.frag?raw';
import { perfilMochila, largoDeArco, curvaGasa } from './profile.js';

// Subir esto no cuesta nada: el shader evalua un vecindario fijo de 27 tramos
// por pixel, sin importar cuantas puntadas haya. Solo cambia la escala.
const PUNTADAS_POR_VUELTA = 100;

export class Loom {
  constructor(canvas, { reduceMotion = false } = {}) {
    this.canvas = canvas;
    this.reduceMotion = reduceMotion;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    // Neutral (Khronos PBR Neutral) respeta el tono de los tintes; ACES los
    // vira y el añil se va a gris.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 0.5, 5.0);
    this.camera.lookAt(0, 0.45, 0);

    this.grupo = new THREE.Group();
    this.scene.add(this.grupo);

    this._construirMalla();

    // La mochila se corre a un lado cuando la columna de texto ocupa el centro.
    // Se traslada el grupo, no la camara: asi sigue girando sobre su propio eje.
    this.desvio = 0;
    this.desvioObjetivo = 0;

    // giro
    this.angulo = 0;
    this.velocidad = 0;
    this.arrastrando = false;
    this._ultimoX = 0;
    this._ultimoT = 0;
    this._instalarArrastre();

    // el telar: 0 = ni una puntada, 1 = mochila terminada
    this.tejido = 0;
    this.tejiendo = false;
    this.visible = false;

    this._raf = null;
    this._ultimoCuadro = 0;
    this._onResize = () => this.redimensionar();
    window.addEventListener('resize', this._onResize);
    this.redimensionar();
  }

  _uniforms(extra = {}) {
    return {
      uRows: { value: 42 },
      uCols: { value: PUNTADAS_POR_VUELTA },
      // El hilo tiene que ser lo bastante gordo para que las puntadas vecinas
      // se toquen. Por debajo de ~0.2 quedan sueltas y el resultado se lee
      // como cesteria de mimbre, no como tejido.
      uYarn: { value: 0.225 },
      uBump: { value: 1.15 },
      uWeave: { value: 0 },
      uPattern: { value: 0 },
      uGround: { value: new THREE.Color('#c8bd94') },
      uDyeA: { value: new THREE.Color('#2f4b6b') },
      uDyeB: { value: new THREE.Color('#8b3a4a') },
      // La luz de la puerta: calida pero no dorada. El relleno es el rebote
      // frio del patio, y tiene que pesar lo suficiente para que el añil se
      // lea azul y no negro.
      uKeyDir: { value: new THREE.Vector3(-0.55, 0.62, 0.75).normalize() },
      uKeyCol: { value: new THREE.Color('#fff2df').multiplyScalar(1.05) },
      uFillCol: { value: new THREE.Color('#7d93b5').multiplyScalar(0.5) },
      uFuzz: { value: 0.22 },
      uSeed: { value: 0.0 },
      uUvFlip: { value: 0.0 },
      ...extra,
    };
  }

  _construirMalla() {
    const perfil = perfilMochila(220);
    const arco = largoDeArco(perfil);
    const radioMax = Math.max(...perfil.map((p) => p.x));
    const circunferencia = 2 * Math.PI * radioMax;

    // Las puntadas tienen que salir casi cuadradas en el mundo real. Si fijo
    // las columnas, las filas quedan determinadas por la proporcion entre la
    // vuelta y el alto del perfil: no es un numero que se elija a ojo.
    const filas = Math.round((PUNTADAS_POR_VUELTA * arco) / circunferencia);
    this.filas = filas;

    this.matCuerpo = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this._uniforms({ uRows: { value: filas } }),
      side: THREE.DoubleSide,
    });

    const geoCuerpo = new THREE.LatheGeometry(perfil, 320);
    this.cuerpo = new THREE.Mesh(geoCuerpo, this.matCuerpo);
    this.grupo.add(this.cuerpo);

    // La gasa se teje aparte, con otra puntada y mas apretada.
    const curva = curvaGasa();
    const geoGasa = new THREE.TubeGeometry(curva, 320, 0.075, 12, false);
    this.matGasa = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this._uniforms({
        uRows: { value: 210 },
        uCols: { value: 13 },
        uYarn: { value: 0.245 },
        uPattern: { value: 3 },
        uUvFlip: { value: 1.0 },
        uSeed: { value: 3.7 },
        uFuzz: { value: 0.16 },
      }),
      side: THREE.DoubleSide,
    });
    this.gasa = new THREE.Mesh(geoGasa, this.matGasa);
    this.grupo.add(this.gasa);
  }

  vestir({ ground, dyeA, dyeB, pattern, seed = 0 }) {
    for (const m of [this.matCuerpo, this.matGasa]) {
      m.uniforms.uGround.value.set(ground);
      m.uniforms.uDyeA.value.set(dyeA);
      m.uniforms.uDyeB.value.set(dyeB);
      m.uniforms.uSeed.value = seed;
    }
    this.matCuerpo.uniforms.uPattern.value = pattern;
  }

  tejer() {
    this.tejido = 0;
    this.tejiendo = true;
    if (this.reduceMotion) {
      this.tejido = 1;
      this.tejiendo = false;
    }
  }

  // Cuantas puntadas lleva de verdad: sale del mismo uniform que dibuja.
  puntadas() {
    const total = Math.round(this.filas * PUNTADAS_POR_VUELTA);
    return { hechas: Math.round(this.matCuerpo.uniforms.uWeave.value * total), total };
  }

  _instalarArrastre() {
    const c = this.canvas;
    const abajo = (x) => {
      this.arrastrando = true;
      this._ultimoX = x;
      this._ultimoT = performance.now();
      this.velocidad = 0;
      c.classList.add('agarrando');
    };
    const mover = (x) => {
      if (!this.arrastrando) return;
      const ahora = performance.now();
      const dx = x - this._ultimoX;
      const dt = Math.max(ahora - this._ultimoT, 1);
      this.angulo += dx * 0.008;
      this.velocidad = (dx * 0.008 * 16) / dt;
      this._ultimoX = x;
      this._ultimoT = ahora;
    };
    const arriba = () => {
      this.arrastrando = false;
      c.classList.remove('agarrando');
    };

    c.addEventListener('pointerdown', (e) => {
      abajo(e.clientX);
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => mover(e.clientX));
    c.addEventListener('pointerup', arriba);
    c.addEventListener('pointercancel', arriba);
  }

  redimensionar() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // El shader evalua 27 tramos de hilo por pixel: subir el dpr aqui cuesta
    // caro y aporta poco, porque el detalle ya vive en la puntada.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
  }

  arrancar() {
    if (this._raf) return;
    this._ultimoCuadro = performance.now();
    const bucle = (ahora) => {
      this._raf = requestAnimationFrame(bucle);
      const dt = (ahora - this._ultimoCuadro) / 1000;
      this._ultimoCuadro = ahora;
      this._paso(dt);
    };
    this._raf = requestAnimationFrame(bucle);
  }

  parar() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _paso(dt) {
    dt = Math.min(dt, 0.05);

    if (this.tejiendo) {
      this.tejido = Math.min(this.tejido + dt / 5.2, 1);
      if (this.tejido >= 1) this.tejiendo = false;
    }
    const t = this.tejido;
    this.matCuerpo.uniforms.uWeave.value = Math.min(t / 0.82, 1);
    // la gasa se teje al final, cuando el cuerpo ya esta cerrado
    this.matGasa.uniforms.uWeave.value = Math.max((t - 0.8) / 0.2, 0);

    if (!this.arrastrando) {
      this.angulo += this.velocidad;
      this.velocidad *= 0.94;
      if (Math.abs(this.velocidad) < 0.0004) this.velocidad = 0;
      if (!this.reduceMotion) this.angulo += dt * 0.12;
    }
    this.grupo.rotation.y = this.angulo;

    this.desvio += (this.desvioObjetivo - this.desvio) * Math.min(dt * 4.5, 1);
    this.grupo.position.x = this.desvio;

    this.renderer.render(this.scene, this.camera);
  }

  destruir() {
    this.parar();
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
