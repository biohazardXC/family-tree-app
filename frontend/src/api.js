const API_URL = 'https://family-tree-app-eta-blond.vercel.app';

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