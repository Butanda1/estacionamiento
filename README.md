# Sistema Automatizado de Control de Estacionamiento (IoT + Web)

Sistema integral de gestión y automatización de acceso vehicular que conecta hardware embebido (**Arduino + ESP8266**) con una aplicación web full-stack (**Node.js + Express + MongoDB**). Permite el control de plumas de entrada/salida, generación y validación de tickets en tiempo real, cobro en línea y un panel administrativo con métricas del negocio.

---

## Características Principales

### Hardware y Control de Acceso (IoT)
* **Módulo de Entrada:** Detección de vehículos mediante sensores ultrasónicos, emisión automática de tickets únicos y apertura de pluma con servomotor.
* **Módulo de Salida:** Lectura/ingreso de código de ticket mediante teclado matricial (Keypad 4x4), retroalimentación visual en pantalla LCD I2C y alertas sonoras (buzzer).
* **Validación en Tiempo Real:** Comunicación serial entre Arduino UNO y módulo Wi-Fi **ESP8266 (NodeMCU)** para consultar el estado del ticket directamente contra la API antes de levantar la barrera de salida.
* **Reglas de Negocio Automatizadas:** Tolerancia de salida gratuita (ej. estancias menores a 5 minutos) y bloqueo por tickets expirados o no pagados.

### Portal Web para Clientes (Sin Registro)
* **Pago de Tickets:** Consulta de tarifa dinámica según el tiempo de estancia y procesamiento de pago directo mediante el folio del ticket.
* **Gestión de Tickets Extraviados:** Flujo automatizado para generar y pagar un ticket de reposición con tarifa especial en caso de pérdida del boleto físico.
* **Búsqueda y Estatus:** Verificación rápida del estado del boleto (activo, pagado, finalizado o perdido).

### Panel de Administración
* **Dashboard Analítico:** Visualización de ingresos, flujo vehicular y estadísticas de uso mediante gráficas interactivas.
* **Control de Registros:** Historial completo de entradas, salidas, pagos realizados y tickets de reposición/abandono.
* **Gestión de Tarifas y Descuentos:** Administración centralizada de las reglas de cobro del estacionamiento.

---

## Stack Tecnológico

* **Hardware / Embebido:** Arduino UNO, Módulo Wi-Fi ESP8266, Sensores Ultrasónicos (HC-SR04), Servomotores, Pantalla LCD 16x2 (I2C), Teclado Matricial 4x4, Buzzer Activo.
* **Backend:** Node.js, Express.js (API REST).
* **Base de Datos:** MongoDB / MongoDB Atlas (colecciones relacionales para `tickets`, `pagos` y `descuentos`).
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla / Gráficas).

---

## Arquitectura del Sistema

```text
[Vehículo en Entrada/Salida]
        │
        ▼
[Sensores / Keypad / Servo] ◄──► [Arduino UNO] ◄──(Serial)──► [ESP8266 Wi-Fi]
                                                                     │
                                                              (HTTP / REST API)
                                                                     │
                                                                     ▼
[Portal Cliente / Admin Web] ◄─────────────────────────────► [Backend Node.js]
                                                                     │
                                                                     ▼
                                                             [MongoDB Atlas]
