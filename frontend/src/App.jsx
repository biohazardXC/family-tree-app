import React, { useState, useEffect } from 'react';
import { getPeople, getRelationships } from './api';
import './App.css';

function App() {
  const [people, setPeople] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const peopleData = await getPeople();
        setPeople(peopleData);
        
        const relationshipsData = await getRelationships();
        setRelationships(relationshipsData);
        
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app">
      <h1>Family Tree</h1>
      
      <h2>People ({people.length})</h2>
      <ul className="people-list">
        {people.map(person => (
          <li key={person.id} className="person-item">
            <strong>{person.first_name} {person.last_name}</strong>
            {person.gender && <span className="badge">{person.gender}</span>}
            {person.status === 'pending_review' && <span className="badge pending">Pending Review</span>}
            <div className="person-details">
              {person.birth_date && <span>Born: {new Date(person.birth_date).toLocaleDateString()}</span>}
              {person.maiden_name && <span>Maiden: {person.maiden_name}</span>}
            </div>
          </li>
        ))}
      </ul>

      <h2>Relationships ({relationships.length})</h2>
      <ul className="relationships-list">
        {relationships.map(rel => (
          <li key={rel.id} className="relationship-item">
            <strong>{rel.person_a_first_name} {rel.person_a_last_name}</strong>
            {' '}→ {rel.type.replace('_', ' ')} ({rel.subtype}) →{' '}
            <strong>{rel.person_b_first_name} {rel.person_b_last_name}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;