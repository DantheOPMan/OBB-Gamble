// src/AdminPage.js
import React, { useState } from 'react';

const AdminPage = () => {
  const [marketName, setMarketName] = useState('');
  const [marketDescription, setMarketDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Implement market creation logic here
    setMarketName('');
    setMarketDescription('');
  };

  return (
    <div>
      <h2>Create New Market</h2>
      <form onSubmit={handleSubmit}>
        <label>Market Name:</label>
        <input type="text" value={marketName} onChange={(e) => setMarketName(e.target.value)} required />
        <label>Market Description:</label>
        <textarea value={marketDescription} onChange={(e) => setMarketDescription(e.target.value)} required />
        <button type="submit">Create Market</button>
      </form>
    </div>
  );
};

export default AdminPage;
