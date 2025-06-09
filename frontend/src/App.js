import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import CardList from './components/CardList';
import CardDetail from './components/CardDetail';
import CardForm from './components/CardForm';
import Header from './components/Header';

function App() {
  return (
    <div className="App">
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<CardList />} />
          <Route path="/cards/:id" element={<CardDetail />} />
          <Route path="/create" element={<CardForm />} />
          <Route path="/edit/:id" element={<CardForm />} />
        </Routes>
      </main>
    </div>
  );
}

export default App; 