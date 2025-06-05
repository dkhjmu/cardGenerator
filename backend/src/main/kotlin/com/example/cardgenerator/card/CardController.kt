package com.example.cardgenerator.card

import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/cards")
class CardController(private val repository: CardRepository) {

    @GetMapping
    fun all(@RequestParam(required = false) boardGameId: Long?): List<Card> =
        boardGameId?.let { repository.findByBoardGameId(it) } ?: repository.findAll()

    @PostMapping
    fun add(@RequestBody card: Card): Card = repository.save(card)
}
