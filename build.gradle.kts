import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("org.springframework.boot") version "2.7.18"
    id("io.spring.dependency-management") version "1.0.15.RELEASE"
    kotlin("jvm") version "1.6.21"
    kotlin("plugin.spring") version "1.6.21"
    kotlin("plugin.jpa") version "1.6.21"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"
java.sourceCompatibility = JavaVersion.VERSION_1_8

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    runtimeOnly("com.h2database:h2")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs = listOf("-Xjsr305=strict")
        jvmTarget = "1.8"
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// 프론트엔드 빌드 태스크 설정
val frontendDir = "$projectDir/frontend"
val npmCommand = if (System.getProperty("os.name").lowercase().contains("windows")) {
    "C:\\Program Files\\nodejs\\npm.cmd"
} else {
    "npm"
}

tasks.register<Exec>("npmInstall") {
    workingDir = file(frontendDir)
    inputs.dir("$frontendDir/src")
    inputs.file("$frontendDir/package.json")
    inputs.file("$frontendDir/package-lock.json")
    
    commandLine(npmCommand, "install")
}

tasks.register<Exec>("npmBuild") {
    dependsOn("npmInstall")
    workingDir = file(frontendDir)
    inputs.dir("$frontendDir/src")
    inputs.file("$frontendDir/package.json")
    inputs.file("$frontendDir/package-lock.json")
    
    commandLine(npmCommand, "run", "build")
}

tasks.register<Copy>("copyFrontendBuild") {
    dependsOn("npmBuild")
    from("$frontendDir/build")
    into("${project.buildDir}/resources/main/static")
}

tasks.named("processResources") {
    dependsOn("copyFrontendBuild")
}

// clean 태스크 확장
tasks.named("clean") {
    doFirst {
        delete("$frontendDir/build")
    }
} 