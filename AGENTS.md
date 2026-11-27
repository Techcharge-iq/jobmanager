# Architecture rules

- Signup creates a profile only; the profile role-sync trigger owns writes to `user_roles`, preventing duplicate role assignments during account creation.
- Admin-created users are pre-confirmed (no confirmation email), so email/SMTP problems never block or roll back account creation.
- The dashboard uses a viewport-height shell with tabbed, internally scrolling workspaces; other pages retain normal page scrolling to keep long forms accessible.
