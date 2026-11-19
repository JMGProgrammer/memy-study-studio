# Memy Study Studio — DYDA

Cuestionario web para preparar el Parcial 2 de DYDA, construido con Vite y TypeScript.

Repositorio: `JMGProgrammer/memy-study-studio`.

## Ejecutar

```bash
npm install
npm run dev
```

Vite mostrará una dirección local, normalmente `http://localhost:5173`.

## Compilar

```bash
npm run build
```

## Funciones

- preguntas aleatorias;
- banco de 50 preguntas;
- práctica por tema;
- repetición automática de errores;
- dificultad Base, Intermedio y Parcial;
- respuestas de código con colores inspirados en Visual Studio;
- explicación y regla breve después de responder;
- progreso persistente mediante `localStorage`;
- atajos `1`–`4` para elegir y `Enter` para comprobar/continuar;
- diseño adaptable para escritorio y móvil.
- toast al fallar con acceso directo a la pregunta en `Repetir errores`;
- lector integrado de la mega guía con índice y búsqueda;
- mapa de debilidades que señala teoría relacionada con errores históricos;
- historial permanente con precisión por tema, rachas, tiempos y evolución;
- repetición espaciada adaptativa;
- paleta de comandos (`Ctrl+K`);
- notas y marcadores por pregunta;
- simulacro cronometrado de tres horas.
- filtros combinables de dificultad: Base, Intermedio y Parcial;
- sesiones personalizables de 10, 25 o 50 preguntas;
- orden de respuestas aleatorio para evitar memorizar posiciones.
- pantalla de bienvenida en cada carga para configurar el enfoque;
- resaltado de C#, JSON, HTML y terminal en la guía con paleta Visual Studio;
- configuración preparada para Vercel, Netlify y hosting en subcarpetas.

Las sesiones pueden reiniciarse sin borrar el historial. No existe un botón de borrado dentro de la interfaz.

## Banco de conocimiento

Las preguntas viven en `src/questions.ts`. Cada pregunta define tema, dificultad, contexto opcional, cuatro respuestas, solución, explicación y regla para recordar.

Para ampliar el contenido basta con agregar objetos al array `questions`. El simulador los incorpora automáticamente a la aleatorización, los temas y el modo de errores.

La copia de lectura de la guía está en `public/guia-completa.md`. Si cambia el Markdown principal, hay que volver a copiarlo para sincronizar el lector integrado.

## Deploy

Consulta `DEPLOYMENT.md`. La salida estática se genera en `dist/`.

## Fuente de estudio

- `../DYDA-Parcial-2-Mega-Guia.md`;
- parcial de prueba de Semana 11;
- guías de API, LINQ, EF Core, JSON, HttpClient y JWT de las semanas 6–11.
