package com.example.cardgenerator.card

import org.springframework.data.jpa.repository.JpaRepository

interface CardRepository : JpaRepository<Card, Long> {
    fun findByBoardGameId(boardGameId: Long): List<Card>
}
