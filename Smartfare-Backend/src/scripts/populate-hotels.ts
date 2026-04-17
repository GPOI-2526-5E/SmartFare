import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const locationsPath = path.join(__dirname, '../data/locations_rows.csv');
  const hotelsPath = path.join(__dirname, '../data/hotels_location_id.csv');

  // 1. Populate Locations
  if (fs.existsSync(locationsPath)) {
    console.log('Populating locations...');
    const locContent = fs.readFileSync(locationsPath, 'utf-8');
    const locLines = locContent.split('\n').slice(1);
    for (const line of locLines) {
      const parts = line.split(',');
      if (parts.length < 6) continue;
      const id = parseInt(parts[0]);
      const name = parts[1]?.trim();
      const province = parts[2]?.trim();
      const lat = parseFloat(parts[3]);
      const lon = parseFloat(parts[4]);
      const cap = parseInt(parts[5]);

      if (id && name) {
        try {
          await prisma.location.upsert({
            where: { locationId: id },
            update: {},
            create: {
              locationId: id,
              name,
              province,
              latitude: lat || null,
              longitude: lon || null,
              cap: cap || null,
            }
          });
        } catch (e) {
          // Ignore duplicates or errors for simplicity
        }
      }
    }
    console.log('Locations processed.');
  }

  // 2. Populate Hotels
  if (!fs.existsSync(hotelsPath)) {
    console.error(`Hotels file not found: ${hotelsPath}`);
    return;
  }

  const content = fs.readFileSync(hotelsPath, 'utf-8');
  const lines = content.split('\n');
  const dataLines = lines.slice(1).filter(line => line.trim() !== '');

  console.log(`Starting population of ${dataLines.length} hotels...`);

  let count = 0;
  for (const line of dataLines) {
    const parts = line.split(',');
    if (parts.length < 6) continue;

    const name = parts[0]?.trim();
    const street = parts[1]?.trim();
    const city = parts[2]?.trim();
    const stars = parseInt(parts[3]) || null;
    const priceMedium = parseFloat(parts[4]) || null;
    const locationId = parseInt(parts[5]) || null;
    const longitude = parseFloat(parts[6]) || null;
    const latitude = parseFloat(parts[7]) || null;

    if (!name) continue;

    try {
      await prisma.hotel.create({
        data: {
          name,
          street: street || null,
          city: city || null,
          stars,
          priceMedium,
          locationId,
          longitude,
          latitude,
        }
      });
      count++;
    } catch (error) {
      // console.error(`Error creating hotel ${name}:`, error.message);
    }
  }

  console.log(`Population finished! ${count} hotels created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
