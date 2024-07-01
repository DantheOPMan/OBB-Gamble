import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMarkets } from '../firebase'; // Import the function to fetch markets

const MarketsPage = () => {
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await getMarkets();
        setMarkets(response);
      } catch (error) {
        console.error('Failed to fetch markets', error);
      }
    };

    fetchMarkets();
  }, []);

  return (
    <div>
      <h2>Available Markets</h2>
      <ul>
        {markets.map((market) => (
          <li key={market._id}>
            <Link to={`/markets/${market._id}`}>{market.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MarketsPage;
