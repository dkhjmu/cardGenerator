package com.example.cardgenerator.test

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class TestController {
    @GetMapping("/api/test")
    fun test(): String = "Hello, Test!"
}
