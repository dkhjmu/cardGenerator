import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CardService from '../services/CardService';

const CardForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: ''
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      CardService.getCardById(id)
        .then(response => {
          setFormData(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('카드 정보를 불러오는 중 오류가 발생했습니다:', error);
          setError('카드 정보를 불러오는 중 오류가 발생했습니다.');
          setLoading(false);
        });
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      alert('제목과 설명은 필수 입력 사항입니다.');
      return;
    }
    
    const saveCard = isEditMode
      ? CardService.updateCard(id, formData)
      : CardService.createCard(formData);
      
    saveCard
      .then(() => {
        navigate('/');
      })
      .catch(error => {
        console.error('카드 저장 중 오류가 발생했습니다:', error);
        alert('카드를 저장하는 중 오류가 발생했습니다.');
      });
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" className="btn btn-primary">← 뒤로 가기</Link>
      </div>
      
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2>{isEditMode ? '카드 수정' : '새 카드 생성'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">제목</label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-control"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">설명</label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="imageUrl">이미지 URL (선택사항)</label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              className="form-control"
              value={formData.imageUrl || ''}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary">
              {isEditMode ? '수정하기' : '생성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardForm; 