# Auth manual tests

Start the API with `npm run dev --workspace @subscription/api` after applying the Prisma migration and configuring SMTP.

```bash
curl -i -X POST http://localhost:3001/auth/signup -H "content-type: application/json" -d '{"email":"jane@example.com","name":"Jane Doe","password":"SecurePass!9"}'
curl -i -X POST http://localhost:3001/auth/verify-email -H "content-type: application/json" -d '{"email":"jane@example.com","code":"123456"}'
curl -i -X POST http://localhost:3001/auth/resend-otp -H "content-type: application/json" -d '{"email":"jane@example.com"}'
curl -i -c cookies.txt -X POST http://localhost:3001/auth/login -H "content-type: application/json" -d '{"email":"jane@example.com","password":"SecurePass!9"}'
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3001/auth/refresh
curl -i -X POST http://localhost:3001/auth/forgot-password -H "content-type: application/json" -d '{"email":"jane@example.com"}'
curl -i -X POST http://localhost:3001/auth/reset-password -H "content-type: application/json" -d '{"token":"reset-token","password":"NewSecure!9"}'
curl -i -X POST http://localhost:3001/auth/change-password -H "authorization: Bearer ACCESS_TOKEN" -H "content-type: application/json" -d '{"currentPassword":"NewSecure!9","newPassword":"AnotherSecure!9"}'
curl -i -X POST http://localhost:3001/auth/logout -H "authorization: Bearer ACCESS_TOKEN" -b cookies.txt
curl -i -X POST http://localhost:3001/auth/logout-all -H "authorization: Bearer ACCESS_TOKEN" -b cookies.txt
```

The refresh cookie is `httpOnly`, scoped to `/auth`, and uses `SameSite=Lax`; deployments using a cross-site frontend need CSRF protection.
