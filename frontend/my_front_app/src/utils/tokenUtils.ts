export const getToken = () => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token") || "";
  return token.trim();
};

export const hasValidToken = () => {
  return getToken().length > 0;
};
