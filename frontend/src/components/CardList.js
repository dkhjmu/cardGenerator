import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CardService from '../services/CardService';

const CardList = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = () => {
    CardService.getAllCards()
      .then(response => {
        setCards(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('카드 목록을 불러오는 중 오류가 발생했습니다:', error);
        setError('카드 목록을 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      });
  };

  const handleDelete = (id) => {
    if (window.confirm('정말로 이 카드를 삭제하시겠습니까?')) {
      CardService.deleteCard(id)
        .then(() => {
          fetchCards();
        })
        .catch(error => {
          console.error('카드 삭제 중 오류가 발생했습니다:', error);
          alert('카드를 삭제하는 중 오류가 발생했습니다.');
        });
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>카드 목록</h2>
        <Link to="/create" className="btn btn-primary">새 카드 생성</Link>
      </div>

      {cards.length === 0 ? (
        <p>카드가 없습니다. 새 카드를 생성해보세요!</p>
      ) : (
        <div className="card-grid">
          {cards.map(card => (
            <div key={card.id} className="card">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              {card.imageUrl && (
                <img src={card.imageUrl} alt={card.title} style={{ maxWidth: '100%', marginTop: '10px' }} />
              )}
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <Link to={`/cards/${card.id}`} className="btn btn-primary">상세보기</Link>
                <Link to={`/edit/${card.id}`} className="btn btn-primary">수정</Link>
                <button onClick={() => handleDelete(card.id)} className="btn btn-danger">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CardList; 