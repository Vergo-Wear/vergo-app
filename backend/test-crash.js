const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const color = await prisma.color.findFirst();
    const size = await prisma.size.findFirst();
    const body = {
        name: "Debug Product Test",
        basePrice: 100,
        status: "active",
        variants: [{
            sku: "VG-DBG-001",
            colorId: color.colorId,
            sizeId: size.sizeId,
            priceAdjustment: 0,
            quantity: 10,
            reorderLevel: 5
        }]
    };
    console.log("Sending payload:", body);
    const resp = await fetch('http://localhost:3001/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    console.log("Status:", resp.status);
    console.log("Response:", await resp.text());
}
run();
