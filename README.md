# cardGenerator

Simple Kotlin Spring Boot application with a React frontend for generating board game cards. The backend uses an H2 in-memory database and the frontend is built with React. Both parts are built via Gradle.

## Building

Run the following command to build the backend and frontend:

```bash
./gradlew build
```

The React build output will be copied into the backend `static` resources so you can run the Spring Boot application directly.

## Running

After building, start the application with:

```bash
./gradlew :backend:bootRun
```

Then open `http://localhost:8080` to see the frontend and interact with the API.
