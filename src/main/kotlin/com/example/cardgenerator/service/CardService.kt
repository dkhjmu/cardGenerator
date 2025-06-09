package com.example.cardgenerator.service

import com.example.cardgenerator.model.Card
import com.example.cardgenerator.repository.CardRepository
import org.springframework.stereotype.Service

@Service
class CardService(private val cardRepository: CardRepository) {

    fun getAllCards(): List<Card> = cardRepository.findAll()
    
    fun getCardById(id: Long): Card = cardRepository.findById(id)
        .orElseThrow { NoSuchElementException("Card not found with id: $id") }
    
    fun createCard(card: Card): Card = cardRepository.save(card)
    
    fun updateCard(id: Long, card: Card): Card {
        return if (cardRepository.existsById(id)) {
            cardRepository.save(card.copy(id = id))
        } else {
            throw NoSuchElementException("Card not found with id: $id")
        }
    }
    
    fun deleteCard(id: Long) {
        if (cardRepository.existsById(id)) {
            cardRepository.deleteById(id)
        } else {
            throw NoSuchElementException("Card not found with id: $id")
        }
    }
} 