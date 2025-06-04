package com.example.cardgenerator.test

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.boot.test.web.server.LocalServerPort

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TestControllerTest @Autowired constructor(
    private val restTemplate: TestRestTemplate,
    @LocalServerPort private val port: Int
) : StringSpec({
    "GET /api/test returns greeting" {
        val body = restTemplate.getForObject("http://localhost:$port/api/test", String::class.java)
        body shouldBe "Hello, Test!"
    }
})
