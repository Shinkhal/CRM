export const getUserIdFromToken = (token) => {
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.id || null;
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
};
