package com.example.cardgenerator.boardgame

import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/boardgames")
class BoardGameController(private val repository: BoardGameRepository) {

    @GetMapping
    fun all(): List<BoardGame> = repository.findAll()

    @PostMapping
    fun add(@RequestBody boardGame: BoardGame): BoardGame = repository.save(boardGame)
}
