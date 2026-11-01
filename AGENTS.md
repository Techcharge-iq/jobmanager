# Architecture rules

- Signup creates a profile only; the profile role-sync trigger owns writes to `user_roles`, preventing duplicate role assignments during account creation.