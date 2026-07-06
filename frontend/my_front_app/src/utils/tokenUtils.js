export const getToken = () => {
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token") || "";
  return token.trim();
};

export const clearToken = () => {
  sessionStorage.removeItem("token");
  localStorage.removeItem("token");
};

export const hasValidToken = () => {
  return getToken().length > 0;
};
