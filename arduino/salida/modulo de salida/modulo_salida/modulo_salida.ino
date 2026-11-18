#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h> 
#include <SoftwareSerial.h>
#include <ArduinoJson.h> 

const char* ssid = "Nombrede la red";
const char* password = "Contraseña";
const char* serverName = "Link del Servidor"; 

SoftwareSerial arduinoSerial(5, 4); // RX (D1), TX (D2)

void setup() {
  Serial.begin(115200); 
  arduinoSerial.begin(9600); 

  WiFi.disconnect(true); 
  WiFi.mode(WIFI_STA);   
  delay(1000);           

  WiFi.begin(ssid, password);
  Serial.println("\nConectando al WiFi...");
  
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n¡Conectado!");
}

void loop() {
  if (arduinoSerial.available() > 0) {
    String codigoLeido = arduinoSerial.readStringUntil('\n');
    codigoLeido.trim();
    
    if (codigoLeido.length() > 0) {
      Serial.println("Arduino solicita validar ticket: [" + codigoLeido + "]");
      validarSalidaBackend(codigoLeido);
    }
  }
}

void validarSalidaBackend(String ticket) {
  if (WiFi.status() == WL_CONNECTED) {
    
    WiFiClientSecure client;
    client.setInsecure(); 
    
    HTTPClient http;

    http.begin(client, serverName);
    http.addHeader("Content-Type", "application/json");

    // Armamos el JSON según la lógica de tu tickets.js
    String jsonPayload = "{\"id_ticket\":\"" + ticket + "\"}";
    
    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      String payload = http.getString();
      Serial.println("Respuesta de Render: " + payload);
      
      JsonDocument doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (!error) {
        // Extraemos las respuestas de tu backend
        bool abrir = doc["abrir_barrera"].as<bool>();
        String mensaje = doc["mensaje"].as<String>();

        if (abrir) {
          // Si tu API dice que está exento o pagado
          arduinoSerial.println("ABRIR");
          Serial.println("Orden enviada al Arduino: ABRIR");
        } else {
          // Si debe pagar o ya se usó, le mandamos ERROR + el motivo
          // Recortamos el mensaje a 16 caracteres para que quepa en la pantallita LCD
          String motivoCorto = mensaje.substring(0, 16); 
          arduinoSerial.println("ERROR:" + motivoCorto);
          Serial.println("Orden enviada al Arduino: DENEGADO");
        }
      }
    } else {
      Serial.print("Error en Render. Código HTTP: ");
      Serial.println(httpResponseCode);
      arduinoSerial.println("ERROR:Fallo Server"); 
    }
    http.end();
  } else {
    Serial.println("Sin conexión WiFi");
    arduinoSerial.println("ERROR:Sin WiFi");
  }
}