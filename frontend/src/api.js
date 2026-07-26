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

// Get all gaps
export const getGaps = async () => {
  const response = await fetch(`${API_URL}/gaps`);
  if (!response.ok) {
    throw new Error('Failed to fetch gaps');
  }
  return response.json();
};

// Mark a field as unknown_confirmed or pending
export const updateFieldStatus = async (personId, fieldName, status) => {
  const response = await fetch(`${API_URL}/person-field-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      person_id: personId,
      field_name: fieldName,
      status: status,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to update field status');
  }
  return response.json();
};

// Get field statuses for a person
export const getPersonFieldStatuses = async (personId) => {
  const response = await fetch(`${API_URL}/person-field-status/${personId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch field statuses');
  }
  return response.json();
};