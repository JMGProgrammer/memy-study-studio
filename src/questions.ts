export type Topic = 'Arquitectura' | 'Inyección de dependencias' | 'HTTP y FromQuery' | 'LINQ y EF Core' | 'JSON' | 'CSR práctico' | 'Blazor y HttpClient' | 'JWT'
export interface Answer { text: string; kind: 'text' | 'code' }
export interface Question {
  id: string; topic: Topic; difficulty: 'Base' | 'Intermedio' | 'Parcial'; fileName: string
  title: string; prompt: string; context?: string; contextLabel?: string; answers: Answer[]
  correctAnswer: number; explanation: string; memoryRule: string
}
const text = (value: string): Answer => ({ text: value, kind: 'text' })
const code = (value: string): Answer => ({ text: value, kind: 'code' })

export const questions: Question[] = [
  {
    id: 'arch-01', topic: 'Arquitectura', difficulty: 'Base', fileName: 'FlujoConsulta.cs', title: 'Recorrido de una consulta',
    prompt: '¿Cuál es el orden correcto cuando una página Blazor consulta productos almacenados en la base de datos?',
    answers: [text('Blazor → Repository → Controller → Service → Base de datos'), text('Blazor → Service web → Controller → Service API → Repository → Base de datos'), text('Controller → Blazor → Repository → Service → Base de datos'), text('Blazor → DbContext → Service → Controller → Base de datos')],
    correctAnswer: 1, explanation: 'Blazor consume la API mediante un Service web. La frontera HTTP es el Controller, las reglas viven en el Service API y el Repository accede a datos.', memoryRule: 'UI → HTTP → Controller → reglas → datos.',
  },
  {
    id: 'arch-02', topic: 'Arquitectura', difficulty: 'Base', fileName: 'Responsabilidades.cs', title: 'Responsabilidad del Service',
    prompt: '¿Qué responsabilidad corresponde al Service de la API?',
    answers: [text('Construir componentes Razor'), text('Ejecutar SQL y devolver IActionResult'), text('Validar, normalizar y aplicar reglas del caso de uso'), text('Leer parámetros con FromQuery')],
    correctAnswer: 2, explanation: 'El Service concentra reglas y validaciones. No conoce detalles visuales ni debería decidir respuestas HTTP.', memoryRule: 'Service = reglas; Controller = HTTP; Repository = datos.',
  },
  {
    id: 'arch-03', topic: 'Arquitectura', difficulty: 'Intermedio', fileName: 'ListaVacia.cs', title: 'Búsqueda sin coincidencias',
    prompt: 'Una búsqueda válida no encuentra productos. ¿Qué respuesta es la más apropiada según el simulacro?',
    answers: [text('404 Not Found'), text('204 No Content siempre'), text('200 OK con una lista vacía'), text('400 Bad Request')],
    correctAnswer: 2, explanation: 'La ruta existe y la consulta fue válida. Una colección sin coincidencias se representa como [] con 200 OK.', memoryRule: 'Lista vacía no equivale a recurso/ruta inexistente.',
  },
  {
    id: 'di-01', topic: 'Inyección de dependencias', difficulty: 'Base', fileName: 'Program.cs', title: 'Interpretar AddScoped',
    prompt: '¿Qué significa este registro?', context: 'builder.Services.AddScoped<IProductoService, ProductoService>();',
    answers: [text('ProductoService será una instancia global'), text('Al solicitar IProductoService se entregará ProductoService durante la petición'), text('La interfaz hereda de ProductoService'), text('ProductoService se ejecuta al iniciar')],
    correctAnswer: 1, explanation: 'El contenedor relaciona la abstracción con su implementación. Scoped mantiene la instancia dentro de la petición HTTP.', memoryRule: 'Izquierda: lo que se pide. Derecha: lo que se entrega.',
  },
  {
    id: 'di-02', topic: 'Inyección de dependencias', difficulty: 'Intermedio', fileName: 'ProductosController.cs', title: 'Constructor desacoplado',
    prompt: '¿Qué constructor respeta mejor la inyección de dependencias?',
    answers: [code('public ProductosController()\n{\n    _service = new ProductoService();\n}'), code('public ProductosController(IProductoService service)\n{\n    _service = service;\n}'), code('public ProductosController(AppDbContext context)\n{\n    _service = context;\n}'), code('public static ProductosController(ProductoService service) { }')],
    correctAnswer: 1, explanation: 'El Controller depende del contrato y recibe la implementación resuelta por el contenedor.', memoryRule: 'Depender de interfaces; no construir servicios con new.',
  },
  {
    id: 'http-01', topic: 'HTTP y FromQuery', difficulty: 'Base', fileName: 'ProductosController.cs', title: 'Construir la query string',
    prompt: '¿Cuál URL filtra nombre Mouse y precio máximo 1500?',
    answers: [code('/api/productos/buscar/nombre=Mouse/precioMaximo=1500'), code('/api/productos/buscar?nombre=Mouse?precioMaximo=1500'), code('/api/productos/buscar?nombre=Mouse&precioMaximo=1500'), code('/api/productos/buscar&nombre=Mouse?precioMaximo=1500')],
    correctAnswer: 2, explanation: 'El primer parámetro comienza con ? y los siguientes se separan con &.', memoryRule: '? inicia; & separa; = asigna.',
  },
  {
    id: 'http-02', topic: 'HTTP y FromQuery', difficulty: 'Base', fileName: 'Filtros.cs', title: 'Significado de nullable',
    prompt: '¿Qué aporta decimal? precioMaximo en un filtro?',
    answers: [text('Solo permite positivos'), text('Permite un decimal o null; null representa filtro ausente'), text('Convierte el decimal a texto'), text('Hace obligatorio el parámetro')],
    correctAnswer: 1, explanation: 'El signo ? permite distinguir que el usuario no envió el filtro de un valor real.', memoryRule: 'Nullable = valor o ausencia explícita.',
  },
  {
    id: 'http-03', topic: 'HTTP y FromQuery', difficulty: 'Intermedio', fileName: 'Disponibilidad.cs', title: 'Filtro booleano opcional',
    prompt: 'La regla dice: “si soloDisponibles es true, exigir Stock > 0”. ¿Cuál condición es correcta?',
    answers: [code('if (soloDisponibles.HasValue)\n    query = query.Where(p => p.Stock > 0);'), code('if (soloDisponibles == true)\n    query = query.Where(p => p.Stock > 0);'), code('if (soloDisponibles == false)\n    query = query.Where(p => p.Stock > 0);'), code('query = query.Where(p => soloDisponibles);')],
    correctAnswer: 1, explanation: 'HasValue también es verdadero cuando el valor es false. La consigna exige aplicar el filtro solo con true.', memoryRule: 'bool? requiere interpretar la regla.',
  },
  {
    id: 'linq-01', topic: 'LINQ y EF Core', difficulty: 'Base', fileName: 'ProductoRepository.cs', title: 'IQueryable vs IEnumerable',
    prompt: '¿Por qué conviene IQueryable al construir filtros para la base?',
    answers: [text('Siempre guarda resultados en memoria'), text('EF compone y traduce la consulta a SQL antes de descargar datos'), text('Evita utilizar Where'), text('No necesita ToListAsync')],
    correctAnswer: 1, explanation: 'IQueryable conserva una expresión pendiente. Los filtros pueden ejecutarse en la base.', memoryRule: 'IQueryable construye la pregunta; ToListAsync la ejecuta.',
  },
  {
    id: 'linq-02', topic: 'LINQ y EF Core', difficulty: 'Intermedio', fileName: 'ProductoRepository.cs', title: 'Reasignar la consulta',
    prompt: '¿Cuál versión agrega correctamente un filtro al IQueryable?',
    answers: [code('query.Where(p => p.Stock > 0);'), code('query = query.Where(p => p.Stock > 0);'), code('query.ToListAsync().Where(p => p.Stock > 0);'), code('query.Add(p => p.Stock > 0);')],
    correctAnswer: 1, explanation: 'Los operadores LINQ devuelven una nueva consulta; no modifican la variable original.', memoryRule: 'query = query.Where(...).',
  },
  {
    id: 'linq-03', topic: 'LINQ y EF Core', difficulty: 'Parcial', fileName: 'Paginacion.cs', title: 'Orden de una consulta paginada',
    prompt: '¿Cuál es el orden conceptual correcto?',
    answers: [text('ToListAsync → Where → Skip → CountAsync'), text('Where → Skip/Take → CountAsync → OrderBy'), text('Where → CountAsync → OrderBy/ThenBy → Skip/Take → Select → ToListAsync'), text('Select → ToListAsync → Where → CountAsync')],
    correctAnswer: 2, explanation: 'El total se cuenta sobre todos los resultados filtrados, antes de limitar la página.', memoryRule: 'Filtrar, contar, ordenar, paginar, proyectar, materializar.',
  },
  {
    id: 'linq-04', topic: 'LINQ y EF Core', difficulty: 'Intermedio', fileName: 'Consulta.cs', title: 'Interpretar código LINQ',
    prompt: '¿Qué devuelve este método?', context: 'return await _context.Productos\n    .Where(p => p.Stock > 0)\n    .OrderBy(p => p.Nombre)\n    .ToListAsync();',
    answers: [text('Todos, ordenados por stock'), text('Productos con stock positivo, ordenados por nombre'), text('Un único producto'), text('La cantidad disponible')],
    correctAnswer: 1, explanation: 'Where conserva Stock > 0, OrderBy ordena por Nombre y ToListAsync materializa una lista.', memoryRule: 'Origen, filtro, orden, ejecución.',
  },
  {
    id: 'linq-05', topic: 'LINQ y EF Core', difficulty: 'Parcial', fileName: 'ErrorRendimiento.cs', title: 'Materialización prematura',
    prompt: '¿Cuál implementación evita traer toda la tabla antes de filtrar?',
    answers: [code('var todos = await _context.Productos.ToListAsync();\nreturn todos.Where(p => p.Stock > 0).ToList();'), code('return await _context.Productos\n    .Where(p => p.Stock > 0)\n    .ToListAsync();'), code('return _context.Productos.AsEnumerable()\n    .Where(p => p.Stock > 0).ToList();'), code('var todos = _context.Productos.ToList();\nreturn todos;')],
    correctAnswer: 1, explanation: 'Where permanece en IQueryable y EF lo traduce a SQL antes de materializar.', memoryRule: 'ToListAsync lo más tarde posible.',
  },
  {
    id: 'json-01', topic: 'JSON', difficulty: 'Base', fileName: 'producto.json', title: 'JSON válido',
    prompt: '¿Cuál representa correctamente un producto disponible?',
    answers: [code("{ nombre: 'Mouse', disponible: 'true', precio: '850' }"), code('{ "nombre": "Mouse", "disponible": true, "precio": 850 }'), code('{ "nombre" = "Mouse", "disponible" = true }'), code('{ "nombre": "Mouse", "disponible": True, }')],
    correctAnswer: 1, explanation: 'JSON usa comillas dobles, dos puntos, booleanos en minúscula y no admite coma final.', memoryRule: 'Texto con comillas; números y booleanos sin comillas.',
  },
  {
    id: 'json-02', topic: 'JSON', difficulty: 'Base', fileName: 'Serializacion.cs', title: 'Serializar y deserializar',
    prompt: '¿Qué afirmación es correcta?',
    answers: [text('Serializar convierte JSON a C#'), text('Serializar convierte un objeto a JSON; deserializar convierte JSON a un objeto'), text('Ambas convierten objetos a SQL'), text('Deserializar solo sirve para archivos')],
    correctAnswer: 1, explanation: 'La serialización prepara datos para enviarlos; la deserialización reconstruye objetos.', memoryRule: 'Objeto → JSON = serializar. JSON → objeto = deserializar.',
  },
  {
    id: 'json-03', topic: 'JSON', difficulty: 'Intermedio', fileName: 'empleado.json', title: 'Objeto anidado',
    prompt: '¿Cuál estructura representa un departamento dentro del empleado?',
    answers: [code('{ "id": 5, "departamento": [2, "Administración"] }'), code('{ "id": 5, "departamento": { "id": 2, "nombre": "Administración" } }'), code('{ "id": 5, "departamento.id": 2 }'), code('{ "id": 5, departamento { "id": 2 } }')],
    correctAnswer: 1, explanation: 'Un objeto anidado se asigna como valor de una propiedad y usa llaves.', memoryRule: '{} objeto; [] colección.',
  },
  {
    id: 'json-04', topic: 'JSON', difficulty: 'Intermedio', fileName: 'pedido.json', title: 'Array de objetos',
    prompt: '¿Cuál representa correctamente varios productos?',
    answers: [code('{ "productos": { "Mouse", "Teclado" } }'), code('{ "productos": ["Mouse": 2, "Teclado": 1] }'), code('{ "productos": [{ "nombre": "Mouse", "cantidad": 2 }, { "nombre": "Teclado", "cantidad": 1 }] }'), code('{ "productos": ("Mouse", "Teclado") }')],
    correctAnswer: 2, explanation: 'El array usa corchetes y cada producto es un objeto con llaves.', memoryRule: 'Lista de objetos = [{...}, {...}].',
  },
  {
    id: 'csr-01', topic: 'CSR práctico', difficulty: 'Parcial', fileName: 'ProductoRepository.cs', title: 'Filtro opcional de texto',
    prompt: '¿Cuál implementación respeta un filtro opcional por nombre?',
    answers: [code('query = query.Where(p => p.Nombre == nombre);'), code('if (!string.IsNullOrWhiteSpace(nombre))\n{\n    query = query.Where(p => p.Nombre.Contains(nombre));\n}'), code('if (nombre == null)\n    query = query.Where(p => p.Nombre.Contains(nombre));'), code('query = query.ToList().Where(p => p.Nombre.Contains(nombre));')],
    correctAnswer: 1, explanation: 'Solo agrega Where si el texto está presente y Contains implementa coincidencia parcial.', memoryRule: 'if presente + query = query.Where.',
  },
  {
    id: 'csr-02', topic: 'CSR práctico', difficulty: 'Intermedio', fileName: 'ProductoService.cs', title: 'Ubicar la validación',
    prompt: '¿Dónde debe validarse que precioMaximo no sea negativo?',
    answers: [text('En Blazor únicamente'), text('En Repository'), text('En Service de la API'), text('En DbContext')],
    correctAnswer: 2, explanation: 'Es una regla del caso de uso. La API debe validarla en su Service.', memoryRule: 'Reglas y validaciones pertenecen al Service.',
  },
  {
    id: 'csr-03', topic: 'CSR práctico', difficulty: 'Parcial', fileName: 'Firmas.cs', title: 'Firma asincrónica correcta',
    prompt: '¿Cuál firma es válida para una búsqueda asincrónica?',
    answers: [code('public async List<Producto> BuscarAsync(...)'), code('public Task BuscarAsync<List<Producto>>(...)'), code('public async Task<List<Producto>> BuscarAsync(...)'), code('public await List<Producto> BuscarAsync(...)')],
    correctAnswer: 2, explanation: 'Un método async con resultado debe devolver Task<T>.', memoryRule: 'async + resultado T = Task<T>.',
  },
  {
    id: 'csr-04', topic: 'CSR práctico', difficulty: 'Parcial', fileName: 'ProductosController.cs', title: 'Controller correcto',
    prompt: '¿Cuál endpoint delega correctamente y transforma una validación en HTTP 400?',
    answers: [code('[HttpGet("buscar")]\npublic List<Producto> Buscar() => _context.Productos.ToList();'), code('[HttpGet("buscar")]\npublic async Task<IActionResult> Buscar([FromQuery] decimal? maximo)\n{\n    try { return Ok(await _service.BuscarAsync(maximo)); }\n    catch (ArgumentException ex) { return BadRequest(ex.Message); }\n}'), code('[HttpGet("buscar")]\npublic async Task<IActionResult> Buscar(decimal? maximo)\n{\n    return await _repository.BuscarAsync(maximo);\n}'), code('[HttpPost("buscar")]\npublic IActionResult Buscar() => NotFound();')],
    correctAnswer: 1, explanation: 'El Controller recibe query, delega, espera y decide la respuesta HTTP.', memoryRule: 'Controller fino: recibir, delegar, responder.',
  },
  {
    id: 'blazor-01', topic: 'Blazor y HttpClient', difficulty: 'Intermedio', fileName: 'ProductoApiService.cs', title: 'Consumir una lista JSON',
    prompt: '¿Qué método obtiene y deserializa una lista de productos?',
    answers: [code('await _http.GetStringAsync<List<Producto>>(url);'), code('await _http.GetFromJsonAsync<List<Producto>>(url) ?? [];'), code('await _http.PostAsJsonAsync<List<Producto>>(url);'), code('await _context.Productos.ToListAsync();')],
    correctAnswer: 1, explanation: 'GetFromJsonAsync realiza GET y deserializa el cuerpo JSON.', memoryRule: 'GET + JSON → GetFromJsonAsync<T>.',
  },
  {
    id: 'blazor-02', topic: 'Blazor y HttpClient', difficulty: 'Parcial', fileName: 'ProductoApiService.cs', title: 'URL con filtros opcionales',
    prompt: '¿Cuál enfoque evita agregar filtros ausentes?',
    answers: [code('string url = $"api/productos?nombre={nombre}&maximo={maximo}";'), code('var parametros = new List<string>();\nif (!string.IsNullOrWhiteSpace(nombre))\n    parametros.Add($"nombre={Uri.EscapeDataString(nombre)}");\nstring url = "api/productos/buscar" + (parametros.Count > 0 ? "?" + string.Join("&", parametros) : "");'), code('string url = "api/productos/buscar?" + nombre + maximo;'), code('string url = "api/productos/buscar&&nombre=" + nombre;')],
    correctAnswer: 1, explanation: 'La lista incluye solo valores presentes y une parámetros correctamente.', memoryRule: 'Recolectar, unir con &, agregar ? si hay alguno.',
  },
  {
    id: 'jwt-01', topic: 'JWT', difficulty: 'Base', fileName: 'Authorization.cs', title: '401 frente a 403',
    prompt: 'Un JWT es válido, pero el usuario no tiene rol Administrador. ¿Qué código corresponde?',
    answers: [text('200 OK'), text('400 Bad Request'), text('401 Unauthorized'), text('403 Forbidden')],
    correctAnswer: 3, explanation: 'La identidad es válida, pero carece del permiso requerido.', memoryRule: '401: identidad falla. 403: identidad válida sin permiso.',
  },
  {
    id: 'jwt-02', topic: 'JWT', difficulty: 'Intermedio', fileName: 'Program.cs', title: 'Orden del pipeline',
    prompt: '¿Cuál orden es correcto?',
    answers: [code('app.UseAuthorization();\napp.UseAuthentication();\napp.MapControllers();'), code('app.UseAuthentication();\napp.UseAuthorization();\napp.MapControllers();'), code('app.MapControllers();\napp.UseAuthentication();'), code('app.UseJwt();\napp.MapControllers();')],
    correctAnswer: 1, explanation: 'Primero se construye la identidad y después se evalúan permisos.', memoryRule: 'Autenticar antes de autorizar.',
  },
  {
    id: 'arch-04', topic: 'Arquitectura', difficulty: 'Intermedio', fileName: 'ProductoService.cs', title: 'Dirección de dependencias',
    prompt: '¿Qué dependencia respeta la separación de capas?',
    answers: [text('Repository depende del Controller para responder HTTP'), text('Service depende del Controller para validar filtros'), text('Controller depende de IService para ejecutar el caso de uso'), text('DbContext depende del Service para construir entidades')],
    correctAnswer: 2, explanation: 'El Controller delega en la abstracción del Service. Las capas internas no deben depender de la frontera HTTP.', memoryRule: 'La dependencia avanza desde HTTP hacia negocio y datos.',
  },
  {
    id: 'arch-05', topic: 'Arquitectura', difficulty: 'Parcial', fileName: 'Contratos.cs', title: 'Entidad frente a DTO',
    prompt: '¿Cuál razón justifica devolver DTO desde una API?',
    answers: [text('Permite reemplazar automáticamente Entity Framework'), text('Controla el contrato sin exponer el modelo interno'), text('Evita registrar dependencias dentro de Program.cs'), text('Convierte cualquier consulta síncrona en asincrónica')],
    correctAnswer: 1, explanation: 'El DTO define explícitamente los campos públicos y desacopla la API de la entidad persistida.', memoryRule: 'Entidad es modelo interno; DTO es contrato de transporte.',
  },
  {
    id: 'arch-06', topic: 'Arquitectura', difficulty: 'Base', fileName: 'AppDbContext.cs', title: 'Función del DbContext',
    prompt: '¿Cuál descripción corresponde al DbContext?',
    answers: [text('Representa la sesión con la base y expone DbSet'), text('Decide códigos HTTP y serializa respuestas'), text('Construye componentes y administra eventos Razor'), text('Valida reglas comerciales antes del Repository')],
    correctAnswer: 0, explanation: 'DbContext configura y coordina el acceso de EF Core a entidades y tablas.', memoryRule: 'DbContext conecta el modelo de C# con la persistencia.',
  },
  {
    id: 'di-03', topic: 'Inyección de dependencias', difficulty: 'Base', fileName: 'Program.cs', title: 'Registro faltante',
    prompt: 'ProductoService recibe IProductoRepository. ¿Qué registro adicional necesita la API?',
    answers: [code('builder.Services.AddScoped<IProductoRepository, ProductoRepository>();'), code('builder.Services.AddScoped<Producto, AppDbContext>();'), code('builder.Services.AddSingleton<Controller, Producto>();'), code('builder.Services.AddTransient<DbSet, IProductoService>();')],
    correctAnswer: 0, explanation: 'El contenedor también debe conocer la implementación que entregará cuando el Service pida IProductoRepository.', memoryRule: 'Registrar cada interfaz solicitada por constructor.',
  },
  {
    id: 'di-04', topic: 'Inyección de dependencias', difficulty: 'Parcial', fileName: 'Lifetime.cs', title: 'Lifetime incompatible',
    prompt: '¿Qué combinación puede provocar un problema de ciclo de vida?',
    answers: [text('Repository Scoped utiliza un DbContext Scoped'), text('Controller Scoped recibe un Service Scoped'), text('Service Singleton recibe un Repository Scoped'), text('Service Transient recibe configuración Singleton')],
    correctAnswer: 2, explanation: 'Una instancia Singleton no debe capturar una dependencia Scoped que pertenece a una petición.', memoryRule: 'Una dependencia no debe vivir menos que quien la conserva.',
  },
  {
    id: 'di-05', topic: 'Inyección de dependencias', difficulty: 'Intermedio', fileName: 'LibroService.cs', title: 'Ventaja de la interfaz',
    prompt: '¿Qué cambio facilita depender de ILibroRepository?',
    answers: [text('Sustituir la implementación sin cambiar el Service consumidor'), text('Eliminar la necesidad de definir métodos asincrónicos'), text('Permitir que Repository devuelva códigos de estado HTTP'), text('Convertir automáticamente entidades en objetos JSON')],
    correctAnswer: 0, explanation: 'La abstracción permite reemplazar implementaciones y preparar pruebas sin acoplar el consumidor.', memoryRule: 'La interfaz fija qué; la clase decide cómo.',
  },
  {
    id: 'http-04', topic: 'HTTP y FromQuery', difficulty: 'Intermedio', fileName: 'ProductosController.cs', title: 'FromRoute o FromQuery',
    prompt: 'Para GET /api/productos/8?incluirStock=true, ¿qué enlace es coherente?',
    answers: [code('Get([FromQuery] int id, [FromRoute] bool incluirStock)'), code('Get([FromRoute] int id, [FromQuery] bool incluirStock)'), code('Get([FromBody] int id, [FromBody] bool incluirStock)'), code('Get([FromHeader] int id, [FromRoute] bool incluirStock)')],
    correctAnswer: 1, explanation: 'El 8 forma parte de la ruta; incluirStock aparece después de ? dentro de la query string.', memoryRule: 'Segmento de ruta → FromRoute; parámetros tras ? → FromQuery.',
  },
  {
    id: 'http-05', topic: 'HTTP y FromQuery', difficulty: 'Parcial', fileName: 'CodigosHttp.cs', title: 'Conflicto de código duplicado',
    prompt: 'La creación es válida, pero el código del producto ya existe. ¿Qué respuesta representa mejor el caso?',
    answers: [text('400 porque la sintaxis del JSON es inválida'), text('404 porque el producto nuevo todavía no existe'), text('409 porque entra en conflicto con datos existentes'), text('204 porque no se creó contenido adicional')],
    correctAnswer: 2, explanation: 'La solicitud es comprensible, pero contradice una restricción del estado actual.', memoryRule: 'Duplicado o conflicto de estado suele corresponder a 409.',
  },
  {
    id: 'http-06', topic: 'HTTP y FromQuery', difficulty: 'Base', fileName: 'ProductosController.cs', title: 'Ruta de búsqueda',
    prompt: 'Con [Route("api/productos")] y [HttpGet("buscar")], ¿cuál es la ruta resultante?',
    answers: [code('/api/buscar/productos'), code('/productos/api/buscar'), code('/api/productos/buscar'), code('/api/productos?buscar=true')],
    correctAnswer: 2, explanation: 'La plantilla del Controller se combina con la plantilla de la acción.', memoryRule: 'Ruta final = Route del Controller + plantilla de HttpGet.',
  },
  {
    id: 'linq-06', topic: 'LINQ y EF Core', difficulty: 'Base', fileName: 'MetodosLinq.cs', title: 'Comprobar existencia',
    prompt: '¿Qué operación comprueba eficientemente si existe un código?',
    answers: [code('await query.ToListAsync() != null'), code('await query.AnyAsync(p => p.Codigo == codigo)'), code('await query.CountAsync() >= 0'), code('await query.FirstAsync() == codigo')],
    correctAnswer: 1, explanation: 'AnyAsync expresa directamente una comprobación de existencia y puede traducirse de forma eficiente.', memoryRule: 'Para “¿existe alguno?” usar AnyAsync.',
  },
  {
    id: 'linq-07', topic: 'LINQ y EF Core', difficulty: 'Intermedio', fileName: 'OrdenEstable.cs', title: 'Orden estable',
    prompt: '¿Por qué agregar ThenBy(p => p.Id) después de ordenar por nombre?',
    answers: [text('Convierte el nombre en una clave primaria'), text('Evita materializar los registros de la consulta'), text('Desempata valores repetidos con un criterio único'), text('Cambia el orden ascendente por orden descendente')],
    correctAnswer: 2, explanation: 'Cuando el primer campo se repite, el ID mantiene una posición predecible, especialmente al paginar.', memoryRule: 'Paginación confiable necesita orden total y estable.',
  },
  {
    id: 'linq-08', topic: 'LINQ y EF Core', difficulty: 'Parcial', fileName: 'Conteo.cs', title: 'Total paginado',
    prompt: '¿Dónde debe ejecutarse CountAsync para informar el total de coincidencias?',
    answers: [text('Después de Skip y Take, sobre la página actual'), text('Después de Where y antes de Skip y Take'), text('Antes de aplicar cualquier filtro opcional'), text('Después de convertir todos los registros a memoria')],
    correctAnswer: 1, explanation: 'El total incluye todos los filtros, pero no debe quedar limitado al tamaño de una página.', memoryRule: 'Count después de filtrar y antes de paginar.',
  },
  {
    id: 'linq-09', topic: 'LINQ y EF Core', difficulty: 'Intermedio', fileName: 'Proyeccion.cs', title: 'Select antes de materializar',
    prompt: '¿Qué ventaja tiene Select antes de ToListAsync?',
    answers: [text('Solicita únicamente las columnas necesarias para el DTO'), text('Impide que Entity Framework traduzca la consulta'), text('Mantiene todas las entidades rastreadas por el contexto'), text('Reemplaza las validaciones que pertenecen al Service')],
    correctAnswer: 0, explanation: 'EF puede proyectar en SQL y traer solo la forma requerida por el contrato.', memoryRule: 'Proyectar temprano reduce columnas; materializar tarde reduce filas.',
  },
  {
    id: 'linq-10', topic: 'LINQ y EF Core', difficulty: 'Parcial', fileName: 'Fechas.cs', title: 'Incluir el día final',
    prompt: 'FechaHora contiene hora. ¿Qué filtro incluye completamente el día hasta?',
    answers: [code('x.FechaHora <= hasta.ToDateTime(TimeOnly.MinValue)'), code('x.FechaHora.Date == hasta.ToDateTime(TimeOnly.MinValue)'), code('x.FechaHora < hasta.AddDays(1).ToDateTime(TimeOnly.MinValue)'), code('x.FechaHora.ToString() <= hasta.ToString()')],
    correctAnswer: 2, explanation: 'El límite abierto del día siguiente incluye todas las horas del día solicitado sin depender de precisión.', memoryRule: 'Hasta inclusivo en DateTime: menor que mañana a las 00:00.',
  },
  {
    id: 'json-05', topic: 'JSON', difficulty: 'Base', fileName: 'tipos.json', title: 'Tipos JSON',
    prompt: '¿Cuál propiedad conserva correctamente sus tipos?',
    answers: [code('{ "stock": "8", "activo": "false" }'), code('{ "stock": 8, "activo": false }'), code('{ "stock": 8, "activo": False }'), code("{ 'stock': 8, 'activo': false }")],
    correctAnswer: 1, explanation: 'Los números y booleanos no llevan comillas; los booleanos JSON se escriben en minúscula.', memoryRule: 'Las comillas cambian números y booleanos a texto.',
  },
  {
    id: 'json-06', topic: 'JSON', difficulty: 'Parcial', fileName: 'respuesta.json', title: 'Forma del contrato',
    prompt: 'La API devuelve {"items":[],"total":0}. ¿Qué tipo debería deserializar Blazor?',
    answers: [code('List<Producto>'), code('Producto'), code('PaginaResultado<Producto>'), code('Dictionary<int, Producto>')],
    correctAnswer: 2, explanation: 'El objeto raíz contiene metadatos e items; no es un array directo de productos.', memoryRule: 'El tipo de C# debe reflejar la forma del objeto raíz.',
  },
  {
    id: 'json-07', topic: 'JSON', difficulty: 'Intermedio', fileName: 'fechas.json', title: 'Fecha en JSON',
    prompt: '¿Cuál representación es apropiada para una fecha y hora intercambiada por API?',
    answers: [code('{ "fechaHora": "2026-11-20T09:30:00" }'), code('{ "fechaHora": 20/11/2026 09:30 }'), code('{ "fechaHora": { 2026, 11, 20, 9, 30 } }'), code('{ "fechaHora": DateTime(2026,11,20) }')],
    correctAnswer: 0, explanation: 'JSON no tiene un tipo fecha nativo; normalmente se intercambia como texto ISO 8601.', memoryRule: 'Fecha JSON suele ser string ISO; C# la deserializa al tipo fecha.',
  },
  {
    id: 'csr-05', topic: 'CSR práctico', difficulty: 'Base', fileName: 'IProductoRepository.cs', title: 'Contrato del Repository',
    prompt: '¿Qué contiene una interfaz de Repository?',
    answers: [text('Firmas de acceso a datos sin implementación'), text('Métodos Razor y eventos de componentes'), text('Códigos HTTP con cuerpos de respuesta'), text('Configuración visual y estilos del cliente')],
    correctAnswer: 0, explanation: 'La interfaz establece las operaciones disponibles; la clase concreta contiene sus cuerpos.', memoryRule: 'Interfaz = contrato sin implementación.',
  },
  {
    id: 'csr-06', topic: 'CSR práctico', difficulty: 'Intermedio', fileName: 'ProductoService.cs', title: 'Normalizar filtros',
    prompt: '¿Qué expresión quita espacios sin fallar cuando nombre es null?',
    answers: [code('nombre.Trim()!'), code('nombre?.Trim()'), code('nombre.Value.Trim()'), code('Trim(nombre ?? null)!')],
    correctAnswer: 1, explanation: 'El operador condicional nulo ejecuta Trim solo cuando existe un string.', memoryRule: 'texto?.Trim() conserva null y normaliza valores presentes.',
  },
  {
    id: 'csr-07', topic: 'CSR práctico', difficulty: 'Parcial', fileName: 'ProductoRepository.cs', title: 'Categoría exacta',
    prompt: 'La consigna exige coincidencia exacta por categoría. ¿Qué condición corresponde?',
    answers: [code('p.Categoria.Contains(categoria)'), code('p.Categoria.StartsWith(categoria)'), code('p.Categoria == categoria'), code('p.Categoria.Length == categoria.Length')],
    correctAnswer: 2, explanation: 'La igualdad representa coincidencia exacta; Contains aceptaría coincidencias parciales.', memoryRule: 'Traducir literalmente la regla: contiene ≠ exacto.',
  },
  {
    id: 'csr-08', topic: 'CSR práctico', difficulty: 'Parcial', fileName: 'FirmasCapas.cs', title: 'Consistencia entre capas',
    prompt: '¿Qué debe mantenerse entre interfaz e implementación?',
    answers: [text('Solo el nombre; parámetros y retorno pueden variar'), text('Retorno compatible, nombre y parámetros correspondientes'), text('Solo los parámetros; el retorno se decide al ejecutar'), text('Solo el modificador public; la firma restante es libre')],
    correctAnswer: 1, explanation: 'La clase debe cumplir el contrato de la interfaz con una firma compatible.', memoryRule: 'Cambiar una firma obliga a actualizar contrato, implementación y llamadas.',
  },
  {
    id: 'blazor-03', topic: 'Blazor y HttpClient', difficulty: 'Base', fileName: 'ProductoApiService.cs', title: 'Enviar JSON',
    prompt: '¿Qué método envía un objeto como JSON mediante POST?',
    answers: [code('_http.GetFromJsonAsync(url, producto)'), code('_http.PostAsJsonAsync(url, producto)'), code('_http.ReadFromJsonAsync(url, producto)'), code('_http.SendStringAsync(url, producto)')],
    correctAnswer: 1, explanation: 'PostAsJsonAsync serializa el objeto, configura el contenido JSON y realiza POST.', memoryRule: 'POST de objeto JSON → PostAsJsonAsync.',
  },
  {
    id: 'blazor-04', topic: 'Blazor y HttpClient', difficulty: 'Parcial', fileName: 'ProductoApiService.cs', title: 'Respuesta HTTP no exitosa',
    prompt: '¿Qué afirmación describe correctamente HttpResponseMessage?',
    answers: [text('Todo código 400 o 500 lanza excepción automáticamente'), text('IsSuccessStatusCode permite distinguir respuestas exitosas'), text('El contenido solo puede leerse cuando el código es 200'), text('EnsureSuccessStatusCode convierte errores en listas vacías')],
    correctAnswer: 1, explanation: 'Una respuesta no exitosa puede inspeccionarse; EnsureSuccessStatusCode es quien lanza explícitamente.', memoryRule: 'Recibir respuesta no significa que su código sea exitoso.',
  },
  {
    id: 'jwt-03', topic: 'JWT', difficulty: 'Intermedio', fileName: 'Token.cs', title: 'Contenido del JWT',
    prompt: '¿Cuál afirmación sobre el payload es correcta?',
    answers: [text('Está cifrado y solo la API puede leerlo'), text('Puede leerse, pero la firma detecta modificaciones'), text('Contiene obligatoriamente la contraseña del usuario'), text('Se almacena únicamente dentro de la base de datos')],
    correctAnswer: 1, explanation: 'JWT firmado no implica cifrado. Los claims son legibles, pero no deberían poder alterarse sin invalidar la firma.', memoryRule: 'Firmado protege integridad; no oculta el contenido.',
  },
  {
    id: 'jwt-04', topic: 'JWT', difficulty: 'Parcial', fileName: 'Roles.cs', title: 'Origen confiable del rol',
    prompt: '¿De dónde debe obtenerse el rol utilizado por Authorize?',
    answers: [text('Del JSON libremente enviado en cada petición'), text('Del claim generado tras validar al usuario'), text('De un parámetro FromQuery llamado rol'), text('Del texto visible en la interfaz Blazor')],
    correctAnswer: 1, explanation: 'El rol debe surgir de datos confiables del servidor y quedar incluido en el token validado.', memoryRule: 'La API no confía en roles declarados por el cliente.',
  },
]
