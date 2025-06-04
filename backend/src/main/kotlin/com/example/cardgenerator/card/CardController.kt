package com.example.cardgenerator.card

import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/cards")
class CardController(private val repository: CardRepository) {

    @GetMapping
    fun all(): List<Card> = repository.findAll()

    @PostMapping
    fun add(@RequestBody card: Card): Card = repository.save(card)
}
