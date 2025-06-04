import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [cards, setCards] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    axios.get('/api/cards').then(res => setCards(res.data));
  }, []);

  const addCard = () => {
    axios.post('/api/cards', { name, description }).then(res => {
      setCards([...cards, res.data]);
      setName('');
      setDescription('');
    });
  };

  return (
    <div>
      <h1>Card Generator</h1>
      <input placeholder="name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="description" value={description} onChange={e => setDescription(e.target.value)} />
      <button onClick={addCard}>Add</button>
      <ul>
        {cards.map(card => (
          <li key={card.id}>{card.name}: {card.description}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;

