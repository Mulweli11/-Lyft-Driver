import { Stripe } from "stripe";

import { requireClerkUser } from "@/lib/server-auth";

const CURRENCY = "zar";
const MAX_AMOUNT_CENTS = 99_999_999;

export async function POST(request: Request) {
  try {
    const clerkId = await requireClerkUser(request);
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey?.startsWith("sk_test_")) {
      return Response.json(
        { error: "Stripe test mode is not configured on the server" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const amountCents = body?.amount_cents;

    if (
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0 ||
      amountCents > MAX_AMOUNT_CENTS
    ) {
      return Response.json(
        { error: "amount_cents must be a positive integer amount in cents" },
        { status: 400 },
      );
    }

    const stripe = new Stripe(secretKey);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata: { clerk_user_id: clerkId },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a payment client secret");
    }

    return Response.json(
      {
        data: {
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount_cents: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Error creating Stripe test payment intent:", error);
    return Response.json({ error: "Unable to create test payment" }, { status: 500 });
  }
}
