#include <LiquidCrystal_I2C.h>
#include <Servo.h>
#include <Wire.h>
#include <SoftwareSerial.h>

SoftwareSerial espSerial(A1, A0); // RX, TX para hablar con NodeMCU

LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo barrera;

const int trigPin = 10;
const int echoPin = 11;

long duracion;
int distancia;

String ticketGenerado = "";
bool esperandoVehiculo = true;
bool barreraAbierta = false;
bool vehiculoDetectado = false;      
unsigned long tiempoSalida = 0;      
bool esperandoCierre = false;        

void setup() {
  lcd.init();
  lcd.backlight();
  barrera.attach(12);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  barrera.write(0);
  
  espSerial.begin(9600); // Iniciamos plática con el WiFi

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Centro Comercial");
}

int medirDistancia() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long dur = pulseIn(echoPin, HIGH);
  return dur * 0.034 / 2;
}

void abrirBarrera() {
  barrera.write(90);
  barreraAbierta = true;
  vehiculoDetectado = true;   
  esperandoCierre = false;
}

void cerrarBarrera() {
  barrera.write(0);
  barreraAbierta = false;
  vehiculoDetectado = false;
  esperandoCierre = false;
  ticketGenerado = "";
  esperandoVehiculo = true;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Centro Comercial");
}

void loop() {
  distancia = medirDistancia();

  // FASE 1: Esperando vehículo nuevo
  if (esperandoVehiculo) {
    if (distancia > 0 && distancia < 10) {
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Conectando...");
      lcd.setCursor(0, 1);
      lcd.print("Generando ticket");

      // 1. Le ordenamos al NodeMCU que pida el ticket a NodeJS
      espSerial.println("PEDIR_TICKET");

      // 2. Esperamos la respuesta (Maximo 8 segundos)
      ticketGenerado = "";
      long tiempoInicio = millis();
      
      while (millis() - tiempoInicio < 8000) {
        if (espSerial.available() > 0) {
          ticketGenerado = espSerial.readStringUntil('\n');
          ticketGenerado.trim();
          break; // Salimos del bucle en cuanto llega el ticket
        }
      }

      // 3. Verificamos si llegó un ticket correcto de 4 dígitos
      if (ticketGenerado != "" && ticketGenerado != "ERROR") {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("  Bienvenido!   ");
        lcd.setCursor(0, 1);
        lcd.print("Ticket: " + ticketGenerado);

        abrirBarrera();
        esperandoVehiculo = false;
        delay(1500); 
      } else {
        // Si no hay internet o el server NodeJS está apagado
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Error de Red");
        delay(3000);
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Centro Comercial");
      }
    }
  }

  // FASE 2: Cierre automático (tu lógica intacta)
  if (barreraAbierta) {
    distancia = medirDistancia();
    if (vehiculoDetectado && !esperandoCierre) {
      if (distancia >= 10 || distancia == 0) {
        esperandoCierre = true;
        tiempoSalida = millis();
      }
    }
    if (esperandoCierre) {
      if (millis() - tiempoSalida >= 3000) {
        cerrarBarrera();
      }
    }
  }
  delay(100);
}