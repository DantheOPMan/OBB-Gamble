// src/MarketsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const MarketsPage = () => {
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    // Fetch markets from backend and set the state
    const fetchMarkets = async () => {
      // const response = await fetch('/api/markets');
      // const data = await response.json();
      const data = []; // Replace this with actual fetched data
      setMarkets(data);
    };

    fetchMarkets();
  }, []);

  return (
    <div>
      <h2>Available Markets</h2>
      <ul>
        {markets.map((market) => (
          <li key={market.id}>
            <Link to={`/markets/${market.id}`}>{market.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MarketsPage;
