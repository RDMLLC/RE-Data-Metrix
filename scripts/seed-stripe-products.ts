import { getUncachableStripeClient } from '../server/services/stripeClient';

async function seedStripeProducts() {
  console.log('Creating Stripe products and prices...');

  try {
    const stripe = await getUncachableStripeClient();
    
    const existingProducts = await stripe.products.list({ limit: 100 });
    const existingMonthly = existingProducts.data.find(p => p.metadata?.plan_type === 'monthly');
    const existingAnnual = existingProducts.data.find(p => p.metadata?.plan_type === 'annual');

    let monthlyProduct;
    let annualProduct;

    if (existingMonthly) {
      console.log('Monthly product already exists:', existingMonthly.id);
      monthlyProduct = existingMonthly;
    } else {
      monthlyProduct = await stripe.products.create({
        name: 'RE Data Metrix Monthly',
        description: 'Monthly subscription to RE Data Metrix - Real Estate Investment Analytics',
        metadata: {
          plan_type: 'monthly',
        },
      });
      console.log('Created monthly product:', monthlyProduct.id);
    }

    if (existingAnnual) {
      console.log('Annual product already exists:', existingAnnual.id);
      annualProduct = existingAnnual;
    } else {
      annualProduct = await stripe.products.create({
        name: 'RE Data Metrix Annual',
        description: 'Annual subscription to RE Data Metrix - Save $30 per year!',
        metadata: {
          plan_type: 'annual',
        },
      });
      console.log('Created annual product:', annualProduct.id);
    }

    const existingPrices = await stripe.prices.list({ limit: 100 });
    const existingMonthlyPrice = existingPrices.data.find(
      p => p.product === monthlyProduct.id && p.recurring?.interval === 'month' && p.unit_amount === 1500 && p.active
    );
    const existingAnnualPrice = existingPrices.data.find(
      p => p.product === annualProduct.id && p.recurring?.interval === 'year' && p.unit_amount === 15000 && p.active
    );

    if (existingMonthlyPrice) {
      console.log('Monthly price already exists:', existingMonthlyPrice.id);
    } else {
      const monthlyPrice = await stripe.prices.create({
        product: monthlyProduct.id,
        unit_amount: 1500,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          plan_type: 'monthly',
        },
      });
      console.log('Created monthly price:', monthlyPrice.id, '- $15/month');
    }

    if (existingAnnualPrice) {
      console.log('Annual price already exists:', existingAnnualPrice.id);
    } else {
      const annualPrice = await stripe.prices.create({
        product: annualProduct.id,
        unit_amount: 15000,
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
        metadata: {
          plan_type: 'annual',
        },
      });
      console.log('Created annual price:', annualPrice.id, '- $150/year');
    }

    console.log('\nStripe products and prices seeded successfully!');
    console.log('\nTo view in Stripe Dashboard: https://dashboard.stripe.com/products');
    
  } catch (error) {
    console.error('Error seeding Stripe products:', error);
    process.exit(1);
  }
}

seedStripeProducts();
