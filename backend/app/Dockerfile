FROM maven:3.9-eclipse-temurin-21-alpine AS build

WORKDIR /workspace
COPY . .
RUN chmod +x mvnw && ./mvnw -DskipTests package

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
COPY --from=build /workspace/target/yonder-api-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java -XX:MaxRAMPercentage=65 -XX:+UseSerialGC -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
