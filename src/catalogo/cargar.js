// Descubre las mochilas solas: cada carpeta dentro de /mochilas es una mochila.
// Para agregar una nueva no hay que tocar codigo — se crea la carpeta con su
// mochila.json y aparece en el catalogo.
//
//   mochilas/
//     el-nombre-que-sea/
//       mochila.json      <- obligatorio
//       portada.jpg       <- la foto principal (opcional)
//       fotos/*.jpg       <- las demas (opcional)

const fichas = import.meta.glob('/mochilas/*/mochila.json', { eager: true });
const portadas = import.meta.glob('/mochilas/*/portada.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const fotos = import.meta.glob('/mochilas/*/fotos/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const carpeta = (ruta) => ruta.split('/')[2];

// Busca en un glob la unica entrada que pertenece a esta carpeta.
function unoDe(glob, id) {
  const clave = Object.keys(glob).find((k) => carpeta(k) === id);
  return clave ? glob[clave] : null;
}

function todosDe(glob, id) {
  return Object.keys(glob)
    .filter((k) => carpeta(k) === id)
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true })) // foto2 antes que foto10
    .map((k) => glob[k]);
}

export function cargarMochilas() {
  return Object.keys(fichas)
    .map((ruta) => {
      const id = carpeta(ruta);
      const datos = fichas[ruta].default ?? fichas[ruta];
      return {
        id,
        nombre: datos.nombre ?? id,
        dibujo: datos.dibujo ?? '',
        estado: datos.estado ?? 'disponible',
        precio: datos.precio ?? null,
        historia: datos.historia ?? '',
        ficha: datos.ficha ?? [],
        portada: unoDe(portadas, id),
        fotos: todosDe(fotos, id),
      };
    })
    .sort((a, b) => {
      // Lo que se puede comprar va primero; lo vendido baja.
      const peso = (m) => (m.estado === 'vendida' ? 1 : 0);
      return peso(a) - peso(b) || a.nombre.localeCompare(b.nombre, 'es');
    });
}
