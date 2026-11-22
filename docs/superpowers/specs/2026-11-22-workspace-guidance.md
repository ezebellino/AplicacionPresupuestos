# Ayuda y experiencia mobile de FacturEasy

## Alcance

- Ayuda voluntaria dentro del dashboard: manual de cinco tareas y recorridos Driver.js 1.3.6 sobre controles visibles. No realiza operaciones, no abre servicios externos y no se inicia automáticamente.
- Presupuestos: navegación directa Listado / Presupuesto en todos los tamaños. Barra mobile con total guardado y acceso a revisar el detalle; para un nuevo presupuesto permite crear el borrador mediante el mismo formulario y validación.
- Búsquedas, filtros, subsecciones y posición de los listados de clientes/presupuestos conservados en memoria durante la sesión. Sin persistir datos del cliente en localStorage.
- Avisos de datos pendientes al navegar entre áreas, cerrar sesión o recargar. Los formularios se conservan en memoria al cambiar de área; cerrar la sesión o recargar los pierde. Guardar correctamente limpia la condición pendiente; errores de guardado no la limpian.
- Respeta el teclado móvil (Visual Viewport), safe areas, movimiento reducido, navegación por teclado y cierre de la ayuda.

## Compatibilidad

No cambia cálculos, contratos de API, permisos, estados del presupuesto ni base de datos. El recorrido bloquea la interacción con el control destacado para evitar operaciones accidentales. El manual aclara que abrir WhatsApp no confirma entrega y que aceptar un presupuesto no acredita un cobro.

La ayuda nativa usa HTML dialog y los navegadores modernos compatibles con showModal. La comprobación del teclado en escritorio emulado no sustituye una prueba en teléfono físico.

## Validación requerida

- TypeScript, suite Vitest completa y build de frontend.
- Pruebas de conservación de filtros, navegación cancelada con datos pendientes, beforeunload, logout, ayuda voluntaria y acción mobile sin escrituras.
- Navegador real con datos sintéticos: 390 px y escritorio, apertura/cierre/reinicio del recorrido, foco, ausencia de desbordamiento y separación de barra de acciones/navegación.

Merge y despliegue se coordinan luego de revisar el PR, debido al uso activo por un cliente.

## Resultado de validación (2026-11-22)

- `npm run typecheck` y `npm run build`: correctos.
- `npm run test:run -- --maxWorkers=1`: 66 pruebas aprobadas en seis archivos. Una ejecución paralela agotó la memoria del equipo; la ejecución secuencial completa pasó.
- Chrome con datos sintéticos y solicitudes de escritura bloqueadas: 390 × 844 y 1440 × 1000, sin desbordamiento horizontal. Barra mobile sin superposición ni separación respecto de la navegación inferior. Manual accesible, recorrido completo de cuatro pasos del editor, cierre y retorno del foco comprobados; Escape cierra el manual en escritorio.
- Sin comprobación en teléfono físico ni validación autenticada contra producción. Backend sin modificaciones.
- Driver.js es la única dependencia agregada y queda fijada en 1.3.6. `npm audit` informó siete alertas en dependencias preexistentes (dos moderadas, cinco altas), sin alerta para Driver.js; su evaluación y actualización requieren un cambio separado. El lockfile no actualiza otros paquetes.
