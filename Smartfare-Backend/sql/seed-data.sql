BEGIN;

-- 1. Lookup Tables (Valori base necessari per le chiavi esterne)
INSERT INTO "ItineraryVisibility" ("code", "name", "description") 
VALUES 
    ('PRIVATE', 'Privato', 'Visibile solo al proprietario'),
    ('PUBLIC', 'Pubblico', 'Visibile a tutti'),
    ('UNLISTED', 'Non in elenco', 'Visibile solo a chi ha il link')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "ItineraryItemType" ("code", "label", "description")
VALUES 
    ('ACTIVITY', 'Attività', 'Un''attività o attrazione turistica'),
    ('ACCOMMODATION', 'Alloggio', 'Un posto dove pernottare'),
    ('TRANSPORT', 'Trasporto', 'Uno spostamento o viaggio')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "TransportType" ("code", "label", "description")
VALUES 
    ('TRAIN', 'Treno', 'Trasporto su rotaia'),
    ('FLIGHT', 'Volo', 'Trasporto aereo'),
    ('METRO', 'Metro', 'Trasporto metropolitano'),
    ('BUS', 'Autobus', 'Trasporto su gomma')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "ActivityCategory" ("id", "name", "description", "createdAt")
VALUES (1, 'Cultura', 'Musei, monumenti e siti storici', now())
ON CONFLICT ("id") DO NOTHING;

-- Nota: Assicurati che Location con ID 1 esista prima di procedere.
INSERT INTO "Location" ("id", "name", "province", "cap", "latitude", "longitude")
VALUES (1, 'Rimini', 'RN', '47921', 44.0594, 12.5683)
ON CONFLICT ("id") DO NOTHING;

-- 2. Utente e Profili
INSERT INTO "User" ("id", "email", "passwordHash", "authProvider", "createdAt", "updatedAt")
VALUES (1, 'mario.rossi@example.com', '$2b$10$examplehash', 'local', now(), now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "UserProfile" ("userId", "name", "surname", "city", "street", "createdAt", "updatedAt")
VALUES (1, 'Mario', 'Rossi', 'Rimini', 'Corso d''Augusto 10', now(), now())
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "UserPreference" ("id", "userId", "budgetLevelCode", "travelStyle", "createdAt", "updatedAt")
VALUES (1, 1, 'MEDIUM', 'RELAXED', now(), now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "UserPreferenceInterest" ("preferenceId", "activityCategoryId", "weight")
VALUES (1, 1, 5)
ON CONFLICT ("preferenceId", "activityCategoryId") DO NOTHING;

INSERT INTO "GuestSession" ("sessionToken", "expiresAt", "createdAt")
VALUES ('guest_token_xyz_123', NOW() + INTERVAL '7 days', now())
ON CONFLICT ("sessionToken") DO NOTHING;

-- 3. Trasporti e Stazioni
INSERT INTO "Transport" ("id", "transportCode", "transportType")
VALUES (1, 'FR-9500', 'TRAIN')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Station" ("id", "name", "latitude", "longitude", "locationId")
VALUES (1, 'Rimini Centrale', 44.0645, 12.5742, 1)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Airport" ("id", "name", "iataCode", "icaoCode", "latitude", "longitude", "locationId")
VALUES (1, 'Federico Fellini', 'RMI', 'LIPR', 44.0203, 12.6111, 1)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "MetroStation" ("id", "name", "line", "latitude", "longitude", "locationId")
VALUES (1, 'Porta Pascolo', 'Metromare', 44.0612, 12.5765, 1)
ON CONFLICT ("id") DO NOTHING;

-- 4. Alloggi e Attività
INSERT INTO "Accommodation" ("id", "name", "street", "stars", "latitude", "longitude", "locationId")
VALUES (1, 'Grand Hotel Rimini', 'Parco Federico Fellini', 5, 44.0733, 12.5794, 1)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Activity" ("id", "name", "description", "street", "latitude", "longitude", "locationId", "categoryId", "createdAt")
VALUES (1, 'Arco d''Augusto', 'Il più antico arco romano superstite nel Nord Italia.', 'Via d''Augusto', 44.0581, 12.5714, 1, 1, now())
ON CONFLICT ("id") DO NOTHING;

-- 5. Itinerario e Segmenti di Rotta
INSERT INTO "Itinerary" ("id", "name", "description", "isPublished", "visibilityCode", "userId", "startDate", "endDate", "createdAt", "updatedAt")
VALUES (1, 'Weekend Romagnolo', 'Un breve viaggio alla scoperta di Rimini e dei suoi monumenti.', false, 'PRIVATE', 1, '2026-06-01', '2026-06-03', now(), now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RouteSegment" ("id", "transportId", "departureAt", "arrivalAt", "departureStationId", "arrivalStationId")
VALUES (1, 1, '2026-06-01 08:30:00+02', '2026-06-01 10:45:00+02', 1, 1)
ON CONFLICT ("id") DO NOTHING;

-- 6. Elementi dell'Itinerario (Uno per tipologia)
INSERT INTO "ItineraryItem" ("itineraryId", "itemTypeCode", "dayNumber", "orderInt", "activityId")
VALUES (1, 'ACTIVITY', 1, 1, 1)
ON CONFLICT ("itineraryId", "dayNumber", "orderInt") DO NOTHING;

INSERT INTO "ItineraryItem" ("itineraryId", "itemTypeCode", "dayNumber", "orderInt", "accommodationId")
VALUES (1, 'ACCOMMODATION', 1, 2, 1)
ON CONFLICT ("itineraryId", "dayNumber", "orderInt") DO NOTHING;

INSERT INTO "ItineraryItem" ("itineraryId", "itemTypeCode", "dayNumber", "orderInt", "routeSegmentId")
VALUES (1, 'TRANSPORT', 2, 1, 1)
ON CONFLICT ("itineraryId", "dayNumber", "orderInt") DO NOTHING;

INSERT INTO "ItineraryFavorite" ("userId", "itineraryId", "createdAt")
VALUES (1, 1, now())
ON CONFLICT ("userId", "itineraryId") DO NOTHING;

COMMIT;


