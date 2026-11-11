import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "../App.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import ArtistCard from "../components/ArtistCard.jsx";

const authMocks = vi.hoisted(() => ({
  loginAccount: vi.fn(),
  registerAccount: vi.fn(),
}));

vi.mock("../services/authService.js", () => ({
  ...authMocks,
  getAuthErrorMessage: (error) => error.message,
  getDashboardPath: (role) => `/${role}/dashboard`,
}));

function renderApp() {
  window.localStorage.clear();
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/admin/login"]}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("Frontend auth and route guards", () => {
  it("renders admin login form", () => {
    renderApp();
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("redirects unauthenticated users away from admin pages", () => {
    renderApp();
    expect(screen.getByText(/Admin access required|sign in with your provisioned administrator account/i)).toBeInTheDocument();
  });

  it("allows admin login form submission flow", async () => {
    const user = userEvent.setup();
    authMocks.loginAccount.mockReturnValue(new Promise(() => {}));
    renderApp();

    await user.type(screen.getByLabelText(/email address/i), "admin@example.com");
    await user.type(screen.getByLabelText(/password/i), "adminsecret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    const signingInButton = screen.getByRole("button", { name: /signing in\.\.\./i });
    expect(signingInButton).toBeDisabled();
    expect(authMocks.loginAccount).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "adminsecret123",
    });
  });

  it("renders artist portfolio previews supplied by the listing response", () => {
    render(
      <MemoryRouter>
        <ArtistCard
          artist={{
            _id: "profile-id",
            user: { _id: "artist-id", name: "Test Artist" },
            recentPortfolio: [{
              _id: "portfolio-id",
              title: "Featured environment",
              imageUrl: "https://images.example.com/featured.jpg",
            }],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("img", { name: "Game artist artwork by Test Artist" }))
      .toHaveAttribute("src", "https://images.example.com/featured.jpg");
    expect(screen.getByAltText("Featured environment")).toBeInTheDocument();
  });
});
