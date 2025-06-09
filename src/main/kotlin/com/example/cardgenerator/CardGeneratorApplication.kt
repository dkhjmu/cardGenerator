package com.example.cardgenerator

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class CardGeneratorApplication

fun main(args: Array<String>) {
    runApplication<CardGeneratorApplication>(*args)
} 