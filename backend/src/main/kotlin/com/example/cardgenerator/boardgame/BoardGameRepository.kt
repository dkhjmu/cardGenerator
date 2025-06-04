package com.example.cardgenerator.boardgame

import org.springframework.data.jpa.repository.JpaRepository

interface BoardGameRepository : JpaRepository<BoardGame, Long>
