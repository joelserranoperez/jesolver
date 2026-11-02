# Explicación de la solución

## a) Qué he hecho y qué queda pendiente

**Hecho:** los cinco requisitos funcionales (técnicos y obras, programar, reglas a/b/c, cancelar, listado filtrable), validación en el servidor, migraciones SQL, datos de ejemplo, 17 tests de las reglas y, como extra, una agenda visual del técnico en el formulario.

**Pendiente** (por orden de prioridad):
- Alta y edición de técnicos y obras desde la aplicación. Ahora solo existen los datos de ejemplo.
- Reprogramar una visita. Ahora hay que cancelarla y crear otra.
- Usuarios y permisos.
- Tests de integración automáticos contra la base de datos. Los he hecho a mano: inserciones directas en SQL, llamadas a la API, 10 peticiones simultáneas y un recorrido en navegador.
- Tiempo de desplazamiento según la distancia entre municipios, en vez de 30 minutos fijos.

## b) Decisiones principales

- **Next.js + TypeScript + PostgreSQL**, un solo proyecto para la interfaz y la API. Es el stack que valoráis y se despliega en Vercel sin configuración.
- **SQL directo con `pg`, sin ORM.** Son tres tablas y lo importante, las reglas, se expresa mejor en SQL. Todo queda visible en una sola migración.
- **Reglas en dos capas:**
  1. `src/lib/reglas.ts`: funciones puras que devuelven *todas* las reglas incumplidas y con qué visita choca cada una. Están testeadas y también se usan en el navegador para el aviso previo.
  2. Restricciones en PostgreSQL: `EXCLUDE` con rangos de tiempo para a) y b), `CHECK` para c). Garantizan las reglas aunque dos personas guarden a la vez o alguien escriba directamente en la base de datos.

  Además, al crear una visita se bloquea la fila del técnico (`SELECT … FOR UPDATE`), así que las peticiones simultáneas para el mismo técnico se procesan de una en una. Lo he probado con 10 peticiones simultáneas para el mismo hueco: se crea una y las otras 9 reciben un 422.
- **Cancelar no borra:** cambia el estado y guarda `cancelada_en`. Las restricciones solo tienen en cuenta las visitas `programada`, así que el hueco queda libre.
- **Fecha y hora sin zona horaria.** La jornada de 08:00 a 17:00 es una hora "de reloj". Las fechas se manejan como texto `AAAA-MM-DD` para evitar que un servidor en UTC (como Vercel) cambie el día.
- **Códigos HTTP claros:** 400 para datos mal formados, 422 cuando se incumple una regla y 409 al cancelar una visita ya cancelada.

## c) Supuestos

- Los intervalos son `[inicio, fin)`: una visita que acaba a las 10:00 y otra que empieza a las 10:00 no se solapan. Se puede empezar a las 08:00 y terminar justo a las 17:00.
- Los 30 minutos de desplazamiento se exigen solo entre obras **diferentes**, tanto con la visita anterior como con la siguiente. Dos visitas seguidas en la misma obra no los necesitan.
- No se bloquea ninguna pausa para comer: el enunciado define la jornada como de 08:00 a 17:00 sin más.
- Se permiten fines de semana y fechas pasadas (para registrar visitas a posteriori). No se contemplan festivos.
- La duración se indica en minutos enteros y no hay duración mínima.
- Una visita cancelada no se puede reactivar.
- "Filtrar por fecha" significa filtrar por un día concreto. He añadido también un filtro por estado.
- Todos los técnicos trabajan en la misma zona horaria (Europe/Madrid).

## d) Uso de la IA

He desarrollado con **Claude Code** dentro de VS Code. Le daba el enunciado y las decisiones de diseño; la IA generaba el código y las pruebas, y yo revisaba cada paso contra la documentación y ejecutando la aplicación.

**Correcciones sobre lo generado:**
- **APIs de Next.js 16.** La versión instalada cambia APIs respecto a lo que la IA "conoce": `params` y `searchParams` son promesas, Cache Components obliga a envolver los datos dinámicos en `<Suspense>` y `error.tsx` recibe `retry` en lugar de `reset`. Lo contrasté con la documentación incluida en `node_modules/next/dist/docs` antes de dar el código por bueno.
- **Errores que no se borraban.** Al probar el formulario en un navegador (Playwright), vi que los errores devueltos por el servidor seguían en pantalla después de cambiar la hora, aunque ya no aplicaban. Lo corregí asociando cada error a los datos con los que se envió.
- **Conflicto de dependencias.** Al instalar Vitest saltó un conflicto de versiones. En lugar de aceptar `--force`, alineé `@types/node` con la versión de Node que uso.

## Extra opcional: agenda del técnico en el formulario

Al elegir técnico y fecha se ven sus visitas de ese día sobre la jornada de 08:00 a 17:00, junto con la visita nueva, que aparece en verde si cabe y en rojo si no, con el motivo. La he elegido porque ataca el problema de origen: en la hoja de cálculo no se ven los huecos libres. Así se planifica viendo la agenda en lugar de probar y equivocarse. Reutiliza la misma función de reglas que el servidor, que sigue siendo quien decide.
