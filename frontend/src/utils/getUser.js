export const getUserIdFromToken = (accessToken) => {
  if (!accessToken) return null;

  try {
    const payloadBase64 = accessToken.split('.')[1];
    const decodedPayload = JSON.parse(atob(payloadBase64));

    // Standard claims used in your JWT
    return decodedPayload.id || decodedPayload.sub || null;
  } catch (err) {
    console.error('Failed to decode access token:', err);
    return null;
  }
};
