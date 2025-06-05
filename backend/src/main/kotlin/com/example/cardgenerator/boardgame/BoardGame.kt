package com.example.cardgenerator.boardgame

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
class BoardGame(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var title: String = "",
    var overview: String = "",
    var tags: String? = null,
    @Column(columnDefinition = "TEXT")
    var data: String? = null,
    var createdAt: LocalDateTime = LocalDateTime.now(),
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
