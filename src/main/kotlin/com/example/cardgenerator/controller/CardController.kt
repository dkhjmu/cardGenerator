package com.example.cardgenerator.controller

import com.example.cardgenerator.model.Card
import com.example.cardgenerator.service.CardService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/cards")
@CrossOrigin(origins = ["http://localhost:3000"])
class CardController(private val cardService: CardService) {

    @GetMapping
    fun getAllCards(): ResponseEntity<List<Card>> =
        ResponseEntity.ok(cardService.getAllCards())

    @GetMapping("/{id}")
    fun getCardById(@PathVariable id: Long): ResponseEntity<Card> =
        ResponseEntity.ok(cardService.getCardById(id))

    @PostMapping
    fun createCard(@RequestBody card: Card): ResponseEntity<Card> =
        ResponseEntity.status(HttpStatus.CREATED).body(cardService.createCard(card))

    @PutMapping("/{id}")
    fun updateCard(@PathVariable id: Long, @RequestBody card: Card): ResponseEntity<Card> =
        ResponseEntity.ok(cardService.updateCard(id, card))

    @DeleteMapping("/{id}")
    fun deleteCard(@PathVariable id: Long): ResponseEntity<Unit> {
        cardService.deleteCard(id)
        return ResponseEntity.noContent().build()
    }
} 