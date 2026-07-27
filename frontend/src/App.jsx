import React, { useState, useEffect } from 'react';
import { getPeople, getRelationships, getGaps, updateFieldStatus, getPendingSubmissions, reviewSubmissionItem } from './api';
import './App.css';

function App() {
  const [people, setPeople] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('people');
  const [markingUnknown, setMarkingUnknown] = useState({});
  const [reviewing, setReviewing] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [peopleData, relationshipsData, gapsData, submissionsData] = await Promise.all([
          getPeople(),
          getRelationships(),
          getGaps(),
          getPendingSubmissions()
        ]);
        setPeople(peopleData);
        setRelationships(relationshipsData);
        setGaps(gapsData);
        setSubmissions(submissionsData);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleMarkUnknown = async (personId, fieldName) => {
    try {
      setMarkingUnknown(prev => ({ ...prev, [`${personId}-${fieldName}`]: true }));
      await updateFieldStatus(personId, fieldName, 'unknown_confirmed');
      const updatedGaps = await getGaps();
      setGaps(updatedGaps);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setMarkingUnknown(prev => ({ ...prev, [`${personId}-${fieldName}`]: false }));
    }
  };

  const handleReviewItem = async (itemId, resolution) => {
    try {
      setReviewing(prev => ({ ...prev, [itemId]: true }));
      await reviewSubmissionItem(itemId, resolution);
      const updatedSubmissions = await getPendingSubmissions();
      setSubmissions(updatedSubmissions);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setReviewing(prev => ({ ...prev, [itemId]: false }));
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app">
      <h1>Family Tree</h1>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'people' ? 'active' : ''}`}
          onClick={() => setActiveTab('people')}
        >
          People ({people.length})
        </button>
        <button 
          className={`tab ${activeTab === 'gaps' ? 'active' : ''}`}
          onClick={() => setActiveTab('gaps')}
        >
          Gaps ({gaps.length})
        </button>
        <button 
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          Review Queue ({submissions.length})
        </button>
      </div>

      {activeTab === 'people' && (
        <>
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
        </>
      )}

      {activeTab === 'gaps' && (
        <>
          <h2>Missing Information ({gaps.length} gaps)</h2>
          {gaps.length === 0 ? (
            <p className="no-gaps">🎉 No missing information found! All fields are complete.</p>
          ) : (
            <ul className="gaps-list">
              {gaps.map((gap, index) => {
                const key = `${gap.person_id}-${gap.field_name}`;
                const isProcessing = markingUnknown[key];
                return (
                  <li key={index} className="gap-item">
                    <div className="gap-info">
                      <span className="gap-person">{gap.full_name}</span>
                      <span className="gap-field">Missing: {gap.field_name.replace('_', ' ')}</span>
                    </div>
                    <button
                      className="btn btn-unknown"
                      onClick={() => handleMarkUnknown(gap.person_id, gap.field_name)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Saving...' : 'Mark as Unknown'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {activeTab === 'review' && (
        <>
          <h2>Review Queue ({submissions.length} pending)</h2>
          {submissions.length === 0 ? (
            <p className="no-submissions">✅ No pending submissions to review.</p>
          ) : (
            <div className="submissions-list">
              {submissions.map(submission => (
                <div key={submission.id} className="submission-card">
                  <div className="submission-header">
                    <h3>Submission #{submission.id}</h3>
                    <span className="submission-meta">
                      From: {submission.submitted_by_name} ({submission.submitted_by_email})
                    </span>
                    <span className="submission-meta">
                      Submitted: {new Date(submission.submitted_at).toLocaleString()}
                    </span>
                    <span className="submission-meta">
                      Items: {submission.item_count}
                    </span>
                  </div>
                  <div className="submission-items">
                    {submission.items && submission.items.map(item => (
                      <div key={item.id} className="submission-item">
                        <div className="item-info">
                          <span className="item-type">{item.target_type.replace('_', ' ')}</span>
                          {item.target_person_id && (
                            <span className="item-target">Person ID: {item.target_person_id}</span>
                          )}
                          {item.conflict_flag && (
                            <span className="item-conflict">⚠️ Conflict Detected</span>
                          )}
                        </div>
                        <div className="item-data">
                          <pre>{JSON.stringify(item.proposed_data, null, 2)}</pre>
                        </div>
                        <div className="item-actions">
                          <button
                            className="btn btn-accept"
                            onClick={() => handleReviewItem(item.id, 'accepted')}
                            disabled={reviewing[item.id]}
                          >
                            {reviewing[item.id] ? 'Processing...' : '✅ Accept'}
                          </button>
                          <button
                            className="btn btn-reject"
                            onClick={() => handleReviewItem(item.id, 'rejected')}
                            disabled={reviewing[item.id]}
                          >
                            {reviewing[item.id] ? 'Processing...' : '❌ Reject'}
                          </button>
                          <button
                            className="btn btn-merge"
                            onClick={() => handleReviewItem(item.id, 'merged_with_edits')}
                            disabled={reviewing[item.id]}
                          >
                            {reviewing[item.id] ? 'Processing...' : '✏️ Merge with Edits'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
