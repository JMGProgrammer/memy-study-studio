# DYDA — Mega guía de estudio para el Parcial 2

Última actualización: 2026-11-18

## Cómo usar esta guía

Esta guía sigue el orden del parcial de prueba:

1. seis preguntas teóricas;
2. ejercicio práctico de búsqueda desde Blazor hacia una API;
3. ejercicios de JSON.

No conviene memorizar el dominio `Producto`. Hay que memorizar el **flujo**, las responsabilidades y las decisiones que se repiten. En el parcial real pueden aparecer libros, turnos, equipos, empleados, pedidos u otra realidad.

Método recomendado:

1. leer una sección;
2. cerrar la guía;
3. explicarla con palabras propias;
4. escribir el código sin copiar;
5. comparar y corregir;
6. repetir cambiando la entidad y los filtros.

---

# Parte 1 — Preguntas teóricas

## Pregunta 1 — Capas y recorrido completo

### Pregunta del simulacro

> Explicá qué función cumple cada capa en una consulta desde Blazor: Service de la web, Controller, Service de la API y Repository. Indicá el orden del recorrido de la petición y de la respuesta.

## 1.1 Respuesta breve para escribir en el parcial

> El Service de Blazor construye y envía la solicitud HTTP y deserializa la respuesta JSON. El Controller recibe la petición, obtiene los parámetros HTTP, llama al Service de la API y devuelve el código HTTP correspondiente. El Service de la API valida los datos y aplica las reglas del caso de uso. El Repository accede a la base mediante Entity Framework Core y ejecuta la consulta. La petición recorre Blazor → Service web → Controller → Service API → Repository → base de datos, y la respuesta vuelve en sentido contrario.

## 1.2 Recorrido de ida

```text
Usuario
  ↓
Página o componente Blazor
  ↓
Service de Blazor
  ↓ HttpClient / HTTP
Controller de la API
  ↓
Service de la API
  ↓
Repository
  ↓
DbContext / Entity Framework Core
  ↓
Base de datos
```

## 1.3 Recorrido de vuelta

```text
Base de datos
  ↓ filas
Repository
  ↓ entidades o DTO
Service de la API
  ↓ resultado
Controller
  ↓ respuesta HTTP + JSON
Service de Blazor
  ↓ deserialización
Página Blazor
  ↓
Usuario
```

## 1.4 Responsabilidad de cada capa

| Capa | Responsabilidad | No debería hacer |
|---|---|---|
| Página Blazor | Capturar filtros, responder a eventos y mostrar resultados | Consultar directamente la base |
| Service web | Construir URL, usar `HttpClient`, enviar HTTP y deserializar JSON | Usar EF Core |
| Controller | Recibir HTTP, enlazar parámetros, llamar al Service y devolver códigos HTTP | Consultar `DbContext` directamente |
| Service API | Validar, normalizar y aplicar reglas de negocio | Decidir cómo se dibuja la interfaz |
| Repository | Consultar y persistir mediante EF Core | Devolver `Ok()` o `BadRequest()` |
| `DbContext` | Representar la sesión con la base y exponer `DbSet` | Contener reglas de negocio |

## 1.5 Ejemplo: búsqueda de productos

```text
El usuario escribe “mouse” y precio máximo 1500
→ Blazor llama a ProductoApiService
→ ProductoApiService envía:
  GET /api/productos/buscar?nombre=mouse&precioMaximo=1500
→ ProductosController recibe los parámetros
→ ProductoService valida que el precio no sea negativo
→ ProductoRepository construye IQueryable
→ EF Core genera SQL con WHERE
→ MySQL devuelve las filas
→ API serializa el resultado como JSON
→ Blazor deserializa JSON a List<Producto>
→ la página muestra los productos
```

## 1.6 Ejemplo: búsqueda de libros

```text
GET /api/libros/buscar?titulo=anillo&genero=Fantasía&disponible=true
```

El flujo es exactamente el mismo. Solo cambian:

- la entidad;
- los nombres de propiedades;
- las condiciones de los filtros;
- las validaciones específicas.

## 1.7 Errores conceptuales frecuentes

- Controller usando `_context.Productos`.
- Repository devolviendo `BadRequest()`.
- Service construyendo HTML.
- Blazor conectándose directamente a MySQL.
- Controller implementando todas las reglas de negocio.
- Service web usando `Where` sobre la tabla de la API.

## 1.8 Autoevaluación

Sin mirar, responder:

1. ¿Quién recibe `[FromQuery]`?
2. ¿Quién usa `HttpClient`?
3. ¿Quién usa `DbContext`?
4. ¿Quién decide que un precio negativo es inválido?
5. ¿Quién devuelve `400 Bad Request`?
6. ¿En qué formato viaja normalmente la respuesta HTTP?

Respuestas:

1. Controller.
2. Service web.
3. Repository.
4. Service API.
5. Controller.
6. JSON.

---

## Pregunta 2 — Inyección de dependencias

### Pregunta del simulacro

> ¿Qué es la inyección de dependencias? Explicá para qué sirve y qué hace esta instrucción:
>
> `builder.Services.AddScoped<IProductoService, ProductoService>();`

## 2.1 Respuesta breve para el parcial

> La inyección de dependencias permite que una clase reciba los objetos que necesita desde un contenedor en lugar de crearlos con `new`. Esto reduce el acoplamiento y permite depender de interfaces. `AddScoped<IProductoService, ProductoService>()` registra que, cuando una clase solicite `IProductoService`, el contenedor debe crear y entregar un `ProductoService`. `Scoped` mantiene una instancia durante la petición HTTP.

## 2.2 Problema sin inyección

```csharp
public class ProductosController : ControllerBase
{
    private readonly ProductoService _service =
        new ProductoService(
            new ProductoRepository(
                new AppDbContext(...)));
}
```

Problemas:

- el Controller conoce todas las clases concretas;
- construir dependencias se vuelve difícil;
- cambiar implementaciones obliga a modificar el Controller;
- dificulta pruebas;
- puede administrar mal el ciclo de vida del `DbContext`.

## 2.3 Solución con inyección

```csharp
public class ProductosController : ControllerBase
{
    private readonly IProductoService _service;

    public ProductosController(IProductoService service)
    {
        _service = service;
    }
}
```

Registro:

```csharp
builder.Services.AddScoped<IProductoService, ProductoService>();
builder.Services.AddScoped<IProductoRepository, ProductoRepository>();
```

El contenedor resuelve:

```text
ProductosController
necesita IProductoService
→ entrega ProductoService

ProductoService
necesita IProductoRepository
→ entrega ProductoRepository

ProductoRepository
necesita AppDbContext
→ entrega AppDbContext
```

## 2.4 ¿Por qué interfaces?

La interfaz define el contrato:

```csharp
public interface IProductoService
{
    Task<List<Producto>> BuscarAsync(...);
}
```

La implementación define cómo se cumple:

```csharp
public class ProductoService : IProductoService
{
    // implementación
}
```

Ventajas:

- desacoplamiento;
- sustitución de implementaciones;
- pruebas con dobles o mocks;
- responsabilidades explícitas;
- firmas consistentes.

## 2.5 Ciclos de vida

### `Scoped`

Una instancia por petición HTTP.

```csharp
builder.Services.AddScoped<IProductoService, ProductoService>();
```

Es la opción habitual cuando se trabaja con `DbContext`.

### `Transient`

Una instancia cada vez que se solicita.

```csharp
builder.Services.AddTransient<IEmailService, EmailService>();
```

### `Singleton`

Una única instancia para toda la aplicación.

```csharp
builder.Services.AddSingleton<IConfiguracion, Configuracion>();
```

No conviene registrar un Service que depende de un `DbContext` scoped como Singleton.

## 2.6 Ejemplos equivalentes

```csharp
builder.Services.AddScoped<ILibroService, LibroService>();
builder.Services.AddScoped<ITurnoRepository, TurnoRepository>();
builder.Services.AddScoped<IEmpleadoService, EmpleadoService>();
```

La lectura siempre es:

> Cuando alguien solicite la interfaz de la izquierda, entregar la implementación de la derecha.

## 2.7 Errores frecuentes

- Registrar Service pero olvidar Repository.
- Pedir la clase concreta cuando se esperaba la interfaz.
- Escribir una interfaz pero no implementarla.
- Firmas distintas entre interfaz e implementación.
- Crear manualmente con `new` una dependencia registrada.
- Usar Singleton con un `DbContext` scoped.

---

## Pregunta 3 — `[FromQuery]`, URL y nullable

### Pregunta del simulacro

> ¿Para qué se utiliza `[FromQuery]`? Escribí la URL para consultar `/api/productos/buscar` filtrando `nombre = Mouse` y `precioMaximo = 1500`. Explicá qué significa que un parámetro sea nullable.

## 3.1 Respuesta breve

> `[FromQuery]` indica que ASP.NET Core debe obtener el valor desde la query string de la URL. La consulta sería `/api/productos/buscar?nombre=Mouse&precioMaximo=1500`. Un tipo nullable puede contener un valor o `null`; en filtros opcionales, `null` indica que ese filtro no fue enviado y no debe aplicarse.

## 3.2 Anatomía de una URL

```text
/api/productos/buscar?nombre=Mouse&precioMaximo=1500
│                       │            │
ruta                    primer       segundo
                        parámetro     parámetro
```

- `?` inicia la query string.
- `=` separa nombre y valor.
- `&` separa parámetros.

## 3.3 Controller con parámetros individuales

```csharp
[HttpGet("buscar")]
public async Task<ActionResult<List<Producto>>> Buscar(
    [FromQuery] string? nombre,
    [FromQuery] string? categoria,
    [FromQuery] decimal? precioMaximo,
    [FromQuery] bool? soloDisponibles)
{
    // ...
}
```

## 3.4 Controller con objeto de filtros

```csharp
public class ProductoFiltroDto
{
    public string? Nombre { get; set; }
    public string? Categoria { get; set; }
    public decimal? PrecioMaximo { get; set; }
    public bool? SoloDisponibles { get; set; }
}
```

```csharp
[HttpGet("buscar")]
public async Task<IActionResult> Buscar(
    [FromQuery] ProductoFiltroDto filtro)
{
    return Ok(await _service.BuscarAsync(filtro));
}
```

## 3.5 Nullable

```csharp
decimal? precioMaximo
bool? soloDisponibles
int? categoriaId
DateTime? desde
```

Cada uno puede contener:

```text
un valor real
o
null
```

Ejemplo:

```csharp
if (precioMaximo.HasValue)
{
    query = query.Where(p =>
        p.Precio <= precioMaximo.Value);
}
```

También:

```csharp
if (precioMaximo is decimal maximo)
{
    query = query.Where(p => p.Precio <= maximo);
}
```

## 3.6 Diferencia importante con `bool?`

```csharp
if (soloDisponibles == true)
{
    query = query.Where(p => p.Stock > 0);
}
```

Interpretación:

| Valor | Resultado |
|---|---|
| `null` | No aplicar filtro |
| `false` | No exigir disponibilidad |
| `true` | Filtrar `Stock > 0` |

Si la consigna dijera “filtrar exactamente por disponible/no disponible”, podría usarse:

```csharp
if (disponible.HasValue)
{
    query = query.Where(p =>
        p.Disponible == disponible.Value);
}
```

Hay que leer la regla, no copiar mecánicamente.

## 3.7 URLs de práctica

```text
/api/libros/buscar?titulo=Harry&disponible=true
```

```text
/api/turnos/buscar?profesionalId=3&estado=Pendiente
```

```text
/api/empleados/buscar?departamento=Ventas&sueldoMaximo=50000
```

```text
/api/equipos/buscar?ubicacion=Rosario&activo=true
```

## 3.8 Escapar texto

Si el usuario escribe:

```text
mouse inalámbrico
```

No conviene concatenarlo directamente. En Blazor:

```csharp
Uri.EscapeDataString(nombre)
```

Resultado aproximado:

```text
mouse%20inal%C3%A1mbrico
```

---

## Pregunta 4 — `IEnumerable<T>` e `IQueryable<T>`

### Pregunta del simulacro

> Explicá la diferencia entre `IEnumerable<T>` e `IQueryable<T>` en Entity Framework Core. ¿Cuál conviene usar al construir filtros para una consulta a la base de datos y por qué?

## 4.1 Respuesta breve

> `IEnumerable<T>` representa una secuencia de objetos que normalmente ya se encuentra en memoria y se procesa con LINQ to Objects. `IQueryable<T>` representa una consulta pendiente y componible que Entity Framework Core puede traducir a SQL. Para construir filtros sobre una base conviene `IQueryable`, porque permite que los filtros se ejecuten en la base antes de descargar los resultados.

## 4.2 Caso incorrecto

```csharp
List<Producto> todos =
    await _context.Productos.ToListAsync();

IEnumerable<Producto> resultado =
    todos.Where(p => p.Stock > 0);
```

Problema:

1. descarga toda la tabla;
2. recién después filtra en memoria;
3. usa más red y memoria;
4. puede ser muy lento con muchos registros.

## 4.3 Caso correcto

```csharp
IQueryable<Producto> query =
    _context.Productos.AsNoTracking();

query = query.Where(p => p.Stock > 0);

List<Producto> resultado =
    await query.ToListAsync();
```

EF Core puede traducirlo aproximadamente a:

```sql
SELECT *
FROM Productos
WHERE Stock > 0
ORDER BY Nombre;
```

## 4.4 Ejecución diferida

Estos métodos normalmente componen la consulta:

```text
Where
Select
OrderBy
ThenBy
Skip
Take
```

Estos operadores la ejecutan:

```text
ToListAsync
CountAsync
AnyAsync
FirstOrDefaultAsync
```

Regla:

```text
IQueryable = consulta pendiente.
ToListAsync = ejecución y materialización.
```

## 4.5 Reasignación obligatoria

Incorrecto:

```csharp
query.Where(p => p.Stock > 0);
```

Correcto:

```csharp
query = query.Where(p => p.Stock > 0);
```

Los operadores LINQ devuelven una consulta nueva. No modifican la anterior.

## 4.6 `AsNoTracking`

```csharp
IQueryable<Producto> query =
    _context.Productos.AsNoTracking();
```

Sirve para lecturas. EF no necesita rastrear cambios de entidades que solo se mostrarán.

No conviene cuando se quiere:

1. cargar una entidad;
2. modificar esa misma instancia;
3. llamar a `SaveChangesAsync`.

## 4.7 Ejemplo con varios filtros

```csharp
IQueryable<Libro> query =
    _context.Libros.AsNoTracking();

if (!string.IsNullOrWhiteSpace(titulo))
    query = query.Where(l =>
        l.Titulo.Contains(titulo));

if (!string.IsNullOrWhiteSpace(genero))
    query = query.Where(l =>
        l.Genero == genero);

if (anioDesde.HasValue)
    query = query.Where(l =>
        l.Anio >= anioDesde.Value);

if (disponible == true)
    query = query.Where(l =>
        l.Disponible);

return await query
    .OrderBy(l => l.Titulo)
    .ThenBy(l => l.Id)
    .ToListAsync();
```

## 4.8 Paginación

Orden correcto:

```text
IQueryable
→ Where
→ CountAsync
→ OrderBy + ThenBy
→ Skip + Take
→ Select
→ ToListAsync
```

Ejemplo:

```csharp
int total = await query.CountAsync();

List<ProductoDto> items = await query
    .OrderBy(p => p.Nombre)
    .ThenBy(p => p.Id)
    .Skip((pagina - 1) * tamanio)
    .Take(tamanio)
    .Select(p => new ProductoDto
    {
        Id = p.Id,
        Nombre = p.Nombre,
        Precio = p.Precio
    })
    .ToListAsync();
```

`CountAsync` y `ToListAsync` ejecutan dos consultas. Es correcto:

- una obtiene el total;
- otra obtiene la página.

## 4.9 Errores frecuentes

- `ToListAsync` antes de los filtros.
- No reasignar `query`.
- Usar funciones que EF no puede traducir.
- Paginar sin ordenar.
- Contar después de `Skip` y `Take`.
- Usar `ToList()` cuando se espera asincronía.
- Aplicar `AsNoTracking` y luego esperar cambios automáticos.

---

## Pregunta 5 — JSON, serializar y deserializar

### Pregunta del simulacro

> ¿Qué es JSON? Explicá qué significan serializar y deserializar, y mencioná un uso concreto al consumir una API desde Blazor.

## 5.1 Respuesta breve

> JSON es un formato de texto utilizado para intercambiar datos estructurados. Serializar significa convertir un objeto de C# a JSON para enviarlo o almacenarlo. Deserializar significa convertir un JSON recibido en un objeto de C#. En Blazor, `PostAsJsonAsync` serializa un objeto al enviarlo a una API y `GetFromJsonAsync<List<Producto>>` deserializa la respuesta JSON a una lista.

## 5.2 Objeto C#

```csharp
Producto producto = new()
{
    Id = 10,
    Nombre = "Monitor",
    Precio = 12500,
    Stock = 8
};
```

Serializado:

```json
{
  "id": 10,
  "nombre": "Monitor",
  "precio": 12500,
  "stock": 8
}
```

## 5.3 Serialización

```csharp
string json =
    JsonSerializer.Serialize(producto);
```

O al enviar:

```csharp
HttpResponseMessage response =
    await _http.PostAsJsonAsync(
        "api/productos",
        producto);
```

`PostAsJsonAsync`:

1. convierte el objeto a JSON;
2. configura `Content-Type: application/json`;
3. envía el `POST`.

## 5.4 Deserialización

```csharp
List<Producto> productos =
    await _http.GetFromJsonAsync<List<Producto>>(
        "api/productos")
    ?? [];
```

También manual:

```csharp
string json =
    await response.Content.ReadAsStringAsync();

List<Producto>? productos =
    JsonSerializer.Deserialize<List<Producto>>(json);
```

## 5.5 JSON no es un objeto C#

JSON es texto:

```json
{
  "nombre": "Mouse",
  "precio": 850
}
```

Después de deserializar, sí se obtiene un objeto:

```csharp
Producto producto
```

## 5.6 Errores frecuentes

- Confundir serializar con deserializar.
- Creer que JSON es una clase.
- Escribir claves sin comillas.
- Usar comillas simples.
- Poner `true` como `"true"`.
- Esperar `Producto` cuando el JSON contiene un array.
- Esperar `List<Producto>` cuando la API devuelve un objeto paginado.

Ejemplo de incompatibilidad:

```json
{
  "items": [],
  "total": 0
}
```

Esto no es directamente:

```csharp
List<Producto>
```

Necesita:

```csharp
PaginaResultado<Producto>
```

---

## Pregunta 6 — Analizar LINQ asincrónico

### Código del simulacro

```csharp
return await _context.Productos
    .Where(p => p.Stock > 0)
    .OrderBy(p => p.Nombre)
    .ToListAsync();
```

## 6.1 Respuesta breve

> El código devuelve una lista asincrónica de productos cuyo stock es mayor que cero, ordenados por nombre de forma ascendente. `Where` agrega el filtro, `OrderBy` establece el orden, `ToListAsync` ejecuta la consulta en la base y materializa los resultados en una lista, y `await` espera el resultado de la operación asincrónica.

## 6.2 Lectura línea por línea

```csharp
_context.Productos
```

Representa el `DbSet<Producto>`.

```csharp
.Where(p => p.Stock > 0)
```

Conserva productos disponibles.

```csharp
.OrderBy(p => p.Nombre)
```

Ordena alfabéticamente de forma ascendente.

```csharp
.ToListAsync()
```

Ejecuta la consulta y materializa los resultados.

```csharp
await
```

Espera la finalización de la operación asincrónica.

## 6.3 Tipo probable del método

```csharp
public async Task<List<Producto>>
    ObtenerDisponiblesAsync()
{
    return await _context.Productos
        .Where(p => p.Stock > 0)
        .OrderBy(p => p.Nombre)
        .ToListAsync();
}
```

## 6.4 Variaciones

### Libros disponibles

```csharp
return await _context.Libros
    .Where(l => l.Disponible)
    .OrderBy(l => l.Titulo)
    .ToListAsync();
```

### Turnos pendientes

```csharp
return await _context.Turnos
    .Where(t => t.Estado == EstadoTurno.Pendiente)
    .OrderBy(t => t.FechaHora)
    .ToListAsync();
```

### Empleados activos con sueldo alto

```csharp
return await _context.Empleados
    .Where(e => e.Activo && e.Sueldo > 50000)
    .OrderByDescending(e => e.Sueldo)
    .ThenBy(e => e.Nombre)
    .ToListAsync();
```

## 6.5 Métodos que hay que reconocer

| Método | Función |
|---|---|
| `Where` | Filtrar |
| `Select` | Proyectar o transformar |
| `OrderBy` | Orden ascendente |
| `OrderByDescending` | Orden descendente |
| `ThenBy` | Segundo criterio |
| `AnyAsync` | Saber si existe una coincidencia |
| `CountAsync` | Contar |
| `FirstOrDefaultAsync` | Obtener uno o `null/default` |
| `Skip` | Saltar elementos |
| `Take` | Limitar cantidad |
| `ToListAsync` | Ejecutar y materializar en lista |

---

# Parte 2 — Ejercicio práctico

## Consigna base del simulacro

Una página Blazor busca productos mediante una API REST con ASP.NET Core y EF Core.

Entidad:

```csharp
public class Producto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public decimal Precio { get; set; }
    public int Stock { get; set; }
}
```

Filtros:

- nombre contiene texto;
- categoría exacta;
- precio menor o igual al máximo;
- si `soloDisponibles` es `true`, `Stock > 0`;
- sin filtros se devuelven todos.

## 7. Estrategia antes de escribir código

Subrayar:

```text
ENTIDAD:
Producto

FILTROS:
string? nombre
string? categoria
decimal? precioMaximo
bool? soloDisponibles

CONDICIONES:
Nombre.Contains(nombre)
Categoria == categoria
Precio <= precioMaximo
Stock > 0 si soloDisponibles == true

VALIDACIÓN:
precioMaximo no puede ser negativo

ORDEN:
Nombre

RESPUESTA:
200 con lista, incluso vacía
400 si precio negativo
```

## 8. Orden recomendado de implementación

1. Firma de `IProductoRepository`.
2. Implementación de `ProductoRepository`.
3. Firma de `IProductoService`.
4. Implementación de `ProductoService`.
5. Endpoint en `ProductosController`.
6. Método en `ProductoApiService` de Blazor.
7. Revisar DI y firmas.

No comenzar por el Controller si todavía no se conoce la firma que atravesará las capas.

---

## 9. Repository completo

### Interfaz

```csharp
public interface IProductoRepository
{
    Task<List<Producto>> BuscarAsync(
        string? nombre,
        string? categoria,
        decimal? precioMaximo,
        bool? soloDisponibles);
}
```

### Implementación

```csharp
using Microsoft.EntityFrameworkCore;

public class ProductoRepository : IProductoRepository
{
    private readonly AppDbContext _context;

    public ProductoRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Producto>> BuscarAsync(
        string? nombre,
        string? categoria,
        decimal? precioMaximo,
        bool? soloDisponibles)
    {
        IQueryable<Producto> query =
            _context.Productos.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            query = query.Where(p =>
                p.Nombre.Contains(nombre));
        }

        if (!string.IsNullOrWhiteSpace(categoria))
        {
            query = query.Where(p =>
                p.Categoria == categoria);
        }

        if (precioMaximo.HasValue)
        {
            query = query.Where(p =>
                p.Precio <= precioMaximo.Value);
        }

        if (soloDisponibles == true)
        {
            query = query.Where(p =>
                p.Stock > 0);
        }

        return await query
            .OrderBy(p => p.Nombre)
            .ThenBy(p => p.Id)
            .ToListAsync();
    }
}
```

## 9.1 Qué ocurre sin filtros

Todos los `if` son falsos y la consulta permanece:

```csharp
_context.Productos.AsNoTracking()
```

Después ordena y devuelve todos los productos. No hace falta un `else`.

## 9.2 ¿Por qué `ThenBy(Id)`?

Si dos productos tienen el mismo nombre, el ID único desempata. Esto produce un orden estable.

## 9.3 Variante con DTO

```csharp
return await query
    .OrderBy(p => p.Nombre)
    .ThenBy(p => p.Id)
    .Select(p => new ProductoDto
    {
        Id = p.Id,
        Nombre = p.Nombre,
        Categoria = p.Categoria,
        Precio = p.Precio,
        Stock = p.Stock
    })
    .ToListAsync();
```

Si la consigna exige DTO, la firma también cambia:

```csharp
Task<List<ProductoDto>> BuscarAsync(...);
```

---

## 10. Service API completo

### Interfaz

```csharp
public interface IProductoService
{
    Task<List<Producto>> BuscarAsync(
        string? nombre,
        string? categoria,
        decimal? precioMaximo,
        bool? soloDisponibles);
}
```

### Implementación

```csharp
public class ProductoService : IProductoService
{
    private readonly IProductoRepository _repository;

    public ProductoService(
        IProductoRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<Producto>> BuscarAsync(
        string? nombre,
        string? categoria,
        decimal? precioMaximo,
        bool? soloDisponibles)
    {
        if (precioMaximo < 0)
        {
            throw new ArgumentException(
                "El precio máximo no puede ser negativo.");
        }

        return await _repository.BuscarAsync(
            nombre?.Trim(),
            categoria?.Trim(),
            precioMaximo,
            soloDisponibles);
    }
}
```

## 10.1 ¿Por qué la validación va aquí?

“Un precio máximo no puede ser negativo” es una regla del caso de uso. No es:

- una decisión de HTTP;
- una consulta a la base;
- una responsabilidad visual.

## 10.2 Normalización

```csharp
nombre?.Trim()
categoria?.Trim()
```

Quita espacios al inicio y al final sin fallar si el valor es `null`.

## 10.3 Validaciones de otras realidades

### Rango de fechas

```csharp
if (desde.HasValue &&
    hasta.HasValue &&
    desde.Value > hasta.Value)
{
    throw new ArgumentException(
        "La fecha desde no puede superar la fecha hasta.");
}
```

### Rango de precios

```csharp
if (minimo < 0 || maximo < 0)
    throw new ArgumentException(
        "Los precios no pueden ser negativos.");

if (minimo.HasValue &&
    maximo.HasValue &&
    minimo.Value > maximo.Value)
{
    throw new ArgumentException(
        "El mínimo no puede superar al máximo.");
}
```

### Paginación

```csharp
if (pagina < 1)
    throw new ArgumentException(
        "La página debe ser mayor o igual a uno.");

if (tamanio < 1 || tamanio > 50)
    throw new ArgumentException(
        "El tamaño debe estar entre 1 y 50.");
```

---

## 11. Controller completo

```csharp
[ApiController]
[Route("api/productos")]
public class ProductosController : ControllerBase
{
    private readonly IProductoService _service;

    public ProductosController(
        IProductoService service)
    {
        _service = service;
    }

    [HttpGet("buscar")]
    public async Task<
        ActionResult<List<Producto>>> Buscar(
        [FromQuery] string? nombre,
        [FromQuery] string? categoria,
        [FromQuery] decimal? precioMaximo,
        [FromQuery] bool? soloDisponibles)
    {
        try
        {
            List<Producto> productos =
                await _service.BuscarAsync(
                    nombre,
                    categoria,
                    precioMaximo,
                    soloDisponibles);

            return Ok(productos);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
```

## 11.1 Respuestas

Precio válido y resultados:

```text
200 OK + lista
```

Precio válido sin coincidencias:

```text
200 OK + []
```

Precio negativo:

```text
400 Bad Request
```

Una búsqueda vacía no significa que la ruta no exista. Por eso no corresponde automáticamente `404`.

## 11.2 Códigos frecuentes

| Código | Uso |
|---:|---|
| 200 | Lectura correcta |
| 201 | Recurso creado |
| 204 | Modificación o eliminación sin cuerpo |
| 400 | Entrada inválida |
| 401 | No autenticado |
| 403 | Autenticado sin permiso |
| 404 | Recurso individual inexistente |
| 409 | Conflicto con el estado actual |

---

## 12. Service de Blazor completo

```csharp
using System.Net.Http.Json;
using System.Globalization;

public class ProductoApiService
{
    private readonly HttpClient _http;

    public ProductoApiService(HttpClient http)
    {
        _http = http;
    }

    public async Task<List<Producto>>
        BuscarProductosAsync(
            string? nombre,
            string? categoria,
            decimal? precioMaximo,
            bool? soloDisponibles)
    {
        var parametros = new List<string>();

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            parametros.Add(
                $"nombre={Uri.EscapeDataString(nombre)}");
        }

        if (!string.IsNullOrWhiteSpace(categoria))
        {
            parametros.Add(
                $"categoria={Uri.EscapeDataString(categoria)}");
        }

        if (precioMaximo.HasValue)
        {
            string precio = precioMaximo.Value
                .ToString(CultureInfo.InvariantCulture);

            parametros.Add($"precioMaximo={precio}");
        }

        if (soloDisponibles.HasValue)
        {
            parametros.Add(
                $"soloDisponibles={soloDisponibles.Value.ToString().ToLowerInvariant()}");
        }

        string url = "api/productos/buscar";

        if (parametros.Count > 0)
        {
            url += "?" + string.Join("&", parametros);
        }

        return await _http
            .GetFromJsonAsync<List<Producto>>(url)
            ?? [];
    }
}
```

## 12.1 Por qué usar `InvariantCulture`

En algunas configuraciones, un decimal podría mostrarse:

```text
1500,50
```

En URLs y formatos interoperables normalmente se espera:

```text
1500.50
```

```csharp
precio.ToString(CultureInfo.InvariantCulture)
```

evita depender de la configuración regional.

## 12.2 Ejemplos de URL producida

Sin filtros:

```text
api/productos/buscar
```

Un filtro:

```text
api/productos/buscar?nombre=Mouse
```

Varios:

```text
api/productos/buscar?nombre=Mouse&categoria=Inform%C3%A1tica&precioMaximo=1500&soloDisponibles=true
```

## 12.3 Variante simple

Si el parcial no exige construir manualmente una lista:

```csharp
string url =
    $"api/productos/buscar?nombre={nombre}&precioMaximo={precioMaximo}";
```

Pero esta versión tiene problemas:

- agrega valores aunque sean `null`;
- no escapa texto;
- puede manejar mal decimales;
- se complica con muchos filtros.

La lista de parámetros es más segura.

---

## 13. Registro de dependencias

API:

```csharp
builder.Services.AddScoped<
    IProductoRepository,
    ProductoRepository>();

builder.Services.AddScoped<
    IProductoService,
    ProductoService>();
```

Blazor:

```csharp
builder.Services.AddHttpClient<
    ProductoApiService>(client =>
{
    client.BaseAddress =
        new Uri("https://localhost:7001/");
});
```

La consigna puede decir que estas configuraciones ya existen. No modificar archivos que no se solicitan.

---

## 14. Variante 1 — Libros

### Filtros

- título contiene;
- género exacto;
- año mínimo;
- solo disponibles.

### Repository

```csharp
public async Task<List<Libro>> BuscarAsync(
    string? titulo,
    string? genero,
    int? anioMinimo,
    bool? soloDisponibles)
{
    IQueryable<Libro> query =
        _context.Libros.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(titulo))
        query = query.Where(l =>
            l.Titulo.Contains(titulo));

    if (!string.IsNullOrWhiteSpace(genero))
        query = query.Where(l =>
            l.Genero == genero);

    if (anioMinimo.HasValue)
        query = query.Where(l =>
            l.Anio >= anioMinimo.Value);

    if (soloDisponibles == true)
        query = query.Where(l =>
            l.Disponible);

    return await query
        .OrderBy(l => l.Titulo)
        .ThenBy(l => l.Id)
        .ToListAsync();
}
```

### Validación posible

```csharp
if (anioMinimo < 0)
    throw new ArgumentException(
        "El año no puede ser negativo.");
```

### URL

```text
/api/libros/buscar?titulo=Anillo&genero=Fantasía&anioMinimo=1950&soloDisponibles=true
```

---

## 15. Variante 2 — Turnos

### Filtros

- profesional por ID;
- estado exacto;
- fecha desde;
- fecha hasta;
- paciente contiene texto.

### Repository

```csharp
public async Task<List<Turno>> BuscarAsync(
    int? profesionalId,
    EstadoTurno? estado,
    DateTime? desde,
    DateTime? hasta,
    string? paciente)
{
    IQueryable<Turno> query =
        _context.Turnos.AsNoTracking();

    if (profesionalId.HasValue)
        query = query.Where(t =>
            t.ProfesionalId == profesionalId.Value);

    if (estado.HasValue)
        query = query.Where(t =>
            t.Estado == estado.Value);

    if (desde.HasValue)
        query = query.Where(t =>
            t.FechaHora >= desde.Value);

    if (hasta.HasValue)
        query = query.Where(t =>
            t.FechaHora <= hasta.Value);

    if (!string.IsNullOrWhiteSpace(paciente))
        query = query.Where(t =>
            t.PacienteNombre.Contains(paciente));

    return await query
        .OrderBy(t => t.FechaHora)
        .ThenBy(t => t.Id)
        .ToListAsync();
}
```

### Validaciones

```csharp
if (profesionalId <= 0)
    throw new ArgumentException(
        "El profesional debe ser válido.");

if (desde.HasValue &&
    hasta.HasValue &&
    desde.Value > hasta.Value)
{
    throw new ArgumentException(
        "El rango de fechas es inválido.");
}
```

### Dificultad adicional

Si la consigna recibe `DateOnly? hasta` pero la columna es `DateTime`, para incluir el día completo:

```csharp
DateTime limite = hasta.Value
    .AddDays(1)
    .ToDateTime(TimeOnly.MinValue);

query = query.Where(t =>
    t.FechaHora < limite);
```

---

## 16. Variante 3 — Empleados

### Filtros

- nombre contiene;
- departamento exacto;
- sueldo mínimo y máximo;
- activo exacto.

```csharp
if (!string.IsNullOrWhiteSpace(nombre))
    query = query.Where(e =>
        e.Nombre.Contains(nombre));

if (!string.IsNullOrWhiteSpace(departamento))
    query = query.Where(e =>
        e.Departamento.Nombre == departamento);

if (sueldoMinimo.HasValue)
    query = query.Where(e =>
        e.Sueldo >= sueldoMinimo.Value);

if (sueldoMaximo.HasValue)
    query = query.Where(e =>
        e.Sueldo <= sueldoMaximo.Value);

if (activo.HasValue)
    query = query.Where(e =>
        e.Activo == activo.Value);
```

Observar la diferencia:

```csharp
if (activo.HasValue)
```

permite filtrar tanto activos como inactivos.

En cambio:

```csharp
if (soloActivos == true)
```

solo agrega el filtro cuando se pide explícitamente `true`.

---

## 17. Variante 4 — Paginación

### DTO de respuesta

```csharp
public class PaginaResultado<T>
{
    public int Pagina { get; set; }
    public int Tamanio { get; set; }
    public int Total { get; set; }
    public List<T> Items { get; set; } = [];
}
```

### Repository

```csharp
IQueryable<Producto> query =
    _context.Productos.AsNoTracking();

// filtros opcionales

int total = await query.CountAsync();

List<ProductoDto> items = await query
    .OrderBy(p => p.Nombre)
    .ThenBy(p => p.Id)
    .Skip((pagina - 1) * tamanio)
    .Take(tamanio)
    .Select(p => new ProductoDto
    {
        Id = p.Id,
        Nombre = p.Nombre,
        Precio = p.Precio
    })
    .ToListAsync();

return new PaginaResultado<ProductoDto>
{
    Pagina = pagina,
    Tamanio = tamanio,
    Total = total,
    Items = items
};
```

### Fórmula

```text
Skip = (pagina - 1) × tamanio
```

Con tamaño 5:

| Página | Skip |
|---:|---:|
| 1 | 0 |
| 2 | 5 |
| 3 | 10 |

### Página fuera de rango

Debe poder devolver:

```json
{
  "pagina": 999,
  "tamanio": 10,
  "total": 23,
  "items": []
}
```

No necesariamente es `404`.

---

## 18. Checklist del práctico

### Firmas

- [ ] Interfaz Repository.
- [ ] Implementación Repository.
- [ ] Interfaz Service.
- [ ] Implementación Service.
- [ ] Controller.
- [ ] Service Blazor.
- [ ] Mismos tipos, parámetros y orden en todas las firmas.

### Repository

- [ ] Comienza con `IQueryable`.
- [ ] Usa `AsNoTracking` para lectura.
- [ ] Aplica solo filtros presentes.
- [ ] Reasigna `query`.
- [ ] Ordena antes de materializar.
- [ ] Usa `ToListAsync`.

### Service

- [ ] Valida reglas.
- [ ] Normaliza texto.
- [ ] Delega al Repository.
- [ ] No usa `Ok()` o `BadRequest()`.

### Controller

- [ ] Usa `[HttpGet("buscar")]`.
- [ ] Usa `[FromQuery]`.
- [ ] Llama al Service.
- [ ] Devuelve `200` con lista vacía.
- [ ] Devuelve `400` para entrada inválida.

### Blazor

- [ ] Construye la URL correcta.
- [ ] Usa `?` una vez.
- [ ] Usa `&` entre parámetros.
- [ ] Incluye solo filtros presentes.
- [ ] Escapa texto.
- [ ] Usa `GetFromJsonAsync`.

---

# Parte 3 — JSON

## 19. Reglas mínimas

JSON utiliza:

- `{}` para objetos;
- `[]` para arrays;
- `:` entre clave y valor;
- `,` entre propiedades o elementos;
- comillas dobles para claves y textos;
- números sin comillas;
- `true` y `false` sin comillas;
- `null` sin comillas.

## 19.1 Tipos

```json
{
  "texto": "Hola",
  "entero": 10,
  "decimal": 1250.50,
  "booleano": true,
  "nulo": null,
  "objeto": {
    "id": 1
  },
  "array": [
    1,
    2,
    3
  ]
}
```

## 19.2 Errores

Incorrecto:

```json
{
  nombre: 'Mouse',
  "precio": "850",
  "disponible": "true",
}
```

Problemas:

- clave sin comillas;
- texto con comillas simples;
- precio convertido a texto;
- booleano convertido a texto;
- coma final.

Correcto:

```json
{
  "nombre": "Mouse",
  "precio": 850,
  "disponible": true
}
```

---

## Ejercicio 12 — Objeto simple

### Datos

- ID: 10
- Nombre: Monitor Samsung
- Precio: 12500
- Stock: 8
- Disponible: verdadero
- Categoría: Informática

### Solución

```json
{
  "id": 10,
  "nombre": "Monitor Samsung",
  "precio": 12500,
  "stock": 8,
  "disponible": true,
  "categoria": "Informática"
}
```

### Ejemplo adicional: libro

```json
{
  "id": 22,
  "titulo": "El nombre del viento",
  "autor": "Patrick Rothfuss",
  "anio": 2007,
  "disponible": false,
  "precioReposicion": 950
}
```

### Ejemplo adicional: turno

```json
{
  "id": 45,
  "paciente": "Ana Pérez",
  "fechaHora": "2026-11-20T09:30:00",
  "estado": "Pendiente",
  "confirmado": false
}
```

Las fechas normalmente viajan como texto en formato ISO.

---

## Ejercicio 13 — Objeto anidado

### Datos

- ID empleado: 5
- Nombre: Martín López
- Activo: verdadero
- Sueldo: 45000
- Departamento:
  - ID: 2
  - Nombre: Administración
  - Ubicación: Primer piso

### Solución

```json
{
  "id": 5,
  "nombre": "Martín López",
  "activo": true,
  "sueldo": 45000,
  "departamento": {
    "id": 2,
    "nombre": "Administración",
    "ubicacion": "Primer piso"
  }
}
```

### Ejemplo adicional: libro y autor

```json
{
  "id": 7,
  "titulo": "Ficciones",
  "disponible": true,
  "autor": {
    "id": 3,
    "nombre": "Jorge Luis Borges",
    "pais": "Argentina"
  }
}
```

### Ejemplo adicional: turno y profesional

```json
{
  "id": 18,
  "paciente": "Mariana López",
  "estado": "Confirmado",
  "profesional": {
    "id": 3,
    "nombre": "Laura Gómez",
    "especialidad": "Medicina general"
  }
}
```

---

## Ejercicio 14 — Array de objetos

### Datos

- Pedido: 1001
- Cliente: Ana Rodríguez
- Entregado: falso
- Productos:
  - Mouse, 850, cantidad 2
  - Teclado, 1500, cantidad 1

### Solución

```json
{
  "numeroPedido": 1001,
  "cliente": "Ana Rodríguez",
  "entregado": false,
  "productos": [
    {
      "nombre": "Mouse",
      "precio": 850,
      "cantidad": 2
    },
    {
      "nombre": "Teclado",
      "precio": 1500,
      "cantidad": 1
    }
  ]
}
```

### Ejemplo adicional: curso y estudiantes

```json
{
  "id": 4,
  "nombre": "Programación II",
  "activo": true,
  "estudiantes": [
    {
      "id": 10,
      "nombre": "Ana"
    },
    {
      "id": 11,
      "nombre": "Juan"
    }
  ]
}
```

### Ejemplo adicional: respuesta paginada

```json
{
  "pagina": 1,
  "tamanio": 2,
  "total": 8,
  "items": [
    {
      "id": 1,
      "nombre": "Mouse",
      "precio": 850
    },
    {
      "id": 2,
      "nombre": "Teclado",
      "precio": 1500
    }
  ]
}
```

---

## 20. Relación JSON ↔ C#

JSON:

```json
{
  "id": 10,
  "nombre": "Monitor",
  "disponible": true
}
```

C#:

```csharp
public class Producto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Disponible { get; set; }
}
```

JSON con array:

```json
{
  "productos": [
    {
      "id": 1,
      "nombre": "Mouse"
    }
  ]
}
```

C#:

```csharp
public class Pedido
{
    public List<Producto> Productos { get; set; } = [];
}
```

Objeto anidado:

```csharp
public class Empleado
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public Departamento Departamento { get; set; } = new();
}
```

---

# Parte 4 — Posibles extensiones del parcial

## 21. DTO

DTO significa Data Transfer Object. Define qué datos entran o salen de la API.

Entidad:

```csharp
public class Usuario
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
}
```

DTO:

```csharp
public class UsuarioDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
}
```

La API no debe exponer `PasswordHash`.

Respuesta:

> Los DTO desacoplan el contrato HTTP del modelo interno, permiten controlar qué campos se reciben o devuelven y evitan exponer información sensible.

---

## 22. JWT

No está pedido explícitamente en el práctico del simulacro, pero pertenece al material más reciente.

### Autenticación

Responde:

> ¿Quién es el usuario?

### Autorización

Responde:

> ¿Qué puede hacer ese usuario?

### JWT

```text
header.payload.signature
```

- header: algoritmo y tipo;
- payload: claims;
- signature: detecta alteraciones.

El payload se puede leer. Firmado no significa cifrado.

### Atributos

```csharp
[Authorize]
```

Exige usuario autenticado.

```csharp
[Authorize(Roles = "Administrador")]
```

Exige rol.

```csharp
[AllowAnonymous]
```

Permite acceso público, por ejemplo al login.

### `401` y `403`

```text
401 = no existe una identidad autenticada válida.
403 = la identidad es válida, pero no tiene permiso.
```

### Pipeline

```csharp
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

Autenticación debe ejecutarse antes de autorización.

---

## 23. `HttpRequestMessage`

Para una petición más personalizada:

```csharp
using var request = new HttpRequestMessage(
    HttpMethod.Get,
    "api/productos");

request.Headers.Authorization =
    new AuthenticationHeaderValue(
        "Bearer",
        token);

using HttpResponseMessage response =
    await _http.SendAsync(request);

response.EnsureSuccessStatusCode();

List<Producto> productos =
    await response.Content
        .ReadFromJsonAsync<List<Producto>>()
    ?? [];
```

Conceptos:

```text
HttpClient = envía y recibe.
HttpRequestMessage = describe una petición.
HttpResponseMessage = representa la respuesta.
```

---

# Parte 5 — Práctica activa

## 24. Ejercicio guiado A — Equipos

Entidad:

```text
Id, Nombre, Ubicacion, Estado, Precio
```

Filtros:

- nombre contiene;
- ubicación contiene;
- estado exacto;
- precio máximo.

Validación:

- precio máximo no negativo.

Tareas:

1. escribir `IEquipoRepository`;
2. implementar `EquipoRepository`;
3. escribir `IEquipoService`;
4. implementar validación;
5. escribir Controller;
6. construir URL desde Blazor;
7. escribir un JSON de equipo.

URL de ejemplo:

```text
/api/equipos/buscar?nombre=excavadora&ubicacion=Colonia&estado=Disponible&precioMaximo=50000
```

---

## 25. Ejercicio guiado B — Películas

Entidad:

```text
Id, Titulo, Genero, Anio, Disponible
```

Filtros:

- título contiene;
- género exacto;
- año desde;
- disponibilidad exacta.

Atención:

```csharp
if (disponible.HasValue)
{
    query = query.Where(p =>
        p.Disponible == disponible.Value);
}
```

Esto permite buscar disponibles o no disponibles.

---

## 26. Ejercicio guiado C — Turnos con paginación

Entidad:

```text
Id, ProfesionalId, PacienteNombre, FechaHora, Estado
```

Filtros:

- profesional;
- estado;
- desde;
- hasta;
- texto del paciente.

Paginación:

- página predeterminada 1;
- tamaño predeterminado 10;
- máximo 50.

Orden:

```text
FechaHora ascendente
Id ascendente
```

Salida:

```json
{
  "pagina": 1,
  "tamanio": 10,
  "total": 2,
  "items": []
}
```

---

## 27. Simulacro rápido de teoría

Responder en dos o tres frases:

1. ¿Por qué el Controller no debe usar `DbContext`?
2. ¿Por qué el Service depende de una interfaz?
3. ¿Qué hace `AddScoped`?
4. ¿Qué significa nullable?
5. ¿Cuándo se ejecuta un `IQueryable`?
6. ¿Por qué no se debe llamar `ToListAsync` antes de filtrar?
7. ¿Qué hace `AsNoTracking`?
8. ¿Qué diferencia hay entre serializar y deserializar?
9. ¿Qué hace `await`?
10. ¿Por qué una lista vacía puede ser `200 OK`?
11. ¿Qué diferencia hay entre `401` y `403`?
12. ¿Por qué se usa DTO?

---

## 28. Errores de sintaxis para detectar

### Error 1

```csharp
public async List<Producto> BuscarAsync()
```

Corrección:

```csharp
public async Task<List<Producto>> BuscarAsync()
```

### Error 2

```csharp
List<Producto> productos =
    _repository.BuscarAsync();
```

Corrección:

```csharp
List<Producto> productos =
    await _repository.BuscarAsync();
```

### Error 3

```csharp
query.Where(p => p.Stock > 0);
```

Corrección:

```csharp
query = query.Where(p => p.Stock > 0);
```

### Error 4

```csharp
var productos = await query.ToListAsync();
productos = productos
    .Where(p => p.Stock > 0)
    .ToList();
```

Corrección:

```csharp
query = query.Where(p => p.Stock > 0);
var productos = await query.ToListAsync();
```

### Error 5

```csharp
return _repository.BuscarAsync(...);
```

Puede ser válido si se devuelve directamente el `Task`, pero si el método está marcado `async` y necesita el resultado:

```csharp
return await _repository.BuscarAsync(...);
```

### Error 6

```csharp
if (soloDisponibles.HasValue)
    query = query.Where(p => p.Stock > 0);
```

Esto aplica el filtro incluso si el valor es `false`.

Según la consigna “si es true”:

```csharp
if (soloDisponibles == true)
    query = query.Where(p => p.Stock > 0);
```

---

# Parte 6 — Machete final de una página

## Flujo

```text
Blazor
→ Service web / HttpClient
→ Controller
→ Service API
→ Repository
→ DbContext
→ DB
```

## Capas

```text
CONTROLLER
HTTP + parámetros + códigos.

SERVICE
validaciones + reglas + normalización.

REPOSITORY
EF Core + IQueryable + ejecución.
```

## DI

```csharp
AddScoped<IService, Service>();
```

> Cuando pidan la interfaz, entregar la implementación durante la petición.

## Query string

```text
/api/productos/buscar?nombre=Mouse&precioMaximo=1500
```

```text
? inicia
& separa
= asigna
```

## Nullable

```text
decimal? = valor o null.
null = filtro ausente.
```

## `IQueryable`

```text
consulta pendiente traducible a SQL.
```

```csharp
IQueryable<Entidad> query =
    _context.Entidades.AsNoTracking();
```

## Filtros

```csharp
if (filtroPresente)
    query = query.Where(...);
```

## Materialización

```csharp
return await query
    .OrderBy(...)
    .ThenBy(x => x.Id)
    .ToListAsync();
```

## JSON

```text
{} objeto
[] array
"texto"
10
true
null
```

## Respuestas HTTP

```text
200 lectura correcta, incluso []
400 entrada inválida
401 sin identidad válida
403 sin permiso
404 recurso individual inexistente
```

## Revisión final

```text
[ ] Interfaz e implementación coinciden.
[ ] Task / async / await correctos.
[ ] query se reasigna.
[ ] ToListAsync está al final.
[ ] Service valida.
[ ] Controller responde HTTP.
[ ] URL usa ? y &.
[ ] JSON usa comillas dobles y sin coma final.
```

---

# Plan sugerido de repetición

## Primera vuelta

- Leer y comprender.
- Copiar manualmente el ejemplo base.
- Resolver los JSON.

## Segunda vuelta

- Cerrar la guía.
- Rehacer Productos sin mirar.
- Corregir con otro color.

## Tercera vuelta

- Resolver Libros.
- Cambiar al menos dos reglas.
- Explicar cada capa oralmente.

## Cuarta vuelta

- Resolver Turnos con fechas.
- Agregar paginación.
- Construir URL desde Blazor.

## Quinta vuelta

- Simulacro de tres horas.
- Sin copiar.
- Marcar errores de arquitectura, sintaxis y JSON por separado.

## Criterio de preparación

Estás listo cuando puedas:

1. explicar el flujo en menos de dos minutos;
2. escribir las cuatro capas sin depender del nombre `Producto`;
3. convertir cada filtro escrito en una condición LINQ;
4. construir una URL con filtros opcionales;
5. escribir JSON simple, anidado y con arrays sin errores;
6. detectar por qué una solución materializa demasiado pronto;
7. justificar dónde se valida cada regla.

## Relacionado

- [[03-Studies/DYDA-Parcial-2]]
- [[03-Studies/Blazor]]
- [[03-Studies/Analista-Programador]]
- [[02-Projects/REPORTEROS/REPORTEROS - README|REPORTEROS]]
- [[02-Projects/Maquinaria-DYDA/Maquinaria-DYDA - README|Maquinaria DYDA]]
