const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {

  // 1. Category
  const category = await prisma.category.upsert({
    where:  { slug: 'marketing-materials' },
    update: {},
    create: {
      name: 'Marketing Materials',
      slug: 'marketing-materials',
    },
  })
  console.log('Category:', category.name)

  // 2. Sub-category
  const subCategory = await prisma.subCategory.upsert({
    where:  { slug: 'flyers-and-leaflets' },
    update: {},
    create: {
      name:       'Flyers & Leaflets',
      slug:       'flyers-and-leaflets',
      categoryId: category.id,
    },
  })
  console.log('Sub-category:', subCategory.name)

  // 3. Print category
  const printCategory = await prisma.printCategory.upsert({
    where:  { slug: 'offset-printing' },
    update: {},
    create: {
      name: 'Offset Printing',
      slug: 'offset-printing',
    },
  })
  console.log('Print category:', printCategory.name)

  // 4. Product
  const product = await prisma.product.upsert({
    where:  { sku: 'FLY-A5-FC-001' },
    update: {},
    create: {
      name:             'A5 Flyer Printing - Full Colour, Gloss or Matte Finish',
      slug:             'a5-flyer-printing',
      sku:              'FLY-A5-FC-001',
      shortDescription: 'Professional A5 flyers in Nairobi. Full colour, matte or gloss finish, fast turnaround from just 100 copies.',
      fullDescription:  'Our A5 full-colour flyer printing is ideal for promotions, events, menus, and marketing campaigns in Nairobi. Printed on premium 150gsm gloss or matte coated paper, every flyer delivers sharp, vibrant colours that make your brand stand out. Choose from single-sided or double-sided printing, with quantities starting from just 100 copies. Standard turnaround is 3-5 business days with express options available. Perfect for restaurants, retail stores, event organisers, schools, and NGOs. Order today and receive delivery anywhere across Nairobi and Kenya.',
      maintenanceCare:  'Store flat in a cool dry location away from direct sunlight. Avoid folding unless creased. Handle with clean dry hands. Keep away from moisture.',
      technicalSpecs:   '150gsm coated silk. Offset lithography. CMYK full colour. Gloss or matte lamination. 3mm bleed all sides. 300 DPI minimum. PDF, AI, EPS accepted.',
      metaTitle:        'A5 Flyer Printing Nairobi | Fast and Affordable',
      metaDescription:  'Order full-colour A5 flyers in Nairobi. Matte or gloss finish, fast turnaround, delivered to your door. Get an instant quote today.',
      altText:          'Full colour A5 flyers printed on gloss paper fanned out on a wooden desk',
      basePrice:        1800,
      minQuantity:      100,
      taxClass:         'STANDARD_VAT',
      widthMm:          148,
      heightMm:         210,
      weightKg:         0.8,
      substrate:        '150gsm coated silk paper',
      stockQty:         2500,
      lowStockAlert:    500,
      leadTimeDays:     3,
      status:           'DRAFT',
      categoryId:       category.id,
      subCategoryId:    subCategory.id,
      printCategoryId:  printCategory.id,
    },
  })
  console.log('Product created:', product.name)
  console.log('SKU:', product.sku)
  console.log('Status:', product.status)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })