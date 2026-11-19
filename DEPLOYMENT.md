# Preparación para deploy

El proyecto genera una aplicación estática en `dist/`.

## Verificación local

```bash
npm ci
npm run build
```

## Vercel

La configuración está en `vercel.json`.

- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite

Al conectar el repositorio, Vercel detectará estos valores.

## Netlify

La configuración está en `netlify.toml` y `public/_redirects`.

## GitHub Pages

`vite.config.ts` utiliza rutas relativas para admitir un sitio publicado dentro de una subcarpeta. Cuando exista el repositorio se puede añadir el workflow oficial de Pages con el nombre definitivo de la rama.

## Persistencia

El historial, preferencias, notas y repetición espaciada usan `localStorage`. Los datos pertenecen al navegador y dominio donde se abre la aplicación:

- no requieren backend;
- no se sincronizan entre dispositivos;
- cambiar el dominio crea un almacenamiento independiente;
- borrar los datos del sitio elimina el historial local.

Si posteriormente se necesita sincronización entre dispositivos, habrá que añadir autenticación y una base de datos.

## Antes de publicar

1. Confirmar proveedor: Vercel, Netlify o GitHub Pages.
2. Comprobar que `npm ci && npm run build` finaliza correctamente.
3. Revisar el título, descripción y URL pública.
4. Publicar y probar la carga de `guia-completa.md`.
5. Verificar persistencia, lector, preguntas y simulacro en el dominio definitivo.
