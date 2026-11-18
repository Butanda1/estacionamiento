#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h> // <-- IMPORTANTE AQUÍ esto es para que maneje https 
#include <SoftwareSerial.h>
#include <ArduinoJson.h> 

const char* ssid = "Nombrede la red";
const char* password = "Contraseña";
//En este proyecto se uso Render
const char* serverName = "Link del Servidor"; 

SoftwareSerial arduinoSerial(5, 4); // RX (D1), TX (D2)

void setup() {
  Serial.begin(115200); 
  arduinoSerial.begin(9600); 

  WiFi.disconnect(true); 
  WiFi.mode(WIFI_STA);   // Le dice al chip: "Eres un cliente, no un módem"
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
    String mensaje = arduinoSerial.readStringUntil('\n');
    mensaje.trim();
    
    
    Serial.println("Escuché algo en el cable: [" + mensaje + "]"); 
    
    if (mensaje == "PEDIR_TICKET") {
      Serial.println("Orden correcta. Consultando API en Render...");
      pedirTicketAlBackend();
    }
  }
}

void pedirTicketAlBackend() {
  if (WiFi.status() == WL_CONNECTED) {
    
    // Configuramos el cliente para HTTPS (Conexión Segura)
    WiFiClientSecure client;
    client.setInsecure(); // <-- TRUCO VITAL: Ignora el certificado SSL para que no rebote la conexión
    
    HTTPClient http;

    http.begin(client, serverName);
    http.addHeader("Content-Type", "application/json");

    // Hacemos el POST (mandamos un JSON vacío porque Render genera el código)
    int httpResponseCode = http.POST("{}");

    if (httpResponseCode == 201) {
      String payload = http.getString();
      
      // Convertimos el JSON que responde Render a variables de C++
      JsonDocument doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (!error) {
        String nuevoTicket = doc["_id"].as<String>();
        
        Serial.println("¡Ticket creado en MongoDB!: " + nuevoTicket);
        
        // Le regresamos el puro número del ticket al Arduino UNO
        arduinoSerial.println(nuevoTicket);
      }
    } else {
      Serial.print("Error en Render. Código HTTP: ");
      Serial.println(httpResponseCode);
      arduinoSerial.println("ERROR"); // Le avisamos al Arduino que falló
    }
    http.end();
  } else {
    Serial.println("Sin conexión WiFi");
  }
}