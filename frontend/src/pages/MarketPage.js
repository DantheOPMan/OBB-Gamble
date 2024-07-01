// src/MarketPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const MarketPage = () => {
  const { id } = useParams();
  const [market, setMarket] = useState(null);

  useEffect(() => {
    // Fetch specific market details from backend
    const fetchMarket = async () => {
      // const response = await fetch(`/api/markets/${id}`);
      // const data = await response.json();
      const data = {}; // Replace this with actual fetched data
      setMarket(data);
    };

    fetchMarket();
  }, [id]);

  if (!market) return <div>Loading...</div>;

  return (
    <div>
      <h2>{market.name}</h2>
      <p>{market.description}</p>
      {/* Implement gambling options here */}
    </div>
  );
};

export default MarketPage;
