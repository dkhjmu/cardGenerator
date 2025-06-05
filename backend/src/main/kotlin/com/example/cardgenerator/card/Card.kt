package com.example.cardgenerator.card

import com.example.cardgenerator.boardgame.BoardGame
import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
class Card(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_game_id")
    var boardGame: BoardGame? = null,

    var name: String = "",

    var type: String = "",

    var image: String? = null,

    var description: String = "",

    var tags: String? = null,

    @Column(columnDefinition = "TEXT")
    var data: String? = null,

    var createdAt: LocalDateTime = LocalDateTime.now(),
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
