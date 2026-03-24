# Stage 1: Build stage
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace/backend

# Copy gradle wrapper and build files
COPY backend/gradle/ gradle/
COPY backend/gradlew .
COPY backend/settings.gradle .
COPY backend/build.gradle .
COPY schemas/ ../schemas/

# Give execution permission to gradlew
RUN chmod +x gradlew

# Pre-fetch dependencies (optional, but helps with caching)
RUN ./gradlew dependencies --no-daemon || true

# Copy source code
COPY backend/src/ src/

# Build the application
RUN ./gradlew build -x test --no-daemon

# Stage 2: Runtime stage
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /workspace/backend/build/libs/*.jar app.jar

# Expose the application port
EXPOSE 8080

# Environment variables for Temporal and DB (can be overridden)
ENV TEMPORAL_SERVICE_ADDRESS=temporal:7233

# Run the application
# 1. UseContainerSupport: Java sees the Oracle VM RAM limits correctly
# 2. PreferIPv4Stack: Helps with stable connections to Temporal/External Sites
# 3. G1GC: Best garbage collector for ARM multi-core instances and for short lived objects
# 4. MaxRAMPercentage: Limits the max heap size to 25% of container memory for each container
ENTRYPOINT ["java", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=25.0", \
            "-Djava.net.preferIPv4Stack=true", \
            "-XX:+UseG1GC", \
            "-jar", "app.jar"]
