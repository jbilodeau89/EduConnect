This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, copy `.env.example` to `.env.local` and provide your credentials:

```bash
cp .env.example .env.local
```

### Required environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (used by the client). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key. |
| `STRIPE_SECRET_KEY` | Stripe secret API key (use the live key in production). |
| `STRIPE_PRICE_ID` | Live subscription price ID (`price_...`) used for checkout. |
| `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` *(optional)* | Hosted checkout link fallback if no price is configured. |

After configuring the environment variables install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
