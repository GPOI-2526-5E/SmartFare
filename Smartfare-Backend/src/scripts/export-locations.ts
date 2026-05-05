import prisma from '../config/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Fetching locations from database...');
  
  const locations = await prisma.location.findMany({
    select: {
      id: true,
      name: true,
      province: true,
      latitude: true,
      longitude: true
    }
  });

  const csvHeader = 'id,name,province,latitude,longitude\n';
  const csvRows = locations.map(loc => {
    // Escape names if they contain commas
    const escapedName = loc.name.includes(',') ? `"${loc.name}"` : loc.name;
    return `${loc.id},${escapedName},${loc.province || ''},${loc.latitude},${loc.longitude}`;
  }).join('\n');

  const outputPath = path.join(__dirname, '../../../utils/locations_rows.csv');
  
  fs.writeFileSync(outputPath, csvHeader + csvRows, 'utf-8');
  
  console.log(`Successfully exported ${locations.length} locations to:`);
  console.log(outputPath);
}

main()
  .catch((e) => {
    console.error('Error exporting locations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
