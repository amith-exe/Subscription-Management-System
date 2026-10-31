import { PrismaClient, Role, BillingPeriod, SubscriptionStatus, InvoiceStatus, TaxType, DiscountType, DiscountScope, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

// Pre-computed Argon2id hash for "Password123!"
const DEFAULT_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$2q1B5Y3l+fN3N3J6/4qXnA$6b6P9B5JkL7l+yR6c6J3d5T1y9m0K1L2a3B4c5D6e7F';

async function main() {
  console.log('Seeding Subscription Management System database...');

  // 1. Sequences for atomic document numbering
  await prisma.sequence.upsert({
    where: { name: 'SUBSCRIPTION' },
    update: {},
    create: { name: 'SUBSCRIPTION', prefix: 'SUB-', padding: 6, currentValue: 5 },
  });

  await prisma.sequence.upsert({
    where: { name: 'INVOICE' },
    update: {},
    create: { name: 'INVOICE', prefix: 'INV-', padding: 6, currentValue: 4 },
  });

  // 2. Users (Admin, Staff/Internal, Customers)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@brightloop.io' },
    update: {},
    create: {
      email: 'admin@brightloop.io',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: Role.ADMIN,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@brightloop.io' },
    update: {},
    create: {
      email: 'staff@brightloop.io',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: Role.INTERNAL,
    },
  });

  const cust1User = await prisma.user.upsert({
    where: { email: 'billing@acme.com' },
    update: {},
    create: {
      email: 'billing@acme.com',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: Role.CUSTOMER,
    },
  });

  const cust2User = await prisma.user.upsert({
    where: { email: 'finance@globex.com' },
    update: {},
    create: {
      email: 'finance@globex.com',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: Role.CUSTOMER,
    },
  });

  const cust3User = await prisma.user.upsert({
    where: { email: 'ops@initech.com' },
    update: {},
    create: {
      email: 'ops@initech.com',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: Role.CUSTOMER,
    },
  });

  // 3. Customers (Staff do not have Customer records)
  const acme = await prisma.customer.upsert({
    where: { userId: cust1User.id },
    update: {},
    create: {
      userId: cust1User.id,
      name: 'Acme Corporation',
      company: 'Acme International Inc.',
      address: '100 Industrial Parkway, Austin, TX',
      taxId: 'US-TAX-882190',
    },
  });

  const globex = await prisma.customer.upsert({
    where: { userId: cust2User.id },
    update: {},
    create: {
      userId: cust2User.id,
      name: 'Globex Retail Corp',
      company: 'Globex Retail Holdings LLC',
      address: '450 Commercial Ave, Chicago, IL',
      taxId: 'US-TAX-441209',
    },
  });

  const initech = await prisma.customer.upsert({
    where: { userId: cust3User.id },
    update: {},
    create: {
      userId: cust3User.id,
      name: 'Initech Solutions',
      company: 'Initech Software Systems',
      address: '77 Silicon Way, San Jose, CA',
      taxId: 'US-TAX-998811',
    },
  });

  // 4. Products and Variants (with additive pricing)
  const erpProduct = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Brightloop ERP Platform',
      type: 'Software Subscription',
      salesPrice: 500.00,
      costPrice: 120.00,
      notes: 'Core modular ERP engine',
    },
  });

  const odooVariant = await prisma.productVariant.upsert({
    where: {
      productId_attribute_value: {
        productId: erpProduct.id,
        attribute: 'Brand',
        value: 'Odoo',
      },
    },
    update: {},
    create: {
      productId: erpProduct.id,
      attribute: 'Brand',
      value: 'Odoo',
      extraPrice: 560.00, // Product 500 + Variant 560 = 1060.00
    },
  });

  const vanillaVariant = await prisma.productVariant.upsert({
    where: {
      productId_attribute_value: {
        productId: erpProduct.id,
        attribute: 'Brand',
        value: 'Standard',
      },
    },
    update: {},
    create: {
      productId: erpProduct.id,
      attribute: 'Brand',
      value: 'Standard',
      extraPrice: 0.00,
    },
  });

  const storageProduct = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Cloud Storage 1TB Add-on',
      type: 'Add-on',
      salesPrice: 50.00,
      costPrice: 8.00,
    },
  });

  // 5. Plans
  const monthlyPlan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      name: 'Professional Monthly',
      price: 0.00,
      billingPeriod: BillingPeriod.MONTHLY,
      minQuantity: 1,
      startDate: new Date('2025-01-01'),
      autoClose: true,
      allowEarlyClose: true,
      allowPause: true,
      allowRenew: true,
    },
  });

  const yearlyPlan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      name: 'Enterprise Annual',
      price: 0.00,
      billingPeriod: BillingPeriod.YEARLY,
      minQuantity: 1,
      startDate: new Date('2025-01-01'),
      autoClose: false,
      allowEarlyClose: false,
      allowPause: false,
      allowRenew: true,
    },
  });

  // 6. Quotation Template
  const quotationTemplate = await prisma.quotationTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000201' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000201',
      name: 'Standard Odoo Integration Quotation',
      planId: monthlyPlan.id,
      validityDays: 30,
      lines: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            quantity: 1,
          },
          {
            productId: storageProduct.id,
            quantity: 2,
          },
        ],
      },
    },
  });

  // 7. Taxes
  const vatTax = await prisma.tax.upsert({
    where: { id: '00000000-0000-0000-0000-000000000301' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000301',
      name: 'VAT 18%',
      rate: 18.0000,
      type: TaxType.PERCENTAGE,
    },
  });

  // 8. Discounts
  const promo10 = await prisma.discount.upsert({
    where: { code: 'PROMO10' },
    update: {},
    create: {
      code: 'PROMO10',
      name: 'Early Adopter 10% Discount',
      type: DiscountType.PERCENT,
      value: 10.00,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 100,
      usedCount: 1,
      isActive: true,
      appliesTo: DiscountScope.SUBSCRIPTION,
    },
  });

  // 9. Subscriptions & Invoices covering all required cases:

  // --- CASE 1: PAID INVOICE with Product Variant Pricing (Odoo +560) ---
  const sub1 = await prisma.subscription.upsert({
    where: { number: 'SUB-000001' },
    update: {},
    create: {
      number: 'SUB-000001',
      customerId: acme.id,
      planId: monthlyPlan.id,
      startDate: new Date('2026-09-01'),
      expiryDate: new Date('2027-09-01'),
      paymentTerms: 'Net 30',
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: new Date('2026-11-01'),
      lines: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            quantity: 1,
            unitPrice: 1060.00, // 500 base + 560 variant
            taxId: vatTax.id,
            taxRate: 18.0000,
            taxAmount: 190.80,
            subtotal: 1060.00,
            totalAmount: 1250.80,
          },
        ],
      },
    },
  });

  const inv1 = await prisma.invoice.upsert({
    where: { number: 'INV-000001' },
    update: {},
    create: {
      number: 'INV-000001',
      subscriptionId: sub1.id,
      customerId: acme.id,
      status: InvoiceStatus.PAID,
      issueDate: new Date('2026-09-01'),
      dueDate: new Date('2026-10-01'),
      periodStart: new Date('2026-09-01'),
      periodEnd: new Date('2026-09-30'),
      subtotal: 1060.00,
      discountTotal: 0.00,
      taxTotal: 190.80,
      total: 1250.80,
      lines: {
        create: [
          {
            productId: erpProduct.id,
            description: 'Brightloop ERP Platform (Brand: Odoo)',
            quantity: 1,
            unitPrice: 1060.00,
            subtotal: 1060.00,
            taxRate: 18.0000,
            taxAmount: 190.80,
            discountAmount: 0.00,
            totalAmount: 1250.80,
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.CARD,
            amount: 1250.80,
            paidAt: new Date('2026-09-05'),
            note: 'Stripe auto-charge txn_9918231',
            reference: 'STRIPE-TXN-9918231',
          },
        ],
      },
    },
  });

  // --- CASE 2: OVERDUE INVOICE (status CONFIRMED, dueDate in past, unpaid) ---
  const sub2 = await prisma.subscription.upsert({
    where: { number: 'SUB-000002' },
    update: {},
    create: {
      number: 'SUB-000002',
      customerId: globex.id,
      planId: monthlyPlan.id,
      startDate: new Date('2026-09-01'),
      expiryDate: new Date('2027-09-01'),
      paymentTerms: 'Net 15',
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: new Date('2026-11-01'),
      lines: {
        create: [
          {
            productId: erpProduct.id,
            variantId: vanillaVariant.id,
            quantity: 2,
            unitPrice: 500.00,
            taxId: vatTax.id,
            taxRate: 18.0000,
            taxAmount: 180.00,
            subtotal: 1000.00,
            totalAmount: 1180.00,
          },
        ],
      },
    },
  });

  await prisma.invoice.upsert({
    where: { number: 'INV-000002' },
    update: {},
    create: {
      number: 'INV-000002',
      subscriptionId: sub2.id,
      customerId: globex.id,
      status: InvoiceStatus.CONFIRMED, // Status is CONFIRMED; Overdue is derived because dueDate < NOW and payments == 0
      issueDate: new Date('2026-09-15'),
      dueDate: new Date('2026-09-30'), // Past due date
      periodStart: new Date('2026-09-15'),
      periodEnd: new Date('2026-10-14'),
      subtotal: 1000.00,
      discountTotal: 0.00,
      taxTotal: 180.00,
      total: 1180.00,
      lines: {
        create: [
          {
            productId: erpProduct.id,
            description: 'Brightloop ERP Platform (Standard) x 2',
            quantity: 2,
            unitPrice: 500.00,
            subtotal: 1000.00,
            taxRate: 18.0000,
            taxAmount: 180.00,
            discountAmount: 0.00,
            totalAmount: 1180.00,
          },
        ],
      },
    },
  });

  // --- CASE 3: PARTIALLY PAID INVOICE ---
  const sub3 = await prisma.subscription.upsert({
    where: { number: 'SUB-000003' },
    update: {},
    create: {
      number: 'SUB-000003',
      customerId: initech.id,
      planId: yearlyPlan.id,
      startDate: new Date('2026-10-01'),
      expiryDate: new Date('2027-10-01'),
      paymentTerms: 'Net 30',
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: new Date('2027-10-01'),
      lines: {
        create: [
          {
            productId: erpProduct.id,
            variantId: vanillaVariant.id,
            quantity: 4,
            unitPrice: 500.00,
            taxId: vatTax.id,
            taxRate: 18.0000,
            taxAmount: 360.00,
            subtotal: 2000.00,
            totalAmount: 2360.00,
          },
        ],
      },
    },
  });

  await prisma.invoice.upsert({
    where: { number: 'INV-000003' },
    update: {},
    create: {
      number: 'INV-000003',
      subscriptionId: sub3.id,
      customerId: initech.id,
      status: InvoiceStatus.CONFIRMED,
      issueDate: new Date('2026-10-01'),
      dueDate: new Date('2026-10-31'),
      periodStart: new Date('2026-10-01'),
      periodEnd: new Date('2027-09-30'),
      subtotal: 2000.00,
      discountTotal: 0.00,
      taxTotal: 360.00,
      total: 2360.00,
      lines: {
        create: [
          {
            productId: erpProduct.id,
            description: 'Annual License ERP Enterprise (4 Seats)',
            quantity: 4,
            unitPrice: 500.00,
            subtotal: 2000.00,
            taxRate: 18.0000,
            taxAmount: 360.00,
            discountAmount: 0.00,
            totalAmount: 2360.00,
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.BANK_TRANSFER,
            amount: 1000.00, // Partial payment (Total: 2360.00, Paid: 1000.00, Remaining: 1360.00)
            paidAt: new Date('2026-10-15'),
            note: 'Initial 50% deposit via Wire #WT-88127',
            reference: 'WIRE-88127',
          },
        ],
      },
    },
  });

  // --- CASE 4: DISCOUNTED INVOICE WITH DISCOUNT USAGE TRACKING ---
  const sub4 = await prisma.subscription.upsert({
    where: { number: 'SUB-000004' },
    update: {},
    create: {
      number: 'SUB-000004',
      customerId: acme.id,
      planId: monthlyPlan.id,
      startDate: new Date('2026-10-01'),
      expiryDate: new Date('2027-10-01'),
      paymentTerms: 'Due on Receipt',
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: new Date('2026-11-01'),
      lines: {
        create: [
          {
            productId: storageProduct.id,
            quantity: 10,
            unitPrice: 50.00,
            taxId: vatTax.id,
            taxRate: 18.0000,
            taxAmount: 81.00,
            subtotal: 500.00,
            totalAmount: 531.00,
          },
        ],
      },
      discountLinks: {
        create: [
          {
            discountId: promo10.id,
          },
        ],
      },
    },
  });

  const inv4 = await prisma.invoice.upsert({
    where: { number: 'INV-000004' },
    update: {},
    create: {
      number: 'INV-000004',
      subscriptionId: sub4.id,
      customerId: acme.id,
      status: InvoiceStatus.CONFIRMED,
      issueDate: new Date('2026-10-01'),
      dueDate: new Date('2026-10-05'),
      periodStart: new Date('2026-10-01'),
      periodEnd: new Date('2026-10-31'),
      subtotal: 500.00,
      discountTotal: 50.00, // 10% applied
      taxTotal: 81.00, // Tax on net subtotal (450 * 0.18)
      total: 531.00,
      lines: {
        create: [
          {
            productId: storageProduct.id,
            description: 'Cloud Storage 1TB Add-on x 10',
            quantity: 10,
            unitPrice: 50.00,
            subtotal: 500.00,
            taxRate: 18.0000,
            taxAmount: 81.00,
            discountAmount: 50.00,
            totalAmount: 531.00,
          },
        ],
      },
      discountUsages: {
        create: [
          {
            discountId: promo10.id,
            amountApplied: 50.00,
            appliedAt: new Date('2026-10-01'),
          },
        ],
      },
    },
  });

  // --- CASE 5: QUOTATION STATUS SUBSCRIPTION (Draft/Quotation phase) ---
  await prisma.subscription.upsert({
    where: { number: 'SUB-000005' },
    update: {},
    create: {
      number: 'SUB-000005',
      customerId: globex.id,
      planId: yearlyPlan.id,
      startDate: new Date('2026-11-01'),
      expiryDate: new Date('2027-11-01'),
      paymentTerms: 'Net 30',
      status: SubscriptionStatus.QUOTATION,
      nextBillingDate: null, // No billing date until CONFIRMED / ACTIVE
      lines: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            quantity: 3,
            unitPrice: 1060.00,
            taxId: vatTax.id,
            taxRate: 18.0000,
            taxAmount: 572.40,
            subtotal: 3180.00,
            totalAmount: 3752.40,
          },
        ],
      },
    },
  });

  // 10. Monthly Snapshot for sub-second analytical reporting
  await prisma.monthlySnapshot.upsert({
    where: { month: new Date('2026-10-01') },
    update: {},
    create: {
      month: new Date('2026-10-01'),
      activeSubscriptions: 4,
      newSubscriptions: 2,
      churnedSubscriptions: 0,
      mrr: 2160.00,
      arr: 25920.00,
      mrrNew: 1060.00,
      mrrExpansion: 500.00,
      mrrContraction: 0.00,
      mrrChurned: 0.00,
      mrrNetMovement: 1560.00,
      revenueCollected: 1250.80,
      outstandingAmount: 4071.00,
      overdueAmount: 1180.00,
      overdueInvoiceCount: 1,
      agingCurrent: 2891.00,
      aging30To60: 1180.00,
      aging60To90: 0.00,
      aging90Plus: 0.00,
      cohortData: {
        "2026-09": { retentionRate: 100, cohortSize: 2 },
        "2026-10": { retentionRate: 100, cohortSize: 2 }
      },
    },
  });

  console.log('Seed completed successfully with all test cases (paid, overdue, partly paid, discounted, quotation, and variant pricing).');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
