#include <LiquidCrystal_I2C.h>
#include <Servo.h>
#include <Keypad.h>
#include <Wire.h>
#include <SoftwareSerial.h>

SoftwareSerial espSerial(A1, A0); // RX, TX para hablar con NodeMCU

LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo barrera;

const int trigPin = 10;
const int echoPin = 11;
const int pinBuzzer = 13;
long duracion;
int distancia;

char teclas[4][4] = {
  {'1','2','3','A'},
  {'4','5','6','A'},
  {'7','8','9','C'},
  {'*','0','A','D'}
};

byte pinesFilas[4] = {9, 8, 7, 6};     
byte pinesColumnas[4] = {5, 4, 3, 2};
Keypad teclado = Keypad(makeKeymap(teclas), pinesFilas, pinesColumnas, 4, 4);

String textKey = "";
bool tecladoHabilitado = false;

void setup() {
  lcd.init();
  lcd.backlight();
  barrera.attach(12);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  //buzzer
  pinMode(pinBuzzer, OUTPUT);
  digitalWrite(pinBuzzer, LOW);

  barrera.write(0);
  
  espSerial.begin(9600);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Salida");
}

int medirDistancia() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  duracion = pulseIn(echoPin, HIGH);
  return duracion * 0.034 / 2;
}

void loop() {
  if (tecladoHabilitado == false) {
    distancia = medirDistancia();

    if (distancia > 0 && distancia < 10) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("INSERTE TICKET");
      lcd.setCursor(0, 1);
      lcd.print("Y presione *");
      tecladoHabilitado = true;
      textKey = "";
    }
  } else { 
    char tecla_presionada = teclado.getKey();

    
    if (tecla_presionada) {

      digitalWrite(pinBuzzer, HIGH);
      delay(50);
      digitalWrite(pinBuzzer, LOW);

      if (tecla_presionada == 'C') {
        textKey = ""; 
        actualizarPantalla();
      }
      else if (tecla_presionada == 'D') {
        if (textKey.length() > 0) {
          textKey.remove(textKey.length() - 1);
        }
        actualizarPantalla();
      }
      else if (tecla_presionada == '*') {
        if (textKey.length() > 0) {
          validarEnServidor(); // llamar la funcion del server
        }
      }
      else if (tecla_presionada != 'A') {
        if (textKey.length() < 8) {
          textKey += tecla_presionada; 
        }
        actualizarPantalla();
      }
    }
  }
}

void actualizarPantalla() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ticket:");
  lcd.setCursor(0, 1);
  lcd.print(textKey);
}

void validarEnServidor() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Validando...");

  // Le mandamos el ticket tecleado al NodeMCU
  espSerial.println(textKey);

  String respuesta = "";
  long tiempoInicio = millis();
  bool recibioRespuesta = false;

  // Esperamos la respuesta de Render (máximo 8 segundos)
  while (millis() - tiempoInicio < 8000) {
    if (espSerial.available() > 0) {
      respuesta = espSerial.readStringUntil('\n');
      respuesta.trim();
      recibioRespuesta = true;
      break; 
    }
  }

  if (recibioRespuesta) {
    if (respuesta == "ABRIR") {
      openGate();
    } else {
      // Si falló, Render nos mandó el mensaje de error ("Ticket sin pagar", etc.)
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("DENEGADO");
      lcd.setCursor(0, 1);
      
      // Quitamos el prefijo "ERROR:" para mostrar solo el motivo
      if(respuesta.startsWith("ERROR:")) {
        lcd.print(respuesta.substring(6));
      } else {
        lcd.print(respuesta);
      }

      // --- SONIDO DE ERROR (Un pitido largo) ---
      digitalWrite(pinBuzzer, HIGH);
      delay(1200);
      digitalWrite(pinBuzzer, LOW);
      // -----------------------------------------
      
      delay(1800); // El resto de la espera
      textKey = ""; 
      actualizarPantalla();
    }
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Error de Red");

    for(int i=0; i<3; i++){
      digitalWrite(pinBuzzer, HIGH);
      delay(200);
      digitalWrite(pinBuzzer, LOW);
      delay(200);
    }

    delay(3000);
    textKey = "";
    actualizarPantalla();
  }
}

void openGate() {
  digitalWrite(pinBuzzer, HIGH);
  delay(100);
  digitalWrite(pinBuzzer, LOW);
  delay(100);
  digitalWrite(pinBuzzer, HIGH);
  delay(100);
  digitalWrite(pinBuzzer, LOW);

  barrera.write(90);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Buen viaje!");
  lcd.setCursor(0, 1);
  lcd.print("Vuelva pronto");
  
  delay(1500);

  distancia = medirDistancia();
  while (distancia < 10 && distancia > 0) {
    delay(200);
    distancia = medirDistancia();
  }
  
  delay(3000); 
  barrera.write(0);
  
  tecladoHabilitado = false;
  textKey = "";
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Salida");
}