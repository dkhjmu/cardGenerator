plugins {
    id("com.github.node-gradle.node")
}

node {
    version.set("18.17.1")
    npmVersion.set("9.6.7")
    download.set(true)
}

val buildReact by tasks.registering(com.github.gradle.node.npm.task.NpmTask::class) {
    dependsOn(tasks.npmInstall)
    args.set(listOf("run", "build"))
}

val copyFrontend by tasks.registering(Copy::class) {
    dependsOn(buildReact)
    from("build")
    into("${rootDir}/backend/src/main/resources/static")
}

tasks.named("build") {
    dependsOn(copyFrontend)
}
