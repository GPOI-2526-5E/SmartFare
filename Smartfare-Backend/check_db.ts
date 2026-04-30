import prisma from "./src/config/prisma";

async function checkPublic() {
    const publicItins = await prisma.itinerary.findMany({
        where: { isPublished: true },
        include: { location: true }
    });

    console.log("Public Itineraries found:", publicItins.length);
    publicItins.forEach(it => {
        console.log(`- ID: ${it.id}, Name: ${it.name}, Location: ${it.location?.name} (ID: ${it.locationId}), Published: ${it.isPublished}`);
    });

    process.exit(0);
}

checkPublic();
