import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import CardService from '../services/CardService';

const CardDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    CardService.getCardById(id)
      .then(response => {
        setCard(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('카드 정보를 불러오는 중 오류가 발생했습니다:', error);
        setError('카드 정보를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      });
  }, [id]);

  const handleDelete = () => {
    if (window.confirm('정말로 이 카드를 삭제하시겠습니까?')) {
      CardService.deleteCard(id)
        .then(() => {
          navigate('/');
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

  if (!card) {
    return <div>카드를 찾을 수 없습니다.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" className="btn btn-primary">← 뒤로 가기</Link>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2>{card.title}</h2>
        <p>{card.description}</p>
        
        {card.imageUrl && (
          <div style={{ margin: '20px 0' }}>
            <img 
              src={card.imageUrl} 
              alt={card.title} 
              style={{ maxWidth: '100%' }} 
            />
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <Link to={`/edit/${card.id}`} className="btn btn-primary">수정</Link>
          <button onClick={handleDelete} className="btn btn-danger">삭제</button>
        </div>
      </div>
    </div>
  );
};

export default CardDetail; 