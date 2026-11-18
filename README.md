# Sistema Automatizado de Control de Estacionamiento (IoT + Web)

Sistema integral de gestión y automatización de acceso vehicular que conecta hardware embebido (**Arduino UNO + ESP8266 NodeMCU**) con una aplicación web full-stack en tiempo real (**MERN Stack + Socket.IO**). Permite el control de plumas de entrada/salida, generación y validación de tickets en vivo, cobro en línea y un panel administrativo con métricas dinámicas.

---

## Características Principales

### Hardware y Control de Acceso (IoT)
* **Módulo de Entrada:** Detección de vehículos mediante sensores ultrasónicos (`HC-SR04`), emisión automática de tickets únicos y apertura de pluma con servomotor.
* **Módulo de Salida:** Lectura de código de ticket mediante teclado matricial (`Keypad 4x4`), retroalimentación visual en pantalla `LCD 16x2 I2C` y alertas sonoras con buzzer activo.
* **Validación en Tiempo Real:** Comunicación serial (`SoftwareSerial`) entre Arduino UNO y **ESP8266 NodeMCU** para consultar el estatus del ticket vía HTTP/HTTPS (`ArduinoJson`) antes de levantar la barrera.
* **Reglas de Negocio Automatizadas:** Tolerancia de salida gratuita (estancias menores a 5 minutos) y bloqueo automático por tickets expirados o no pagados.

### Portal Web para Clientes (Sin Registro)
* **Pago de Tickets en Vivo:** Consulta de tarifa dinámica según el tiempo de estancia y procesamiento de pago directo mediante el folio del ticket.
* **Gestión de Tickets Extraviados:** Flujo automatizado para generar y pagar un ticket de reposición con tarifa especial en caso de pérdida del boleto físico.
* **Búsqueda y Estatus:** Verificación instantánea del estado del boleto (activo, pagado, finalizado o extraviado).

### Panel de Administración
* **Dashboard Analítico:** Visualización de ingresos, flujo vehicular y estadísticas de uso en tiempo real mediante gráficas interactivas (**Recharts**).
* **Actualizaciones en Vivo:** Sincronización instantánea de entradas, salidas y pagos mediante **Socket.IO**.
* **Control de Registros y Seguridad:** Historial completo de movimientos y autenticación protegida con **JWT** y **bcryptjs**.

---

## Stack Tecnológico

| Capa / Módulo | Lenguaje(s) | Tecnologías y Librerías Clave |
| :--- | :--- | :--- |
| **Frontend (Cliente y Admin)** | JavaScript (React JSX), HTML5, CSS3 | React 18, Vite, React Router DOM, Tailwind CSS, Recharts, Socket.IO Client |
| **Backend (API REST & Real-Time)** | JavaScript | Node.js, Express.js, Socket.IO, Mongoose, JWT (`jsonwebtoken`), `bcryptjs` |
| **Base de Datos** | BSON / JSON (NoSQL) | MongoDB / MongoDB Atlas (modelado de `tickets`, `pagos` y `descuentos`) |
| **Hardware / IoT** | C / C++ (Arduino / Wiring) | Arduino UNO, ESP8266 NodeMCU (`ESP8266WiFi`, `ArduinoJson`, `SoftwareSerial`, `LiquidCrystal_I2C`, `Servo`) |

---

## Arquitectura del Sistema

```text
[Vehículo en Entrada/Salida]
        │
        ▼
[Sensores / Keypad / Servo] ◄──► [Arduino UNO] ◄──(Serial)──► [ESP8266 NodeMCU]
                                                                     │
                                                              (HTTP / REST API)
                                                                     │
                                                                     ▼
[Portal Cliente / Admin React] ◄──(REST + Socket.IO)──────► [Backend Node.js/Express]
                                                                     │
                                                                     ▼
                                                             [MongoDB Atlas]
