import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { handleCheckoutSessionCompleted, handleSubscriptionDeleted } from "@/lib/payments";
import { sub } from "date-fns";

// Initialize Stripe lazily to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

export const POST = async (req: NextRequest) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not configured' },
      { status: 500 }
    );
  }

  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "No Stripe signature found in request" },
      { status: 400 }
    );
  }

  try {
    const stripeInstance = getStripe();
    const event = stripeInstance.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Checkout session completed');

        const sessionId = event.data.object.id;
        const session = await stripeInstance.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items']
        });

        await handleCheckoutSessionCompleted({ session, stripe: stripeInstance });


        break;
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        const subscriptionId = event.data.object.id;

        await handleSubscriptionDeleted({ subscriptionId, stripe: stripeInstance });
        console.log(subscription);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ status: "success" });
  } catch (err) {
    console.error('Webhook error:', err);
    if (err instanceof Error) {
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Unknown webhook error occurred" },
      { status: 400 }
    );
  }
};
