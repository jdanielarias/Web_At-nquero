import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/karla';
import './css/app.css';

import { cargarMochilas } from './catalogo/cargar.js';
import { wa } from './config.js';

const $ = (s, r = document) => r.querySelector(s);

// El nav pegajoso mide distinto en movil (dos filas) que en escritorio. Se
// publica su alto real para que los saltos de ancla no dejen el rotulo debajo.
const nav = $('.nav');
const medirNav = () =>
  document.documentElement.style.setProperty('--alto-nav', `${nav.offsetHeight}px`);
medirNav();
addEventListener('resize', medirNav);

$('#waTour').href = wa('Hola Enosh, quiero cuadrar un recorrido por Atánquez.');
$('#waPie').href = wa('Hola Enosh, quiero más información.');

const mochilas = cargarMochilas();
const lista = $('#catalogo');

const texto = (t) => document.createTextNode(t);

function tarjeta(m) {
  const li = document.createElement('li');
  li.className = 'mochila';

  const hilo = document.createElement('span');
  hilo.className = 'hilo-lateral';
  hilo.setAttribute('aria-hidden', 'true');
  li.append(hilo);

  // --- foto ---
  const foto = document.createElement('div');
  foto.className = 'mochila-foto';
  if (m.portada) {
    const img = document.createElement('img');
    img.src = m.portada;
    img.alt = `${m.nombre}, tejida a mano en Atánquez`;
    img.loading = 'lazy';
    foto.append(img);
  } else {
    const vacio = document.createElement('div');
    vacio.className = 'sin-foto';
    const p = document.createElement('p');
    p.append(texto('Falta la foto'));
    const c = document.createElement('code');
    c.append(texto(`mochilas/${m.id}/portada.jpg`));
    vacio.append(p, c);
    foto.append(vacio);
  }

  // --- cuerpo ---
  const cuerpo = document.createElement('div');
  cuerpo.className = 'mochila-cuerpo';

  const marca = document.createElement('span');
  marca.className = `marca ${m.estado === 'vendida' ? 'vendida' : 'disponible'}`;
  marca.append(texto(m.estado === 'vendida' ? 'Vendida' : 'Disponible'));

  const h3 = document.createElement('h3');
  h3.append(texto(m.nombre));

  cuerpo.append(marca, h3);

  if (m.historia) {
    const p = document.createElement('p');
    p.className = 'mochila-historia';
    p.append(texto(m.historia));
    cuerpo.append(p);
  }

  if (m.precio) {
    const p = document.createElement('p');
    p.className = 'mochila-precio';
    p.append(texto(`$${m.precio.toLocaleString('es-CO')} COP`));
    cuerpo.append(p);
  }

  if (m.ficha.length) {
    const ul = document.createElement('ul');
    ul.className = 'mochila-ficha';
    for (const f of m.ficha) {
      const li2 = document.createElement('li');
      li2.append(texto(f));
      ul.append(li2);
    }
    cuerpo.append(ul);
  }

  // --- acciones ---
  const acciones = document.createElement('div');
  acciones.className = 'mochila-acciones';

  if (m.estado === 'vendida') {
    const sp = document.createElement('span');
    sp.className = 'boton';
    sp.setAttribute('aria-disabled', 'true');
    sp.append(texto('Ya tiene dueño'));
    acciones.append(sp);
  } else {
    const a = document.createElement('a');
    a.className = 'boton solido';
    a.href = wa(`Hola Enosh, me interesa la ${m.nombre}.`);
    a.target = '_blank';
    a.rel = 'noopener';
    a.append(texto('Preguntar'));
    acciones.append(a);
  }

  cuerpo.append(acciones);
  li.append(foto, cuerpo);
  return li;
}

if (!mochilas.length) {
  const li = document.createElement('li');
  li.className = 'aviso';
  li.append(
    texto('Todavía no hay mochilas. Crea una carpeta en mochilas/ con su mochila.json — mira el README.'),
  );
  lista.append(li);
} else {
  lista.append(...mochilas.map(tarjeta));
}
