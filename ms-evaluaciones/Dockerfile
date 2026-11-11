# Usamos una imagen ligera de OpenJDK 17
FROM openjdk:17-jdk-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos el archivo JAR generado por Maven hacia el contenedor
COPY target/ms-evaluaciones-0.0.1-SNAPSHOT.jar app.jar

# Exponemos el puerto del microservicio
EXPOSE 8083

# Comando para ejecutar la aplicación al iniciar el contenedor
ENTRYPOINT ["java", "-jar", "app.jar"]