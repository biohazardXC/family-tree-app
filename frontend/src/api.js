const API_URL = 'https://family-tree-app-backend.vercel.app';

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

export const getGaps = async () => {
  const response = await fetch(`${API_URL}/gaps`);
  if (!response.ok) {
    throw new Error('Failed to fetch gaps');
  }
  return response.json();
};

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

export const getPersonFieldStatuses = async (personId) => {
  const response = await fetch(`${API_URL}/person-field-status/${personId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch field statuses');
  }
  return response.json();
};

// ============ SUBMISSION API FUNCTIONS ============

// Get all pending submissions
export const getPendingSubmissions = async () => {
  const response = await fetch(`${API_URL}/submissions/pending`);
  if (!response.ok) {
    throw new Error('Failed to fetch pending submissions');
  }
  return response.json();
};

// Get a single submission by ID
export const getSubmission = async (id) => {
  const response = await fetch(`${API_URL}/submissions/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch submission');
  }
  return response.json();
};

// Review a submission item (accept/reject)
export const reviewSubmissionItem = async (itemId, resolution) => {
  const response = await fetch(`${API_URL}/submission-items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resolution }),
  });
  if (!response.ok) {
    throw new Error('Failed to review submission item');
  }
  return response.json();
};

// Update submission status
export const updateSubmissionStatus = async (submissionId, status) => {
  const response = await fetch(`${API_URL}/submissions/${submissionId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('Failed to update submission status');
  }
  return response.json();
};