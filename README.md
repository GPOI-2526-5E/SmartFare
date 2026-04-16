SCHEMA ER : https://lucid.app/lucidchart/df79e3dd-bb8b-41d4-8a37-12219b014141/edit?view_items=WqHJQ-NGyE-L&page=0_0&invitationId=inv_cec24f75-da3b-4

curl -X POST "<http://localhost:3200/api/trains/search>" ^
  -H "Content-Type: application/json" ^
  -d "{\"originStationId\":900917,\"destinationStationId\":900474,\"date\":\"2026-01-09\",\"passengers\":1}"

curl -X POST "http://localhost:3900/api/hotels/search" ^
  -H "Content-Type: application/json" ^
  -d "{\"destination\":\"Rimini\",\"checkin\":\"2026-07-10\",\"checkout\":\"2026-07-13\",\"guests\":2,\"userPreference\":\"voglio spendere poco ma stare vicino al mare\",\"page\":1,\"limit\":10}"
