// Descubre las piezas del hilo solas: cada carpeta dentro de /hilo es un
// video de YouTube o una foto. Para sumar una nueva no hay que tocar codigo —
// se crea la carpeta con su pieza.json y aparece en la seccion.
//
//   hilo/
//     el-nombre-que-sea/
//       pieza.json        <- obligatorio
//       foto.jpg          <- solo si la pieza es una foto

const fichas = import.meta.glob('/hilo/*/pieza.json', { eager: true });
const fotos = import.meta.glob('/hilo/*/foto.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});
// Cualquier imagen de la carpeta, se llame como se llame: el panel de
// administracion sube la foto con su nombre original y lo apunta en el json.
const imagenes = import.meta.glob('/hilo/*/**.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const carpeta = (ruta) => ruta.split('/')[2];

function desdeJson(id, ruta) {
  if (!ruta) return null;
  const limpia = String(ruta).replace(/^\.?\//, '');
  return imagenes[`/hilo/${id}/${limpia}`] ?? null;
}

function unoDe(glob, id) {
  const clave = Object.keys(glob).find((k) => carpeta(k) === id);
  return clave ? glob[clave] : null;
}

// Acepta el enlace tal como se copia de YouTube (watch, youtu.be, shorts,
// live, embed) o el codigo pelado, y devuelve el codigo de 11 caracteres.
export function codigoYoutube(enlace) {
  if (!enlace) return null;
  const crudo = String(enlace).trim();
  if (/^[\w-]{11}$/.test(crudo)) return crudo;
  const m = crudo.match(/(?:youtu\.be\/|shorts\/|live\/|embed\/|[?&]v=)([\w-]{11})/);
  return m ? m[1] : null;
}

export function cargarPiezas() {
  return Object.keys(fichas)
    .map((ruta) => {
      const id = carpeta(ruta);
      const datos = fichas[ruta].default ?? fichas[ruta];
      return {
        id,
        titulo: datos.titulo ?? id,
        nota: datos.nota ?? '',
        fecha: datos.fecha ?? '',
        youtube: codigoYoutube(datos.youtube),
        // Manda lo que diga el json (asi trabaja el panel); si no, foto.jpg.
        foto: desdeJson(id, datos.foto) ?? unoDe(fotos, id),
      };
    })
    .sort(
      (a, b) =>
        // Lo mas reciente primero; las piezas sin fecha bajan al final.
        b.fecha.localeCompare(a.fecha, 'es', { numeric: true }) ||
        a.titulo.localeCompare(b.titulo, 'es'),
    );
}
