import axios from 'axios';

const API_URL = '/api/cards';

class CardService {
  getAllCards() {
    return axios.get(API_URL);
  }

  getCardById(id) {
    return axios.get(`${API_URL}/${id}`);
  }

  createCard(card) {
    return axios.post(API_URL, card);
  }

  updateCard(id, card) {
    return axios.put(`${API_URL}/${id}`, card);
  }

  deleteCard(id) {
    return axios.delete(`${API_URL}/${id}`);
  }
}

export default new CardService(); 