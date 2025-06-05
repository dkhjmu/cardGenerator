package com.example.cardgenerator.boardgame

import com.example.cardgenerator.card.Card
import com.example.cardgenerator.card.CardRepository
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class BoardGameAndCardRepositoryTest @Autowired constructor(
    private val boardGameRepository: BoardGameRepository,
    private val cardRepository: CardRepository
) : StringSpec({
    "save board game with tags" {
        val bg = BoardGame(title = "BG", overview = "o", tags = "t1,t2")
        val saved = boardGameRepository.save(bg)
        saved.tags shouldBe "t1,t2"
    }

    "save card with type and tags" {
        val bg = boardGameRepository.save(BoardGame(title = "BG2", overview = "o"))
        val card = Card(boardGame = bg, name = "c1", type = "spell", tags = "a,b")
        val saved = cardRepository.save(card)
        saved.type shouldBe "spell"
        saved.tags shouldBe "a,b"
    }
})
