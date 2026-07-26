const API_URL = 'http://localhost:5000';

export const getPeople = async () => {
  const response = await fetch(`${API_URL}/people`);
  if (!response.ok) {
    throw new Error('Failed to fetch people');
  }
  return response.json();
};

export const getRelationships = async () => {
  const response = await fetch(`${API_URL}/relationships`);
  if (!response.ok) {
    throw new Error('Failed to fetch relationships');
  }
  return response.json();
};