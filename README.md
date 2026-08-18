# 🩺 Surgical Research Platform

> Plataforma privada para médicos cirujanos orientada al seguimiento de pacientes, gestión de cirugías e investigación de resultados clínicos.

---

## 🧭 Sobre el proyecto

Este proyecto nace con un objetivo concreto:

**ayudar a médicos cirujanos a registrar, seguir y estudiar sus propias cirugías y la evolución de sus pacientes.**

La aplicación está pensada como un espacio de trabajo personal para cada médico.

El médico es el propietario de su espacio y de la información que gestiona. Dentro de ese espacio puede trabajar con sus pacientes, incorporar residentes a cargo, asignarles pacientes y utilizar la información recopilada para realizar seguimiento e investigación.

La aplicación busca ofrecer una experiencia **simple, limpia y de baja carga cognitiva**.

> Menos elementos en pantalla.  
> Más atención sobre la información importante.

---

## 🎯 Objetivos

El producto tiene cuatro grandes áreas:

- 👨‍⚕️ **Médicos**
- 🧑‍⚕️ **Pacientes**
- 🩺 **Cirugías**
- 🔬 **Investigación**

Los residentes forman parte del flujo de trabajo del médico y participan principalmente en el seguimiento de los pacientes que les sean asignados.

La investigación constituye uno de los objetivos centrales del producto: la información registrada durante el ciclo de atención debe permitir posteriormente analizar las propias cirugías del médico y sus resultados.

---

## 🏥 Dominio inicial

La primera especialización quirúrgica que se implementará será:

**Pterigión**

El producto se desarrollará inicialmente alrededor de este caso concreto.

La información que se registre y los procesos de seguimiento podrán adaptarse al tipo de cirugía, permitiendo que el sistema evolucione posteriormente hacia otros procedimientos sin asumir desde el comienzo que todas las cirugías funcionan de la misma manera.

---

## 🧑‍⚕️ Roles principales

### Médico

Es el usuario principal y propietario de su espacio de trabajo.

Puede:

- Gestionar pacientes.
- Invitar pacientes.
- Registrar y gestionar cirugías.
- Agendar cirugías.
- Incorporar residentes.
- Asignar pacientes a residentes.
- Realizar seguimiento.
- Comunicarse con pacientes.
- Enviar notificaciones y recordatorios.
- Consultar información histórica.
- Analizar información relacionada con sus cirugías.
- Utilizar los datos recopilados para investigación.

### Residente

Trabaja dentro del espacio del médico.

Puede recibir pacientes asignados por el médico y participar en su seguimiento, registrando la información requerida según la cirugía correspondiente.

### Paciente

Participa en el seguimiento de su propio proceso quirúrgico.

Puede recibir invitaciones, comunicaciones, recordatorios y solicitudes de información relacionadas con su seguimiento.

---

# 🧠 Principios de desarrollo

## Domain-Driven Design

El proyecto utilizará **Domain-Driven Design (DDD)** como enfoque para modelar el negocio.

El dominio será definido en TypeScript y deberá mantenerse independiente de frameworks y tecnologías de infraestructura.

El objetivo es que conceptos como:

```text
Paciente
Cirugía
Seguimiento
Residente
Investigación
```

sean modelados primero como conceptos del negocio y posteriormente implementados mediante tecnologías concretas.

El dominio no dependerá directamente de:

- Frameworks frontend.
- Frameworks backend.
- Node.js.
- Prisma.
- PostgreSQL.
- HTTP.

Las tecnologías concretas deberán adaptarse al dominio y no al contrario.

---

## 🧪 Test-Driven Development

El desarrollo utilizará **TDD (Test-Driven Development)**.

Las pruebas no serán únicamente una etapa posterior al desarrollo, sino una herramienta para definir y validar el comportamiento esperado del sistema.

El foco inicial estará especialmente puesto en:

- Reglas de negocio.
- Entidades.
- Value Objects.
- Casos de uso.
- Invariantes del dominio.

Las pruebas estarán ubicadas junto al paquete o aplicación cuya lógica validan, evitando inicialmente un repositorio global de tests desconectado del código.

---

## 🟦 TypeScript como lenguaje común

TypeScript será utilizado en todo el proyecto.

El dominio y los casos de uso serán implementados en TypeScript de forma agnóstica respecto de frameworks e infraestructura.

El objetivo es disponer de un lenguaje común para:

- Dominio.
- Application.
- Backend.
- Frontend.
- Infraestructura.

La utilización de TypeScript no implica compartir indiscriminadamente todo el código entre frontend y backend. El código se compartirá únicamente cuando exista una responsabilidad clara para hacerlo.

---

# 🏗️ Stack tecnológico

| Área            | Tecnología / decisión       |
| --------------- | --------------------------- |
| Lenguaje        | **TypeScript**              |
| Runtime backend | **Node.js**                 |
| Base de datos   | **PostgreSQL**              |
| ORM             | **Prisma**                  |
| Monorepo        | **pnpm Workspaces**         |
| Modelado        | **Domain-Driven Design**    |
| Desarrollo      | **Test-Driven Development** |
| Infraestructura | **Railway**                 |

### Frontend

La tecnología concreta del frontend todavía no está definida.

Se han considerado alternativas como:

- Angular
- React
- Astro

La elección queda deliberadamente pendiente.

### Backend HTTP

Node.js será el runtime del backend.

El framework HTTP todavía está pendiente de definición.

La elección del framework no deberá introducir dependencias en el dominio.

---

# 📦 Monorepo

El proyecto se desarrollará como un **shared monorepo**.

Frontend, backend y paquetes compartidos vivirán dentro de un único repositorio.

Se utilizará **pnpm Workspaces** para administrar las aplicaciones y paquetes del proyecto.

La decisión de utilizar un shared monorepo está alineada con el modelo de monorepo soportado por Railway para proyectos JavaScript que comparten código o configuración desde la raíz. Railway soporta explícitamente pnpm workspaces y puede detectar paquetes desplegables durante la importación del proyecto.

La estructura concreta podrá evolucionar a medida que el dominio sea descubierto.

La decisión importante es mantener frontend, backend y paquetes relacionados dentro de un mismo repositorio.

---

## Principios del scaffolding

El scaffolding inicial no pretende anticipar la totalidad del dominio.

Por esta razón, no se crearán inicialmente paquetes arbitrarios como:

packages/

├── patients/

├── surgeries/

├── residents/

└── research/

El dominio será descubierto progresivamente mediante DDD.

La estructura de `domain` y `application` evolucionará a partir del conocimiento real del negocio.

---

# 🧠 Domain

`packages/domain` contiene el modelo de negocio.

No conoce:

- Node.js.
- HTTP.
- Prisma.
- PostgreSQL.
- Frameworks.
- Railway.

Aquí vivirán progresivamente:

- Entidades.
- Value Objects.
- Agregados.
- Reglas de negocio.
- Invariantes.
- Domain Services cuando sean necesarios.

El dominio será independiente de la infraestructura.

---

# ⚙️ Application

`packages/application` contiene los casos de uso de la aplicación.

Esta capa representa comportamientos que el sistema debe poder ejecutar.

Los casos de uso utilizarán el dominio sin conocer detalles concretos de HTTP, PostgreSQL o Railway.

---

# 🔌 Infrastructure

`packages/infrastructure` contiene las implementaciones técnicas necesarias para conectar el núcleo de la aplicación con sistemas externos.

Inicialmente tendrá especial relación con:

- Persistencia.
- Prisma.
- PostgreSQL.

Prisma no será utilizado directamente desde el dominio.

---

# 🗄️ Persistencia

PostgreSQL es la base de datos oficial del proyecto.

Prisma será el ORM utilizado para la interacción con PostgreSQL.

El esquema y las migraciones de Prisma estarán asociados a la capa de infraestructura.

El modelo de persistencia será derivado del dominio y no utilizado como sustituto del modelo de negocio.

---

# 🚂 Railway

Todo el proyecto será alojado y desplegado utilizando **Railway**.

Railway será la plataforma de infraestructura oficial del proyecto.

La aplicación se desplegará como un conjunto de servicios dentro de un mismo proyecto de Railway.

Conceptualmente:

                         Railway Project

                               │

                ┌──────────────┼──────────────┐

                │              │              │

                ▼              ▼              ▼

          Web Service      API Service    PostgreSQL

                │              │

                │              │

                └──────────────┘

PostgreSQL será provisionado como servicio de Railway y estará disponible para los servicios de aplicación mediante las variables de conexión proporcionadas por Railway, incluyendo `DATABASE_URL`.

Railway proporciona PostgreSQL como servicio administrado dentro del proyecto y permite conectar otros servicios mediante variables de referencia y networking privado.

---

# 🚂 Railway + Monorepo

El proyecto utilizará el modelo de **shared monorepo** de Railway.

El repositorio será tratado desde su raíz para permitir que los servicios puedan acceder a los paquetes compartidos del workspace.

No se considerará `apps/api` ni `apps/web` como repositorios aislados.

Railway permite definir comandos específicos de build y start para cada servicio dentro de un shared monorepo. Además, su importación automática de monorepos JavaScript soporta pnpm y puede configurar comandos específicos de workspace.

Esto permite mantener el repositorio unificado mientras cada aplicación se despliega como un servicio independiente.

---

# 🚀 Servicios de Railway

La infraestructura inicial estará compuesta por:

### Web Service

Servicio encargado de ejecutar la aplicación frontend.

apps/web

### API Service

Servicio encargado de ejecutar el backend.

apps/api

Este servicio utilizará los paquetes compartidos necesarios:

packages/domain

packages/application

packages/infrastructure

### PostgreSQL

Servicio de base de datos proporcionado por Railway.

PostgreSQL

La conexión del API con PostgreSQL utilizará una referencia a:

DATABASE_URL

proporcionada por el servicio PostgreSQL de Railway.

---

# 👀 Railway Watch Paths

Cada servicio tendrá configurados **Watch Paths** para evitar despliegues innecesarios.

Railway recomienda utilizar Watch Paths en monorepos para que un cambio en una parte del repositorio no provoque automáticamente el rebuild de servicios que no dependen de ese cambio.

Los patrones deberán contemplar tanto el código propio de cada aplicación como los paquetes compartidos de los que dependa.

---

# 🛠️ Railway Build & Start

Cada servicio desplegable tendrá sus propios comandos de build y start.

Esto permite que Railway construya y ejecute cada aplicación dentro del contexto del monorepo.

Railway soporta explícitamente comandos de start personalizados para desplegar múltiples proyectos desde un mismo monorepo.

---

# 🗃️ Prisma migrations en Railway

Las migraciones de PostgreSQL serán ejecutadas mediante el mecanismo de **Pre-Deploy Command** de Railway.

El comando de migración será ejecutado antes de iniciar la aplicación.

Esto permite que el esquema de PostgreSQL se encuentre actualizado antes de que la nueva versión del API comience a recibir tráfico.

Railway ejecuta los pre-deploy commands entre el build y el despliegue de la aplicación, dentro de la red privada y con acceso a las variables de entorno del servicio. Si el comando falla, el deployment no continúa.

---

# 🔐 Datos y propiedad

Cada médico tendrá su propio espacio de trabajo.

El médico es el propietario de la información correspondiente a sus pacientes, cirugías, residentes y procesos de investigación.

El modelo inicial no contempla clínicas, hospitales ni organizaciones intermedias.

La relación comercial y conceptual del producto es:

Médico

│

├── Pacientes

├── Residentes

├── Cirugías

└── Investigaciones

La información médica será considerada un aspecto crítico del sistema.

Las decisiones relacionadas con seguridad, privacidad, auditoría, backups, observabilidad y cumplimiento serán tratadas como parte de la evolución del proyecto y no se asumirán automáticamente por utilizar Railway.

---

# 🎨 Frontend

La tecnología concreta del frontend todavía no está definida.

Se han considerado alternativas como:

- Angular
- React
- Astro

La elección queda deliberadamente pendiente.

El requisito fundamental es que la tecnología de frontend no condicione el dominio ni los casos de uso.

La experiencia visual tendrá como principios:

- Minimalismo.
- Claridad.
- Baja carga cognitiva.
- Jerarquía visual.
- Información relevante antes que cantidad de información.
- Interacciones simples y predecibles.

El dashboard será el principal punto de entrada después del login y proporcionará una visión resumida de:

- Pacientes.
- Cirugías.
- Residentes.
- Investigaciones.

---

# 🔌 Backend

Node.js será el runtime del backend.

El framework HTTP todavía está pendiente de definición.

La implementación deberá mantener una separación clara entre:

Domain

↓

Application

↓

Infrastructure

↓

Node.js / HTTP

La elección del framework backend no deberá introducir dependencias en el dominio.

---

# 🧪 Testing

El proyecto utilizará TDD como enfoque de desarrollo.

Los paquetes que contengan lógica tendrán sus pruebas próximas al código que validan:

domain/

├── src/

└── test/

application/

├── src/

└── test/

infrastructure/

├── src/

└── test/

Los tests end-to-end podrán incorporarse posteriormente cuando exista una necesidad concreta de validar flujos completos entre aplicaciones e infraestructura.

---

# 📚 Documentación

Las decisiones relevantes del proyecto serán documentadas en:

docs/

└── decisions/

Esto permitirá conservar el contexto de las decisiones técnicas y de producto a medida que el proyecto evolucione.

Las decisiones importantes no deberán depender exclusivamente del conocimiento de una persona.

---

# 🧱 Estado inicial del proyecto

El proyecto comienza deliberadamente con un alcance reducido.

### Definido

- [x] Producto orientado a médicos cirujanos.
- [x] Médico como propietario del espacio.
- [x] Pacientes.
- [x] Residentes.
- [x] Cirugías.
- [x] Seguimiento postoperatorio.
- [x] Investigación como objetivo central.
- [x] Primer procedimiento: pterigión.
- [x] TypeScript.
- [x] Node.js.
- [x] PostgreSQL.
- [x] Prisma.
- [x] DDD.
- [x] TDD.
- [x] Monorepo.
- [x] pnpm Workspaces.
- [x] Shared monorepo compatible con Railway.
- [x] Railway como plataforma de infraestructura.
- [x] Web como Railway Service.
- [x] API como Railway Service.
- [x] PostgreSQL como Railway Service.
- [x] Watch Paths para los servicios.
- [x] Prisma migrations mediante Pre-Deploy Command.

### Pendiente

- [ ] Framework de frontend.
- [ ] Framework HTTP del backend.
- [ ] Sistema de autenticación.
- [ ] Diseño definitivo de la UI.
- [ ] Modelo de dominio detallado.
- [ ] Casos de uso detallados.
- [ ] Modelo de persistencia detallado.
- [ ] Estrategia de notificaciones.
- [ ] Almacenamiento de archivos.
- [ ] Observabilidad.
- [ ] CI/CD.
- [ ] Estrategia de backups y recuperación.
- [ ] Seguridad y auditoría.
- [ ] Requisitos regulatorios y de cumplimiento.

Los elementos pendientes no representan problemas por resolver inmediatamente.

Se mantendrán abiertos hasta que el desarrollo del producto requiera tomar esas decisiones.

---

# 🚀 Filosofía del proyecto

Este proyecto no pretende comenzar construyendo una plataforma genérica para todo tipo de instituciones médicas.

Comienza con un problema específico:

> **Un médico cirujano quiere gestionar sus pacientes, registrar sus cirugías, realizar un seguimiento sistemático y convertir la información obtenida de su práctica en conocimiento para investigación.**

El primer caso concreto será **pterigión**.

La tecnología debe acompañar ese objetivo.

No al revés. 🧠

---

## 📜 Principios fundamentales

> **Primero entendemos y modelamos el dominio.  
> Después implementamos la tecnología necesaria para resolverlo.**

> **El monorepo simplifica el desarrollo. Railway simplifica el despliegue.**

> **La infraestructura debe servir al producto, no definir el dominio.**

> **Comenzamos simple y agregamos complejidad únicamente cuando el producto la necesite.**

🩺 **Simple para el médico.**  
🧠 **Rigurosamente modelado por dentro.**  
🧪 **Validado mediante tests.**  
📦 **Organizado como monorepo.**  
🚂 **Desplegado mediante Railway.**  
🐘 **Persistido en PostgreSQL.**  
🚀 **Preparado para evolucionar.**
