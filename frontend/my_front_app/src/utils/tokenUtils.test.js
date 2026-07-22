import { getUserRoleFromToken, getUserRoleFromStorage } from "./tokenUtils";

describe("token role helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("extrait le rôle admin depuis un token JWT valide", () => {
    const token = `header.${btoa(JSON.stringify({ role: "admin" }))}.signature`;
    expect(getUserRoleFromToken(token)).toBe("admin");
  });

  it("retourne une chaîne vide pour un token invalide", () => {
    expect(getUserRoleFromToken("token-invalide")).toBe("");
  });

  it("lit le rôle depuis le stockage courant", () => {
    const token = `header.${btoa(JSON.stringify({ role: "admin" }))}.signature`;
    sessionStorage.setItem("token", token);

    expect(getUserRoleFromStorage()).toBe("admin");
  });
});
