import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  BannerPlacement,
  DiscountType,
  PrismaClient,
  StoreType,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

type PanelSeed = {
  role: Exclude<UserRole, "CUSTOMER">;
  name: string;
  email?: string;
  passwordHash?: string;
};

const panelSeeds: PanelSeed[] = [
  {
    role: UserRole.SUPER_ADMIN,
    name: "QuickCart Super Admin",
    email: process.env.SUPER_ADMIN_EMAIL,
    passwordHash: process.env.SUPER_ADMIN_PASSWORD_HASH
  },
  {
    role: UserRole.RESTAURANT,
    name: "Demo Restaurant Manager",
    email: process.env.RESTAURANT_EMAIL,
    passwordHash: process.env.RESTAURANT_PASSWORD_HASH
  },
  {
    role: UserRole.GROCERY,
    name: "Demo Grocery Manager",
    email: process.env.GROCERY_EMAIL,
    passwordHash: process.env.GROCERY_PASSWORD_HASH
  },
  {
    role: UserRole.DELIVERY,
    name: "Demo Delivery Rider",
    email: process.env.DELIVERY_EMAIL,
    passwordHash: process.env.DELIVERY_PASSWORD_HASH
  }
];

function validHash(value?: string) {
  return Boolean(value && /^\$2[aby]\$\d{2}\$/.test(value));
}

async function seedPanelUsers() {
  const users = new Map<UserRole, { id: string }>();

  for (const account of panelSeeds) {
    const email = account.email?.trim().toLowerCase();
    if (!email || !validHash(account.passwordHash)) {
      console.log(`Skipping ${account.role}: email or bcrypt hash is not configured.`);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: account.name,
        passwordHash: account.passwordHash!,
        role: account.role,
        isActive: true
      },
      create: {
        name: account.name,
        email,
        passwordHash: account.passwordHash!,
        role: account.role,
        isActive: true
      },
      select: { id: true }
    });
    users.set(account.role, user);
  }

  return users;
}

async function inactiveOwner(id: string, name: string, role: UserRole) {
  const randomHash = await bcrypt.hash(randomUUID(), 10);
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, name, passwordHash: randomHash, role, isActive: false },
    select: { id: true }
  });
}

async function main() {
  const panelUsers = await seedPanelUsers();
  const restaurantOwner =
    panelUsers.get(UserRole.RESTAURANT) ??
    (await inactiveOwner("seed-restaurant-owner", "Seed Restaurant Owner", UserRole.RESTAURANT));
  const groceryOwner =
    panelUsers.get(UserRole.GROCERY) ??
    (await inactiveOwner("seed-grocery-owner", "Seed Grocery Owner", UserRole.GROCERY));

  await prisma.serviceablePincode.upsert({
    where: { pincode: "788163" },
    update: {},
    create: {
      pincode: "788163",
      city: "Lala Bazar",
      state: "Assam",
      deliveryFeePaise: 2000,
      minimumOrderPaise: 10000,
      estimatedDeliveryMin: 30
    }
  });

  const restaurant = await prisma.store.upsert({
    where: { slug: "the-local-kitchen" },
    update: { ownerId: restaurantOwner.id },
    create: {
      ownerId: restaurantOwner.id,
      type: StoreType.RESTAURANT,
      name: "The Local Kitchen",
      slug: "the-local-kitchen",
      description: "Comforting local meals prepared fresh after every order.",
      phone: "+91 00000 00001",
      address: "Main Road, Lala Bazar",
      pincode: "788163",
      imageUrl: "/products/chicken-biryani.svg",
      minimumOrderPaise: 12000,
      deliveryFeePaise: 2500,
      averagePrepMins: 28,
      isApproved: true
    }
  });

  const grocery = await prisma.store.upsert({
    where: { slug: "green-basket-market" },
    update: { ownerId: groceryOwner.id },
    create: {
      ownerId: groceryOwner.id,
      type: StoreType.GROCERY,
      name: "Green Basket Market",
      slug: "green-basket-market",
      description: "Daily grocery essentials, carefully packed and fairly priced.",
      phone: "+91 00000 00002",
      address: "Station Road, Lala Bazar",
      pincode: "788163",
      imageUrl: "/products/apples.svg",
      minimumOrderPaise: 10000,
      deliveryFeePaise: 2000,
      averagePrepMins: 15,
      isApproved: true
    }
  });

  for (const store of [restaurant, grocery]) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      await prisma.storeOpeningHour.upsert({
        where: { storeId_dayOfWeek: { storeId: store.id, dayOfWeek } },
        update: {},
        create: { storeId: store.id, dayOfWeek, opensAt: "09:00", closesAt: "22:00" }
      });
    }
  }

  const biryaniCategory = await prisma.category.upsert({
    where: { storeId_slug: { storeId: restaurant.id, slug: "rice-bowls" } },
    update: {},
    create: {
      storeId: restaurant.id,
      type: StoreType.RESTAURANT,
      name: "Rice Bowls",
      slug: "rice-bowls",
      imageUrl: "/categories/biryani.svg"
    }
  });

  const snackCategory = await prisma.category.upsert({
    where: { storeId_slug: { storeId: restaurant.id, slug: "snacks" } },
    update: {},
    create: {
      storeId: restaurant.id,
      type: StoreType.RESTAURANT,
      name: "Snacks",
      slug: "snacks",
      imageUrl: "/categories/momos.svg",
      sortOrder: 1
    }
  });

  const produceCategory = await prisma.category.upsert({
    where: { storeId_slug: { storeId: grocery.id, slug: "fresh-produce" } },
    update: {},
    create: {
      storeId: grocery.id,
      type: StoreType.GROCERY,
      name: "Fresh Produce",
      slug: "fresh-produce",
      imageUrl: "/categories/vegetables.svg"
    }
  });

  const dairyCategory = await prisma.category.upsert({
    where: { storeId_slug: { storeId: grocery.id, slug: "dairy" } },
    update: {},
    create: {
      storeId: grocery.id,
      type: StoreType.GROCERY,
      name: "Dairy",
      slug: "dairy",
      imageUrl: "/categories/dairy.svg",
      sortOrder: 1
    }
  });

  const products = [
    {
      storeId: restaurant.id,
      categoryId: biryaniCategory.id,
      name: "Signature Chicken Biryani",
      slug: "signature-chicken-biryani",
      description: "Fragrant rice, tender chicken and a balanced house spice blend.",
      imageUrl: "/products/chicken-biryani.svg",
      isVeg: false,
      variants: [
        { name: "Half plate", unit: "half plate", sku: "TLK-BIR-HALF", mrpPaise: 14900, salePricePaise: 12900, stock: 50 },
        { name: "Full plate", unit: "full plate", sku: "TLK-BIR-FULL", mrpPaise: 22900, salePricePaise: 19900, stock: 50 }
      ]
    },
    {
      storeId: restaurant.id,
      categoryId: snackCategory.id,
      name: "Steamed Vegetable Momos",
      slug: "steamed-vegetable-momos",
      description: "Eight delicate dumplings with a bright house chutney.",
      imageUrl: "/products/momos.svg",
      isVeg: true,
      variants: [
        { name: "8 pieces", unit: "8 pieces", sku: "TLK-MOMO-8", mrpPaise: 9900, salePricePaise: 8500, stock: 40 }
      ]
    },
    {
      storeId: grocery.id,
      categoryId: produceCategory.id,
      name: "Farm Fresh Tomatoes",
      slug: "farm-fresh-tomatoes",
      description: "Firm, ripe tomatoes sourced from regional farms.",
      imageUrl: "/products/tomatoes.svg",
      isVeg: true,
      variants: [
        { name: "500 g", unit: "500 g", sku: "GBM-TOM-500", mrpPaise: 4200, salePricePaise: 3400, stock: 80 },
        { name: "1 kg", unit: "1 kg", sku: "GBM-TOM-1KG", mrpPaise: 8000, salePricePaise: 6400, stock: 45 }
      ]
    },
    {
      storeId: grocery.id,
      categoryId: dairyCategory.id,
      name: "Daily Fresh Milk",
      slug: "daily-fresh-milk",
      description: "Pasteurised full-cream milk for everyday use.",
      imageUrl: "/products/milk.svg",
      isVeg: true,
      variants: [
        { name: "500 ml", unit: "500 ml", sku: "GBM-MILK-500", mrpPaise: 3400, salePricePaise: 3200, stock: 100 },
        { name: "1 litre", unit: "1 litre", sku: "GBM-MILK-1L", mrpPaise: 6600, salePricePaise: 6400, stock: 80 }
      ]
    }
  ];

  for (const item of products) {
    const product = await prisma.product.upsert({
      where: { storeId_slug: { storeId: item.storeId, slug: item.slug } },
      update: {
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg
      },
      create: {
        storeId: item.storeId,
        categoryId: item.categoryId,
        name: item.name,
        slug: item.slug,
        description: item.description,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg
      }
    });

    for (const variant of item.variants) {
      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: { ...variant, productId: product.id },
        create: { ...variant, productId: product.id }
      });
    }

    if (item.slug === "signature-chicken-biryani") {
      await prisma.foodAddon.upsert({
        where: { productId_name: { productId: product.id, name: "Extra raita" } },
        update: { pricePaise: 2000 },
        create: { productId: product.id, name: "Extra raita", pricePaise: 2000 }
      });
    }
  }

  await prisma.coupon.upsert({
    where: { code: "WELCOME20" },
    update: {},
    create: {
      code: "WELCOME20",
      description: "20% off for a customer's first order",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      maxDiscountPaise: 6000,
      minimumOrderPaise: 15000,
      perUserLimit: 1,
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2030-12-31T23:59:59.000Z")
    }
  });

  await prisma.banner.upsert({
    where: { id: "seed-home-banner" },
    update: {},
    create: {
      id: "seed-home-banner",
      title: "Fresh finds for everyday life",
      subtitle: "Food and grocery from trusted local stores",
      imageUrl: "/products/apples.svg",
      linkUrl: "/?mode=grocery",
      placement: BannerPlacement.HOME
    }
  });

  await prisma.siteSetting.upsert({
    where: { key: "commerce" },
    update: {},
    create: {
      key: "commerce",
      value: {
        maintenanceMode: false,
        cancellationCutoffStatus: "CONFIRMED",
        riderEarningPaise: 2000,
        supportEmail: "support@example.com"
      }
    }
  });

  console.log("QuickCart seed completed without overwriting production records.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
