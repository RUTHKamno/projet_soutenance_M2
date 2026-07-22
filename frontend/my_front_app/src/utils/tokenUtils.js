export const getToken = () => {
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token") || "";
  return token.trim();
};

export const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const getUserRoleFromToken = (token = getToken()) => {
  const payload = decodeJwtPayload(token);
  return payload?.role || "";
};

export const getUserRoleFromStorage = () => {
  return getUserRoleFromToken(getToken());
};

export const clearToken = () => {
  sessionStorage.removeItem("token");
  localStorage.removeItem("token");
};

export const hasValidToken = () => {
  return getToken().length > 0;
};
